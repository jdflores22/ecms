namespace ECMS.Infrastructure.Options;

public class PayMongoOptions
{
    public const string SectionName = "PayMongo";

    public string SecretKey { get; set; } = string.Empty;
    public string PublicKey { get; set; } = string.Empty;
    public string WebhookSecret { get; set; } = string.Empty;
}
