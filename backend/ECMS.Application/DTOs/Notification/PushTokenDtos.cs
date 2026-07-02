namespace ECMS.Application.DTOs.Notification;

public record RegisterPushTokenRequest(string Token, string Platform = "android", string? DeviceName = null);

public record UnregisterPushTokenRequest(string Token);
