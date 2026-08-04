using ECMS.Domain.Common;

namespace ECMS.Domain.Entities;

public class ContainerReleaseOrderLine : BaseEntity
{
    public int ContainerReleaseOrderId { get; set; }
    public int LineNo { get; set; }
    public string ContainerNumber { get; set; } = string.Empty;
    public string Size { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Seal { get; set; } = string.Empty;
    public string HaulerName { get; set; } = string.Empty;
    public string PlateNo { get; set; } = string.Empty;
    public string LineReferenceNo { get; set; } = string.Empty;

    /// <summary>Last day of free demurrage / free time for this container (until 2400H).</summary>
    public DateOnly DemurrageValidUntil { get; set; }

    /// <summary>Depot/CY where the empty must be returned (eDO return destination).</summary>
    public int? ReturnEmptyToDepotId { get; set; }

    /// <summary>Free-text return location when not linked to a master depot (e.g. ESAFE LOGISTICS).</summary>
    public string ReturnEmptyToName { get; set; } = string.Empty;

    public ContainerReleaseOrder ContainerReleaseOrder { get; set; } = null!;
    public Depot? ReturnEmptyToDepot { get; set; }
}
