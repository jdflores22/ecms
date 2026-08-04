using ECMS.Domain.Common;
using ECMS.Domain.Enums;

namespace ECMS.Domain.Entities;

/// <summary>
/// Container Release Order / electronic Delivery Order (CRO/eDO) issued by a shipping line.
/// Authorizes release of import containers to consignee/broker/hauler and records free demurrage
/// time plus where empties must be returned.
/// </summary>
public class ContainerReleaseOrder : BaseEntity
{
    public string ReferenceNo { get; set; } = string.Empty;
    public int ShippingLineId { get; set; }
    public ContainerReleaseOrderStatus Status { get; set; } = ContainerReleaseOrderStatus.Draft;

    public string ConsigneeNotifyParty { get; set; } = string.Empty;
    public string ShippingLineCarrier { get; set; } = string.Empty;
    public string RegistryNumber { get; set; } = string.Empty;
    public string CustomsOffice { get; set; } = string.Empty;
    public string VesselVoyageNumber { get; set; } = string.Empty;
    public string BlNumber { get; set; } = string.Empty;
    public string BrokerName { get; set; } = string.Empty;

    public string PortInstructions { get; set; } =
        "Please release the above cargo container to the Consignee/Broker/Hauler. The above indicated Free Demurrage time is valid until 2400H.";

    public string EmptyReturnNote { get; set; } =
        "For empty container return to MICT/ATI, kindly send a PRE-FORECAST Notice. Delivered containers without pre-forecast confirmation are subject to shut out fee.";

    public string? AuthorizedByName { get; set; }
    public string? AuthorizedByCompany { get; set; }
    public string? PreparedByName { get; set; }
    public string? Remarks { get; set; }

    public DateTime? IssuedAt { get; set; }
    public int? IssuedByUserId { get; set; }
    public string? PdfPath { get; set; }

    /// <summary>SHA-256(pepper + plain token). Plain token is only embedded in the PDF QR URL.</summary>
    public string? VerificationTokenHash { get; set; }
    public int VerificationCount { get; set; }
    public DateTime? LastVerifiedAt { get; set; }

    public ShippingLine ShippingLine { get; set; } = null!;
    public User? IssuedBy { get; set; }
    public ICollection<ContainerReleaseOrderLine> Lines { get; set; } = new List<ContainerReleaseOrderLine>();
}
