namespace ECMS.Application.Configuration;

public class EmailOptions
{
    public const string SectionName = "Email";

    public bool Enabled { get; set; }

    /// <summary>When true, in-app notifications also send an email copy to the user's profile address.</summary>
    public bool SendInAppNotificationsByEmail { get; set; } = true;

    public string Host { get; set; } = "smtp.hostinger.com";

    public int Port { get; set; } = 465;

    /// <summary>465 = SSL; 587 = typically StartTLS (set UseSsl false and Port 587).</summary>
    public bool UseSsl { get; set; } = true;

    public string UserName { get; set; } = "technical@tnsds.ph";

    public string Password { get; set; } = "";

    public string FromAddress { get; set; } = "technical@tnsds.ph";

    public string FromDisplayName { get; set; } = "ICS";
}
