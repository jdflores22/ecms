namespace ECMS.Domain.Entities;

/// <summary>Singleton system row (Id = 1) for portal module toggles.</summary>
public class PortalSettings
{
    public int Id { get; set; } = 1;

    /// <summary>When true, truckers can attach ICS CRO/eDO via QR on new pre-forecast.</summary>
    public bool IcsCroEdoQrEnabled { get; set; } = true;

    public bool SoaEnabled { get; set; } = true;

    public bool WithdrawalsEnabled { get; set; } = true;

    public DateTime UpdatedAt { get; set; }
}
