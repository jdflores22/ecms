using ECMS.Application.Configuration;
using ECMS.Application.DTOs.Logicteck;
using ECMS.Application.Interfaces;
using Microsoft.Extensions.Options;

namespace ECMS.Infrastructure.Services;

public class LogicteckEmptyReturnService : ILogicteckEmptyReturnService
{
    private const long MaxFileBytes = 5 * 1024 * 1024;

    private static readonly HashSet<string> RequiredDamageViews = new(StringComparer.OrdinalIgnoreCase)
    {
        "Back", "Front", "LeftSideOut", "RightSideOut", "LeftSideIn", "RightSideIn", "Flooring", "Backdoor",
    };

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".png", ".jpg", ".jpeg", ".webp",
    };

    private readonly LogicteckOutboundClient _logicteckClient;
    private readonly LogicteckOptions _options;
    private readonly IAuditService _auditService;

    public LogicteckEmptyReturnService(
        LogicteckOutboundClient logicteckClient,
        IOptions<LogicteckOptions> options,
        IAuditService auditService)
    {
        _logicteckClient = logicteckClient;
        _options = options.Value;
        _auditService = auditService;
    }

    public async Task<LogicteckEmptyReturnSubmitResponse> SubmitAsync(
        LogicteckEmptyReturnSubmitRequest request,
        IReadOnlyList<LogicteckEmptyReturnFileAttachment> files,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var validationError = Validate(request, files);
        if (validationError is not null)
            return Fail(validationError);

        var plateNumber = ResolvePlateNumber(request);
        var fileMap = files.ToDictionary(x => x.Field, StringComparer.OrdinalIgnoreCase);

        if (!fileMap.TryGetValue("preAdviseAttachment", out var preAdviseFile))
            return Fail("Pre-advise attachment (DO / EDO / CRO) is required.");

        if (!fileMap.TryGetValue("driversLicensePhoto", out var licensePhoto))
            return Fail("Driver's license photo is required.");

        var damagePhotos = new List<LogicteckEmptyReturnDamagePhotoPayload>();
        foreach (var view in request.DamageViews)
        {
            var field = $"photo_{view.View}";
            if (!fileMap.TryGetValue(field, out var photoFile))
            {
                if (IsRequiredView(view.View) && IsSubmit(request.SubmitMode))
                    return Fail($"Photo for {view.View} is required.");
                continue;
            }

            damagePhotos.Add(new LogicteckEmptyReturnDamagePhotoPayload(
                view.View,
                view.IsDamaged,
                photoFile.FileName,
                photoFile.ContentType,
                photoFile.SizeBytes,
                photoFile.Base64Content));
        }

        if (IsSubmit(request.SubmitMode))
        {
            foreach (var required in RequiredDamageViews)
            {
                if (damagePhotos.All(p => !string.Equals(p.View, required, StringComparison.OrdinalIgnoreCase)))
                    return Fail($"Photo for {required} is required.");
            }
        }

        var payload = new LogicteckEmptyReturnTransmissionPayload(
            "ICS",
            request.SubmitMode,
            request.DriverName.Trim(),
            request.LicenseNumber.Trim(),
            request.PlateNumberDifferent,
            plateNumber,
            request.ShippingLine.Trim(),
            string.IsNullOrWhiteSpace(request.BlNumber) ? null : request.BlNumber.Trim(),
            request.ContainerSize.Trim(),
            request.ContainerType.Trim(),
            request.ContainerNumber.Trim().ToUpperInvariant(),
            request.ReturnDate.Trim(),
            request.ReturnTime.Trim(),
            string.IsNullOrWhiteSpace(request.DamageDescription) ? null : request.DamageDescription.Trim(),
            string.IsNullOrWhiteSpace(request.IcsBookingReference) ? null : request.IcsBookingReference.Trim(),
            request.DamageViews,
            ToMeta(preAdviseFile),
            ToMeta(licensePhoto),
            damagePhotos);

        var targetUrl = !string.IsNullOrWhiteSpace(_options.EmptyReturnUrl)
            ? _options.EmptyReturnUrl
            : _options.BookUrl;

        var (success, externalRef, error) = await _logicteckClient.SubmitEmptyReturnAsync(payload, cancellationToken);
        if (!success)
            return Fail(error ?? "LOGICTECK transmission failed.", payload, targetUrl, false);

        var action = string.Equals(request.SubmitMode, "draft", StringComparison.OrdinalIgnoreCase)
            ? "LOGICTECK_EMPTY_RETURN_DRAFT"
            : "LOGICTECK_EMPTY_RETURN_SUBMIT";

        await _auditService.LogAsync(
            userId,
            action,
            "LOGICTECK",
            $"Empty return {payload.ContainerNumber} · {payload.ShippingLine} · mode={payload.SubmitMode}",
            cancellationToken);

        var preview = BuildPreview(payload, preAdviseFile.FileName, licensePhoto.FileName, damagePhotos);
        var transmitted = !string.IsNullOrWhiteSpace(targetUrl);
        var message = transmitted
            ? (string.Equals(request.SubmitMode, "draft", StringComparison.OrdinalIgnoreCase)
                ? "Draft saved and transmitted to LOGICTECK."
                : "Empty return submitted to LOGICTECK for validation.")
            : (string.Equals(request.SubmitMode, "draft", StringComparison.OrdinalIgnoreCase)
                ? "Draft payload ready — configure Logicteck:EmptyReturnUrl to transmit."
                : "Submission payload ready — configure Logicteck:EmptyReturnUrl to transmit.");

        return new LogicteckEmptyReturnSubmitResponse(
            true,
            message,
            externalRef,
            transmitted,
            string.IsNullOrWhiteSpace(targetUrl) ? null : targetUrl,
            preview);
    }

    private static string? Validate(LogicteckEmptyReturnSubmitRequest request, IReadOnlyList<LogicteckEmptyReturnFileAttachment> files)
    {
        if (string.IsNullOrWhiteSpace(request.DriverName)) return "Driver name is required.";
        if (string.IsNullOrWhiteSpace(request.LicenseNumber)) return "License number is required.";
        if (string.IsNullOrWhiteSpace(request.ShippingLine)) return "Shipping line is required.";
        if (string.IsNullOrWhiteSpace(request.ContainerSize)) return "Container size is required.";
        if (string.IsNullOrWhiteSpace(request.ContainerType)) return "Container type is required.";
        if (string.IsNullOrWhiteSpace(request.ContainerNumber)) return "Container number is required.";
        if (string.IsNullOrWhiteSpace(request.ReturnDate)) return "Return date is required.";
        if (string.IsNullOrWhiteSpace(request.ReturnTime)) return "Return time is required.";

        if (!request.PlateNumberDifferent && string.IsNullOrWhiteSpace(ResolvePlateNumber(request)))
            return "Plate number is required.";

        foreach (var file in files)
        {
            if (file.SizeBytes > MaxFileBytes)
                return $"{file.Field} exceeds the 5 MB limit.";

            var ext = Path.GetExtension(file.FileName);
            if (!AllowedExtensions.Contains(ext))
                return $"{file.Field} must be PDF, PNG, JPG, or WEBP.";
        }

        return null;
    }

    private static string? ResolvePlateNumber(LogicteckEmptyReturnSubmitRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.PlateNumber))
            return request.PlateNumber.Trim().ToUpperInvariant();

        return null;
    }

    private static bool IsSubmit(string submitMode) =>
        !string.Equals(submitMode, "draft", StringComparison.OrdinalIgnoreCase);

    private static bool IsRequiredView(string view) =>
        RequiredDamageViews.Contains(view);

    private static LogicteckEmptyReturnAttachmentMeta ToMeta(LogicteckEmptyReturnFileAttachment file) =>
        new(file.FileName, file.ContentType, file.SizeBytes, file.Base64Content);

    private static LogicteckEmptyReturnPayloadPreview BuildPreview(
        LogicteckEmptyReturnTransmissionPayload payload,
        string preAdviseName,
        string licenseName,
        IReadOnlyList<LogicteckEmptyReturnDamagePhotoPayload> damagePhotos) =>
        new(
            payload.SubmitMode,
            payload.DriverName,
            payload.LicenseNumber,
            payload.PlateNumber ?? "",
            payload.ShippingLine,
            payload.BlNumber,
            payload.ContainerSize,
            payload.ContainerType,
            payload.ContainerNumber,
            payload.ReturnDate,
            payload.ReturnTime,
            payload.DamageDescription,
            payload.IcsBookingReference,
            payload.DamageViews,
            preAdviseName,
            licenseName,
            damagePhotos.Select(p => new LogicteckEmptyReturnPhotoPreview(p.View, p.IsDamaged, p.FileName, p.SizeBytes)).ToList());

    private static LogicteckEmptyReturnSubmitResponse Fail(string message) =>
        new(false, message, null, false, null, null);

    private static LogicteckEmptyReturnSubmitResponse Fail(
        string message,
        LogicteckEmptyReturnTransmissionPayload payload,
        string? targetUrl,
        bool transmitted) =>
        new(false, message, null, transmitted, targetUrl, BuildPreview(payload, payload.PreAdviseAttachment!.FileName, payload.DriversLicensePhoto!.FileName, payload.DamagePhotos));
}
