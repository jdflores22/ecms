using ECMS.Application.Configuration;
using ECMS.Application.Interfaces;
using ECMS.Domain.Common;
using ECMS.Domain.Entities;
using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ECMS.Infrastructure.Services;

public class FcmPushNotificationService : IPushNotificationService
{
    private readonly IEcmsDbContext _db;
    private readonly ILogger<FcmPushNotificationService> _logger;
    private readonly bool _isConfigured;

    public FcmPushNotificationService(
        IEcmsDbContext db,
        IOptions<FirebasePushOptions> options,
        ILogger<FcmPushNotificationService> logger)
    {
        _db = db;
        _logger = logger;
        _isConfigured = TryInitializeFirebase(options.Value.CredentialsJson);
    }

    public bool IsConfigured => _isConfigured;

    public async Task RegisterTokenAsync(
        int userId,
        string token,
        string platform,
        string? deviceName = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(token))
            throw new InvalidOperationException("Push token is required.");

        var normalizedToken = token.Trim();
        var normalizedPlatform = string.IsNullOrWhiteSpace(platform) ? "android" : platform.Trim().ToLowerInvariant();
        var now = PhilippinesTime.UtcNow;

        var existing = await _db.DevicePushTokens
            .FirstOrDefaultAsync(t => t.Token == normalizedToken, cancellationToken);

        if (existing is null)
        {
            _db.Add(new DevicePushToken
            {
                UserId = userId,
                Token = normalizedToken,
                Platform = normalizedPlatform,
                DeviceName = deviceName?.Trim(),
                UpdatedAt = now,
            });
        }
        else
        {
            existing.UserId = userId;
            existing.Platform = normalizedPlatform;
            existing.DeviceName = deviceName?.Trim();
            existing.UpdatedAt = now;
            _db.Update(existing);
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task UnregisterTokenAsync(
        int userId,
        string token,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(token))
            return;

        var normalizedToken = token.Trim();
        var existing = await _db.DevicePushTokens
            .FirstOrDefaultAsync(t => t.Token == normalizedToken && t.UserId == userId, cancellationToken);

        if (existing is null)
            return;

        _db.Remove(existing);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task SendToUsersAsync(
        IEnumerable<int> userIds,
        string title,
        string message,
        string category,
        string? linkPath = null,
        CancellationToken cancellationToken = default)
    {
        if (!_isConfigured)
            return;

        var recipientIds = userIds.Where(id => id > 0).Distinct().ToList();
        if (recipientIds.Count == 0)
            return;

        var tokens = await _db.DevicePushTokens
            .AsNoTracking()
            .Where(t => recipientIds.Contains(t.UserId))
            .Select(t => t.Token)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (tokens.Count == 0)
            return;

        var data = new Dictionary<string, string>
        {
            ["category"] = category,
            ["title"] = title,
            ["message"] = message,
        };
        if (!string.IsNullOrWhiteSpace(linkPath))
            data["linkPath"] = linkPath!;

        foreach (var batch in tokens.Chunk(500))
        {
            try
            {
                var multicast = new MulticastMessage
                {
                    Tokens = batch.ToList(),
                    Notification = new FirebaseAdmin.Messaging.Notification
                    {
                        Title = title,
                        Body = message,
                    },
                    Data = data,
                    Android = new AndroidConfig
                    {
                        Priority = Priority.High,
                        Notification = new AndroidNotification
                        {
                            ChannelId = "ecms_notifications",
                            Sound = "default",
                        },
                    },
                };

                var response = await FirebaseMessaging.DefaultInstance
                    .SendEachForMulticastAsync(multicast, cancellationToken);

                if (response.FailureCount > 0)
                    await RemoveInvalidTokensAsync(batch, response, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "FCM push batch failed for category {Category}", category);
            }
        }
    }

    private async Task RemoveInvalidTokensAsync(
        IReadOnlyList<string> batch,
        BatchResponse response,
        CancellationToken cancellationToken)
    {
        var staleTokens = new List<string>();
        for (var i = 0; i < response.Responses.Count; i++)
        {
            var sendResponse = response.Responses[i];
            if (sendResponse.IsSuccess)
                continue;

            var errorCode = sendResponse.Exception?.MessagingErrorCode;
            if (errorCode is MessagingErrorCode.Unregistered or MessagingErrorCode.InvalidArgument)
                staleTokens.Add(batch[i]);
        }

        if (staleTokens.Count == 0)
            return;

        var rows = await _db.DevicePushTokens
            .Where(t => staleTokens.Contains(t.Token))
            .ToListAsync(cancellationToken);

        foreach (var row in rows)
            _db.Remove(row);

        await _db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Removed {Count} stale FCM tokens", rows.Count);
    }

    private static bool TryInitializeFirebase(string? credentialsJson)
    {
        if (string.IsNullOrWhiteSpace(credentialsJson))
            return false;

        try
        {
            if (FirebaseApp.DefaultInstance is null)
            {
                FirebaseApp.Create(new AppOptions
                {
                    Credential = GoogleCredential.FromJson(credentialsJson),
                });
            }

            return true;
        }
        catch
        {
            return false;
        }
    }
}
