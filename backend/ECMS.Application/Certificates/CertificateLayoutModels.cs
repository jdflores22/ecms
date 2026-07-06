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
[JsonDerivedType(typeof(CertificateSubtitleElement), "subtitle")]
[JsonDerivedType(typeof(CertificateTextElement), "text")]
[JsonDerivedType(typeof(CertificateFieldElement), "field")]
[JsonDerivedType(typeof(CertificateValueElement), "value")]
[JsonDerivedType(typeof(CertificateColumnsElement), "columns")]
[JsonDerivedType(typeof(CertificateTableElement), "table")]
[JsonDerivedType(typeof(CertificateSpacerElement), "spacer")]
[JsonDerivedType(typeof(CertificateRuleElement), "rule")]
[JsonDerivedType(typeof(CertificateImageElement), "image")]
[JsonDerivedType(typeof(CertificateSignatureElement), "signature")]
[JsonDerivedType(typeof(CertificateFooterElement), "footer")]
[JsonDerivedType(typeof(CertificateStampElement), "stamp")]
[JsonDerivedType(typeof(CertificateQrCodeElement), "qrcode")]
[JsonDerivedType(typeof(CertificateRowElement), "row")]
[JsonDerivedType(typeof(CertificateTripleRowElement), "tripleRow")]
public abstract class CertificateLayoutElement
{
    public string Type { get; set; } = string.Empty;

    public float MarginTopMm { get; set; }
    public float MarginRightMm { get; set; }
    public float MarginBottomMm { get; set; }
    public float MarginLeftMm { get; set; }
    public float PaddingTopMm { get; set; }
    public float PaddingRightMm { get; set; }
    public float PaddingBottomMm { get; set; }
    public float PaddingLeftMm { get; set; }

    /// <summary>Line height multiplier for text elements. 0 = renderer default.</summary>
    public float LineHeight { get; set; }

    /// <summary>Hex color for text elements. Empty = default.</summary>
    public string? TextColor { get; set; }

    /// <summary>Label column width in mm for field/columns elements. 0 = default.</summary>
    public float LabelWidthMm { get; set; }

    /// <summary>Table cell padding in mm. 0 = default.</summary>
    public float CellPaddingMm { get; set; }
}

public class CertificateTitleElement : CertificateLayoutElement
{
    public string Text { get; set; } = string.Empty;
    public string Align { get; set; } = "left";
    public float FontSize { get; set; } = 18;
    public bool Bold { get; set; } = true;
}

public class CertificateSubtitleElement : CertificateLayoutElement
{
    public string Text { get; set; } = string.Empty;
    public string Align { get; set; } = "left";
    public float FontSize { get; set; } = 14;
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

public class CertificateValueElement : CertificateLayoutElement
{
    public string Binding { get; set; } = string.Empty;
    public string Align { get; set; } = "left";
    public float FontSize { get; set; } = 11;
    public bool Bold { get; set; } = true;
}

public class CertificateColumnsElement : CertificateLayoutElement
{
    public string LeftLabel { get; set; } = string.Empty;
    public string LeftBinding { get; set; } = string.Empty;
    public string RightLabel { get; set; } = string.Empty;
    public string RightBinding { get; set; } = string.Empty;
    public float FontSize { get; set; } = 11;
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
    public bool ShowTitle { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Subtitle { get; set; } = string.Empty;
    public float TitleFontSize { get; set; } = 10;
    public float SubtitleFontSize { get; set; } = 8;
}

public class CertificateSignatureElement : CertificateLayoutElement
{
    public string Caption { get; set; } = "Authorized by";
    public string NameBinding { get; set; } = string.Empty;
    public string TitleText { get; set; } = string.Empty;
    public bool ShowLine { get; set; } = true;
    public string Align { get; set; } = "left";
    public float FontSize { get; set; } = 10;
    public bool ShowDigitalSeal { get; set; } = true;
    public string DigitalSealColor { get; set; } = "#0B3D91";
}

public class CertificateFooterElement : CertificateLayoutElement
{
    public string Text { get; set; } = "Generated by ICS · ";
    public string Binding { get; set; } = "GeneratedAt";
    public string Align { get; set; } = "center";
    public float FontSize { get; set; } = 8;
}

public class CertificateStampElement : CertificateLayoutElement
{
    public string Text { get; set; } = "RELEASED";
    public string Align { get; set; } = "center";
    public float FontSize { get; set; } = 22;
    public string Color { get; set; } = "#C62828";
}

public class CertificateQrCodeElement : CertificateLayoutElement
{
    public string Align { get; set; } = "right";
    public float WidthMm { get; set; } = 28;
    public string Caption { get; set; } = "Scan to verify";
    public bool ShowCaption { get; set; } = true;
    public float CaptionFontSize { get; set; } = 8;
}

public class CertificateRowSlot
{
    public string Kind { get; set; } = "empty";
    public string Align { get; set; } = "center";
    public string Src { get; set; } = string.Empty;
    public float WidthMm { get; set; } = 40;
    public float? HeightMm { get; set; }
    public string? Alt { get; set; }
    public bool ShowImageTitle { get; set; }
    public string ImageTitle { get; set; } = string.Empty;
    public string ImageSubtitle { get; set; } = string.Empty;
    public float ImageTitleFontSize { get; set; } = 10;
    public float ImageSubtitleFontSize { get; set; } = 8;
    public float QrWidthMm { get; set; } = 28;
    public string QrCaption { get; set; } = "Scan to verify";
    public bool ShowQrCaption { get; set; } = true;
    public float QrCaptionFontSize { get; set; } = 8;
    public string Caption { get; set; } = "Authorized by";
    public string NameBinding { get; set; } = string.Empty;
    public string TitleText { get; set; } = string.Empty;
    public bool ShowLine { get; set; } = true;
    public float FontSize { get; set; } = 10;
    public string StampText { get; set; } = "RELEASED";
    public string StampColor { get; set; } = "#C62828";
    public float StampFontSize { get; set; } = 22;
    public bool ShowDigitalSeal { get; set; } = true;
    public string DigitalSealColor { get; set; } = "#0B3D91";
}

public class CertificateRowElement : CertificateLayoutElement
{
    public CertificateRowSlot Left { get; set; } = new();
    public CertificateRowSlot Right { get; set; } = new();
    public float GapMm { get; set; } = 4;
}

public class CertificateTripleRowElement : CertificateLayoutElement
{
    public CertificateRowSlot Left { get; set; } = new();
    public CertificateRowSlot Center { get; set; } = new();
    public CertificateRowSlot Right { get; set; } = new();
    public float GapMm { get; set; } = 4;
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
    public string? GeneratedAt { get; set; }
    public string? IssuedByName { get; set; }
    public string? VerificationUrl { get; set; }
    public List<AtwContainerLineMergeData> ContainerLines { get; set; } = new();
}

public class AtwContainerLineMergeData
{
    public string ContainerNo { get; set; } = string.Empty;
    public string Size { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
}
