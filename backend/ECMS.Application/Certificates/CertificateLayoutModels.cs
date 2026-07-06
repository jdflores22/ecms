using System.Text.Json.Serialization;

namespace ECMS.Application.Certificates;

public class CertificateLayoutDefinition
{
    public int Version { get; set; } = 1;
    public CertificatePageSettings Page { get; set; } = new();
    public List<CertificateLayoutElement> Elements { get; set; } = new();
}

public class CertificatePageSettings
{
    public string Size { get; set; } = "A4";
    public float MarginMm { get; set; } = 20;
}

[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(CertificateTitleElement), "title")]
[JsonDerivedType(typeof(CertificateTextElement), "text")]
[JsonDerivedType(typeof(CertificateFieldElement), "field")]
[JsonDerivedType(typeof(CertificateTableElement), "table")]
[JsonDerivedType(typeof(CertificateSpacerElement), "spacer")]
[JsonDerivedType(typeof(CertificateRuleElement), "rule")]
[JsonDerivedType(typeof(CertificateImageElement), "image")]
public abstract class CertificateLayoutElement
{
    public string Type { get; set; } = string.Empty;
}

public class CertificateTitleElement : CertificateLayoutElement
{
    public string Text { get; set; } = string.Empty;
    public string Align { get; set; } = "left";
    public float FontSize { get; set; } = 18;
    public bool Bold { get; set; } = true;
}

public class CertificateTextElement : CertificateLayoutElement
{
    public string Text { get; set; } = string.Empty;
    public string Align { get; set; } = "left";
    public float FontSize { get; set; } = 11;
    public bool Bold { get; set; }
}

public class CertificateFieldElement : CertificateLayoutElement
{
    public string Label { get; set; } = string.Empty;
    public string Binding { get; set; } = string.Empty;
    public float FontSize { get; set; } = 11;
    public bool Bold { get; set; }
}

public class CertificateTableElement : CertificateLayoutElement
{
    public string Binding { get; set; } = "ContainerLines";
    public List<string> Columns { get; set; } = new() { "ContainerNo", "Size", "Type" };
    public float FontSize { get; set; } = 10;
}

public class CertificateSpacerElement : CertificateLayoutElement
{
    public float HeightMm { get; set; } = 4;
}

public class CertificateRuleElement : CertificateLayoutElement
{
    public float ThicknessPt { get; set; } = 1;
}

public class CertificateImageElement : CertificateLayoutElement
{
    public string Src { get; set; } = string.Empty;
    public string Align { get; set; } = "center";
    public float WidthMm { get; set; } = 40;
    public float? HeightMm { get; set; }
    public string? Alt { get; set; }
}

public class AtwCertificateMergeData
{
    public string AtwNumber { get; set; } = string.Empty;
    public string ReferenceNo { get; set; } = string.Empty;
    public string ShippingLineName { get; set; } = string.Empty;
    public string TruckerName { get; set; } = string.Empty;
    public string CurrentDepotName { get; set; } = string.Empty;
    public string Destination { get; set; } = string.Empty;
    public string IssueDate { get; set; } = string.Empty;
    public string ExpirationDate { get; set; } = string.Empty;
    public string? Remarks { get; set; }
    public string? ReleasedDate { get; set; }
    public string? ReleasedAt { get; set; }
    public string? ReleasedByDepotName { get; set; }
    public string? ContainerNo { get; set; }
    public string? ContainerSize { get; set; }
    public string? ContainerType { get; set; }
    public List<AtwContainerLineMergeData> ContainerLines { get; set; } = new();
}

public class AtwContainerLineMergeData
{
    public string ContainerNo { get; set; } = string.Empty;
    public string Size { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
}
