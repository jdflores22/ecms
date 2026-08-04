using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace ECMS.Infrastructure.Services;

public sealed class CroEdoPdfData
{
    public string? LogoPath { get; init; }
    public string ReferenceNo { get; init; } = string.Empty;
    public string Status { get; init; } = "ISSUED";
    public string ConsigneeNotifyParty { get; init; } = string.Empty;
    public string ShippingLineCarrier { get; init; } = string.Empty;
    public string RegistryNumber { get; init; } = string.Empty;
    public string CustomsOffice { get; init; } = string.Empty;
    public string VesselVoyageNumber { get; init; } = string.Empty;
    public string BlNumber { get; init; } = string.Empty;
    public string BrokerName { get; init; } = string.Empty;
    public string PortInstructions { get; init; } = string.Empty;
    public string EmptyReturnNote { get; init; } = string.Empty;
    public string? AuthorizedByName { get; init; }
    public string? AuthorizedByCompany { get; init; }
    public string? PreparedByName { get; init; }
    public string? IssuedAtDisplay { get; init; }
    public byte[] QrPng { get; init; } = Array.Empty<byte>();
    public IReadOnlyList<CroEdoPdfLine> Lines { get; init; } = Array.Empty<CroEdoPdfLine>();
}

public sealed class CroEdoPdfLine
{
    public int LineNo { get; init; }
    public string ContainerNumber { get; init; } = string.Empty;
    public string Size { get; init; } = string.Empty;
    public string Type { get; init; } = string.Empty;
    public string Seal { get; init; } = string.Empty;
    public string HaulerName { get; init; } = string.Empty;
    public string PlateNo { get; init; } = string.Empty;
    public string LineReferenceNo { get; init; } = string.Empty;
    public string DemurrageValidUntil { get; init; } = string.Empty;
    public string ReturnEmptyTo { get; init; } = string.Empty;
}

/// <summary>
/// Renders CRO/eDO PDF using the same visual system as Booking Confirmation
/// (ICS header, navy bars, section cards, authorized-by block, navy footer).
/// </summary>
public static class CroEdoPdfRenderer
{
    private static readonly string Navy = "#062D5F";
    private static readonly string Navy2 = "#0A3977";
    private static readonly string Blue = "#1684E8";
    private static readonly string LightBlue = "#48A9F5";
    private static readonly string Green = "#12A64A";
    private static readonly string Line = "#CBD2DA";
    private static readonly string SoftLine = "#E0E3E7";

