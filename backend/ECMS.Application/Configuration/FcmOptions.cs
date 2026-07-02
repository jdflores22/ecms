namespace ECMS.Application.Configuration;

public class FirebasePushOptions
{
    public const string SectionName = "Firebase";

    /// <summary>Firebase service account JSON (entire file contents).</summary>
    public string? CredentialsJson { get; set; }
}