    static CroEdoPdfRenderer()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public static byte[] Render(CroEdoPdfData data)
    {
        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.MarginTop(0);
                page.MarginBottom(0);
                page.MarginHorizontal(0);
                page.DefaultTextStyle(x => x.FontFamily(Fonts.Arial).FontSize(8).FontColor("#101010"));

                page.Header().Element(c => RenderHeader(c, data));

                page.Content().PaddingHorizontal(20).PaddingTop(8).PaddingBottom(6).Column(col =>
                {
                    col.Spacing(7);
                    col.Item().Element(c => RenderInfoBar(c, data));
                    col.Item().Element(c => RenderReleaseInfo(c, data));
                    col.Item().Element(c => RenderContainers(c, data));
                    col.Item().Element(c => RenderTermsAndAuth(c, data));
                });

                page.Footer().Element(RenderFooter);
            });
        }).GeneratePdf();
    }

    private static void RenderHeader(IContainer container, CroEdoPdfData data)
    {
        container
            .BorderBottom(1)
            .BorderColor(Line)
            .Background(Colors.White)
            .PaddingHorizontal(20)
            .PaddingVertical(10)
            .Row(row =>
            {
                row.RelativeItem().AlignMiddle().Row(brand =>
                {
                    if (!string.IsNullOrWhiteSpace(data.LogoPath) && File.Exists(data.LogoPath))
                    {
                        brand.ConstantItem(92).Height(34).AlignMiddle()
                            .Image(data.LogoPath).FitArea();
                    }
                    else
                    {
                        brand.ConstantItem(48).AlignMiddle().Text("ICS")
                            .FontSize(22).Bold().FontColor(Navy);
                    }

                    brand.ConstantItem(10);
                    brand.RelativeItem().AlignMiddle().Column(text =>
                    {
                        text.Item().Text("INTELLIGENT CONTAINER SOLUTION")
                            .FontSize(8).Bold().FontColor(Navy);
                        text.Item().PaddingTop(1).Text("SMART SOLUTIONS. SEAMLESS OPERATIONS.")
                            .FontSize(7).FontColor(Blue);
                    });
                });

                row.ConstantItem(12);

                row.ConstantItem(230).AlignMiddle().AlignRight().Column(right =>
                {
                    right.Item().AlignRight().Text("CRO / eDO")
                        .FontSize(12).Bold().FontColor(Navy);
                    right.Item().PaddingTop(2).AlignRight().Text("CONTAINER RELEASE ORDER")
                        .FontSize(7).FontColor("#445");
                    right.Item().PaddingTop(4).AlignRight().Element(badge =>
                    {
                        badge.Background(Green)
                            .PaddingHorizontal(10)
                            .PaddingVertical(4)
                            .Text(Blank(data.Status).ToUpperInvariant())
                            .FontSize(9).Bold().FontColor(Colors.White);
                    });
                });
            });
    }

    private static void RenderInfoBar(IContainer container, CroEdoPdfData data)
    {
        container.Background(Navy).PaddingVertical(7).PaddingHorizontal(8).Row(row =>
        {
            InfoBarCell(row, "CRO Reference", data.ReferenceNo);
            InfoBarCell(row, "BL Number", data.BlNumber);
            InfoBarCell(row, "Issued", CompactSingleLine(data.IssuedAtDisplay));
            InfoBarCell(row, "Status", Blank(data.Status).ToUpperInvariant(), isLast: true);
        });
    }

    private static void InfoBarCell(RowDescriptor row, string label, string value, bool isLast = false)
    {
        row.RelativeItem()
            .BorderRight(isLast ? 0 : 0.5f)
            .BorderColor("#FFFFFF40")
            .PaddingHorizontal(6)
            .Column(text =>
            {
                text.Item().Text(label).FontSize(6.5f).FontColor("#E7EDF7");
                text.Item().PaddingTop(2).Text(Blank(value))
                    .FontSize(7.5f)
                    .Bold()
                    .FontColor(Colors.White);
            });
    }

    private static void RenderReleaseInfo(IContainer container, CroEdoPdfData data)
    {
        container.Element(c => InfoSection(c, "RELEASE INFORMATION", new[]
        {
            ("Consignee / Notify Party", data.ConsigneeNotifyParty),
            ("Shipping Line / Carrier", data.ShippingLineCarrier),
            ("Registry Number", data.RegistryNumber),
            ("Customs Office", data.CustomsOffice),
            ("Vessel / Voyage", data.VesselVoyageNumber),
            ("BL Number", data.BlNumber),
            ("Name of Broker", data.BrokerName),
        }));
    }

    private static void RenderContainers(IContainer container, CroEdoPdfData data)
    {
        container.Border(0.7f).BorderColor(Line).Column(section =>
        {
            SectionTitle(section, "CONTAINER DETAILS & EMPTY RETURN (eDO)");

            section.Item().Padding(6).Table(table =>
            {
                table.ColumnsDefinition(c =>
                {
                    c.ConstantColumn(22);
                    c.RelativeColumn(1.35f);
                    c.ConstantColumn(28);
                    c.ConstantColumn(34);
                    c.RelativeColumn(0.7f);
                    c.RelativeColumn(1.2f);
                    c.ConstantColumn(52);
                    c.ConstantColumn(62);
                    c.RelativeColumn(1.4f);
                });

                static IContainer Head(IContainer cell) =>
                    cell.Background("#F3F6FA").BorderBottom(0.5f).BorderColor(SoftLine)
                        .PaddingVertical(3).PaddingHorizontal(2).AlignMiddle();

                static IContainer Body(IContainer cell) =>
                    cell.BorderBottom(0.4f).BorderColor(SoftLine)
                        .PaddingVertical(3).PaddingHorizontal(2).AlignMiddle();

                string[] headers =
                {
                    "No.", "Container", "Size", "Type", "Seal", "Hauler",
                    "Plate", "Free time", "Return Empty To",
                };
                foreach (var h in headers)
                    table.Cell().Element(Head).Text(h).FontSize(6).Bold().FontColor("#445");

                foreach (var line in data.Lines)
                {
                    table.Cell().Element(Body).Text(line.LineNo.ToString()).FontSize(6.5f);
                    table.Cell().Element(Body).Text(Blank(line.ContainerNumber)).FontSize(6.5f).Bold().FontColor(Navy);
                    table.Cell().Element(Body).Text(Blank(line.Size)).FontSize(6.5f);
                    table.Cell().Element(Body).Text(Blank(line.Type)).FontSize(6.5f);
                    table.Cell().Element(Body).Text(Blank(line.Seal)).FontSize(6.5f);
                    table.Cell().Element(Body).Text(Blank(line.HaulerName)).FontSize(6.5f);
                    table.Cell().Element(Body).Text(Blank(line.PlateNo)).FontSize(6.5f);
                    table.Cell().Element(Body).Text(Blank(line.DemurrageValidUntil)).FontSize(6.5f).Bold().FontColor(Green);
                    table.Cell().Element(Body).Text(Blank(line.ReturnEmptyTo)).FontSize(6.5f);
                }
            });
        });
    }

    private static void RenderTermsAndAuth(IContainer container, CroEdoPdfData data)
    {
        container.Column(col =>
        {
            col.Spacing(7);

            col.Item().Border(0.7f).BorderColor(Line).Row(row =>
            {
                row.RelativeItem(0.66f).BorderRight(0.7f).BorderColor(Line).Column(left =>
                {
                    SectionTitle(left, "SCAN FOR DOCUMENT VERIFICATION");
                    left.Item().Padding(10).AlignCenter().Column(qrCol =>
                    {
                        if (data.QrPng.Length > 0)
                        {
                            qrCol.Item().AlignCenter().Width(120).Height(120)
                                .Border(0.7f).BorderColor("#777777")
                                .Padding(5)
                                .Image(data.QrPng).FitArea();
                        }

                        qrCol.Item().PaddingTop(6).AlignCenter()
                            .Text("Scan to verify this CRO/eDO was issued by ICS.")
                            .FontSize(7)
                            .AlignCenter();
                    });
                });

                row.RelativeItem(0.34f).Padding(8).Column(auth =>
                {
                    auth.Item().Text("Authorized by:").FontSize(7);
                    auth.Item().PaddingTop(8).AlignCenter().Text(Blank(data.AuthorizedByName))
                        .FontSize(12).Italic().FontColor(Navy);
                    auth.Item().PaddingTop(2).LineHorizontal(0.5f).LineColor("#333333");
                    auth.Item().PaddingTop(4).Text("SHIPPING LINE EVALUATOR").FontSize(7.5f).Bold();
                    auth.Item().Text(Blank(data.AuthorizedByCompany)).FontSize(6.5f);
                    auth.Item().PaddingTop(8).Text($"Prepared by: {Blank(data.PreparedByName)}").FontSize(6.5f);
                    auth.Item().Text($"Date/Time: {Blank(data.IssuedAtDisplay)}").FontSize(6.5f);
                });
            });

            col.Item().PaddingTop(2).Column(notes =>
            {
                notes.Item().Text("PORT INSTRUCTIONS & NOTES").FontSize(8).Bold().FontColor(Navy);
                notes.Item().PaddingTop(4).Text(t =>
                {
                    t.Span("To: PORT OPERATORS  ").FontSize(6.5f).Bold();
                    t.Span(Blank(data.PortInstructions)).FontSize(6.5f);
                });
                notes.Item().PaddingTop(4).Text(t =>
                {
                    t.Span("Note: ").FontSize(6.5f).Bold();
                    t.Span(Blank(data.EmptyReturnNote)).FontSize(6.5f);
                });
                notes.Item().PaddingTop(6).Column(list =>
                {
                    Term(list, "1. Present this CRO/eDO upon release at the port / terminal.");
                    Term(list, "2. Free demurrage time is valid until 2400H of the stated date.");
                    Term(list, "3. Empty containers must be returned to the indicated CY / destination.");
                    Term(list, "4. This document is subject to terminal and shipping-line operating policies.");
                });
            });
        });
    }

    private static void InfoSection(
        IContainer container,
        string title,
        (string Label, string Value)[] rows)
    {
        container.Border(0.7f).BorderColor(Line).Column(section =>
        {
            SectionTitle(section, title);
            section.Item().PaddingHorizontal(8).PaddingVertical(4).Column(table =>
            {
                for (var i = 0; i < rows.Length; i++)
                {
                    var (label, value) = rows[i];
                    var isLast = i == rows.Length - 1;
                    table.Item()
                        .BorderBottom(isLast ? 0 : 0.4f)
                        .BorderColor(SoftLine)
                        .PaddingVertical(2.5f)
                        .Row(r =>
                        {
                            r.RelativeItem(0.38f).Text(label).FontSize(7).Bold();
                            r.RelativeItem(0.62f).Text($":  {Blank(value)}").FontSize(7);
                        });
                }
            });
        });
    }

    private static void SectionTitle(ColumnDescriptor section, string title)
    {
        section.Item().Background(Navy2).PaddingHorizontal(8).PaddingVertical(5)
            .Text(title).FontSize(8).Bold().FontColor(Colors.White);
    }

    private static void Term(ColumnDescriptor col, string text)
        => col.Item().PaddingBottom(1).Text(text).FontSize(6.5f).LineHeight(1.25f);

    private static void RenderFooter(IContainer container)
    {
        container
            .Background(Navy)
            .PaddingHorizontal(16)
            .PaddingVertical(8)
            .Row(row =>
            {
                row.RelativeItem(0.42f).AlignMiddle().Column(c =>
                {
                    c.Item().Text("ICS Logistics Hub").FontSize(7).Bold().FontColor(Colors.White);
                    c.Item().Text("1234 Container Rd., Port Area, Manila 1018")
                        .FontSize(6.5f).FontColor("#D7E3F4");
                });

                row.RelativeItem(0.30f).AlignMiddle().Column(c =>
                {
                    c.Item().Text("(02) 8123 4567  ·  info@ics.com.ph")
                        .FontSize(6.5f).FontColor("#D7E3F4");
                    c.Item().Text("www.ics.com.ph")
                        .FontSize(6.5f).FontColor("#D7E3F4");
                });

                row.RelativeItem(0.28f).AlignMiddle().AlignRight().Column(c =>
                {
                    c.Item().AlignRight().Text("INTELLIGENCE THAT")
                        .FontSize(7.5f).Bold().Italic().FontColor(Colors.White);
                    c.Item().AlignRight().Text("MOVES EVERY CONTAINER.")
                        .FontSize(7.5f).Bold().Italic().FontColor(LightBlue);
                });
            });
    }

    private static string CompactSingleLine(string? value)
        => Blank(value).Replace("\r\n", " ").Replace('\n', ' ').Replace("  ", " ").Trim();

    private static string Blank(string? value)
        => string.IsNullOrWhiteSpace(value) ? "—" : value.Trim();
}
