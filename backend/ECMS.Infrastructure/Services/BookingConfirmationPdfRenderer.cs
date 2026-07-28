using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace ECMS.Infrastructure.Services;

/// <summary>
/// Renders the ICS booking confirmation PDF on a single A4 page.
/// Header (logo) and footer are fixed; body is compacted to avoid page overflow.
/// </summary>
public static class BookingConfirmationPdfRenderer
{
    private static readonly string Navy = "#062D5F";
    private static readonly string Navy2 = "#0A3977";
    private static readonly string Blue = "#1684E8";
    private static readonly string LightBlue = "#48A9F5";
    private static readonly string Green = "#12A64A";
    private static readonly string Line = "#CBD2DA";
    private static readonly string SoftLine = "#E0E3E7";

    static BookingConfirmationPdfRenderer()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public static byte[] Render(BookingConfirmationPdfData data)
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
                    col.Item().Element(c => RenderBookingBar(c, data));
                    col.Item().Element(c => RenderMain(c, data));
                    col.Item().Element(c => RenderTerms(c, data));
                });

                page.Footer().Element(RenderFooter);
            });
        }).GeneratePdf();
    }

    private static void RenderHeader(IContainer container, BookingConfirmationPdfData data)
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

                row.ConstantItem(210).AlignMiddle().AlignRight().Column(right =>
                {
                    right.Item().AlignRight().Text("BOOKING CONFIRMATION")
                        .FontSize(12).Bold().FontColor(Navy);
                    right.Item().PaddingTop(4).AlignRight().Element(badge =>
                    {
                        badge.Background(Green)
                            .PaddingHorizontal(10)
                            .PaddingVertical(4)
                            .Row(r =>
                            {
                                r.ConstantItem(14).Height(14).Background(Colors.White).AlignCenter().AlignMiddle()
                                    .Text("✓").FontSize(8).Bold().FontColor(Green);
                                r.ConstantItem(6);
                                r.AutoItem().AlignMiddle().Text(data.Status.ToUpperInvariant())
                                    .FontSize(9).Bold().FontColor(Colors.White);
                            });
                    });
                });
            });
    }

    private static void RenderBookingBar(IContainer container, BookingConfirmationPdfData data)
    {
        container.Background(Navy).PaddingVertical(7).PaddingHorizontal(8).Row(row =>
        {
            BookingBarCell(row, "Booking Date", CompactSingleLine(data.BookingDateDisplay), null);
            BookingBarCell(row, "Booking Reference", data.BookingReference, null);
            BookingBarCell(row, "Status", data.Status.ToUpperInvariant(), null);
            BookingBarCell(row, "Valid Until", CompactSingleLine(data.ValidUntilDisplay), null, isLast: true);
        });
    }

    private static void BookingBarCell(
        RowDescriptor row,
        string label,
        string value,
        string? valueColor,
        bool isLast = false)
    {
        row.RelativeItem()
            .BorderRight(isLast ? 0 : 0.5f)
            .BorderColor("#FFFFFF40")
            .PaddingHorizontal(6)
            .Column(text =>
            {
                text.Item().Text(label).FontSize(6.5f).FontColor("#E7EDF7");
                text.Item().PaddingTop(2).Text(value)
                    .FontSize(7.5f)
                    .Bold()
                    .FontColor(valueColor ?? Colors.White);
            });
    }

    private static void RenderMain(IContainer container, BookingConfirmationPdfData data)
    {
        container.Row(row =>
        {
            row.RelativeItem(0.56f).Column(left =>
            {
                left.Spacing(7);
                left.Item().Element(c => InfoSection(c, "CUSTOMER INFORMATION", new[]
                {
                    ("Customer Name", data.CustomerName),
                    ("Contact Person", data.ContactPerson),
                    ("Contact No.", data.ContactNo),
                    ("Email", data.Email),
                    ("Company", data.Company),
                }));

                left.Item().Element(c => InfoSection(c, "SHIPMENT INFORMATION", new[]
                {
                    ("Booking Type", data.BookingType),
                    ("Container No.", data.ContainerNo),
                    ("Type / Size", data.ContainerTypeSize),
                    ("Cargo Type", data.CargoType),
                    ("Shipping Line", data.ShippingLine),
                    ("POL", data.Pol),
                    ("POD", data.Pod),
                }));

                left.Item().Element(c => InfoSection(c, "TRANSPORT INFORMATION", new[]
                {
                    ("Depot / Terminal", data.DepotName),
                    ("Truck Plate No.", data.TruckPlate),
                    ("Driver Name", data.DriverName),
                    ("Contact No.", data.DriverContact),
                    ("Scheduled Date", data.ScheduledDateTime),
                    ("Service Type", data.ServiceType),
                    ("Remarks", data.Remarks),
                }));
            });

            row.ConstantItem(10);

            row.RelativeItem(0.44f).Column(right =>
            {
                right.Spacing(7);

                right.Item().Border(0.7f).BorderColor(Line).Column(section =>
                {
                    SectionTitle(section, "SCAN FOR BOOKING VERIFICATION");
                    section.Item().Padding(10).AlignCenter().Column(qrCol =>
                    {
                        qrCol.Item().AlignCenter().Width(132).Height(132)
                            .Border(0.7f).BorderColor("#777777")
                            .Padding(5)
                            .Image(data.QrPng).FitArea();

                        qrCol.Item().PaddingTop(6).AlignCenter()
                            .Text("Scan to verify booking details and status.")
                            .FontSize(7)
                            .AlignCenter();
                    });
                });

                right.Item().Border(0.7f).BorderColor(Line).Column(section =>
                {
                    SectionTitle(section, "BOOKING SUMMARY");
                    section.Item().Padding(10).Column(sum =>
                    {
                        SummaryRow(sum, "Booking Ref. No.", data.BookingReference, null);
                        SummaryRow(sum, "Container No.", data.ContainerNo, null);
                        SummaryRow(sum, "Scheduled Date", data.ScheduledDateTime, null);
                        SummaryRow(sum, "Status", data.Status.ToUpperInvariant(), Green, isLast: true);
                    });
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

    private static void SummaryRow(
        ColumnDescriptor col,
        string label,
        string value,
        string? valueColor,
        bool isLast = false)
    {
        col.Item().Text(label).FontSize(7);
        col.Item().PaddingBottom(isLast ? 0 : 6).Text(Blank(value))
            .FontSize(8.5f)
            .Bold()
            .FontColor(valueColor ?? "#111111");
    }

    private static void RenderTerms(IContainer container, BookingConfirmationPdfData data)
    {
        container.Border(0.7f).BorderColor(Line).Row(row =>
        {
            row.RelativeItem(0.66f).BorderRight(0.7f).BorderColor(Line).Padding(8).Column(left =>
            {
                left.Item().Text("TERMS & CONDITIONS").FontSize(8).Bold().FontColor(Navy);
                left.Item().PaddingTop(3).Column(list =>
                {
                    Term(list, "1. Present this booking confirmation upon arrival at the depot or terminal.");
                    Term(list, "2. The QR code is valid only for the scheduled booking.");
                    Term(list, "3. Any changes to the booking require prior approval from ICS.");
                    Term(list, "4. This confirmation is subject to terminal/depot operating policies.");
                });
            });

            row.RelativeItem(0.34f).Padding(8).Column(auth =>
            {
                auth.Item().Text("Authorized by:").FontSize(7);
                auth.Item().PaddingTop(8).AlignCenter().Text(Blank(data.AuthorizedByName))
                    .FontSize(12).Italic().FontColor(Navy);
                auth.Item().PaddingTop(2).LineHorizontal(0.5f).LineColor("#333333");
                auth.Item().PaddingTop(4).Text(Blank(data.AuthorizedByRole)).FontSize(7.5f).Bold();
                auth.Item().Text(Blank(data.AuthorizedByOrg)).FontSize(6.5f);
            });
        });
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

    private static string CompactSingleLine(string value)
        => Blank(value).Replace("\r\n", " ").Replace('\n', ' ').Replace("  ", " ").Trim();

    private static string Blank(string? value)
        => string.IsNullOrWhiteSpace(value) ? "—" : value.Trim();
}

public sealed class BookingConfirmationPdfData
{
    public string BookingReference { get; init; } = "";
    public string BookingDateDisplay { get; init; } = "";
    public string ValidUntilDisplay { get; init; } = "";
    public string Status { get; init; } = "CONFIRMED";
    public string CustomerName { get; init; } = "";
    public string ContactPerson { get; init; } = "";
    public string ContactNo { get; init; } = "—";
    public string Email { get; init; } = "";
    public string Company { get; init; } = "";
    public string BookingType { get; init; } = "EMPTY RETURN";
    public string ContainerNo { get; init; } = "";
    public string ContainerTypeSize { get; init; } = "";
    public string CargoType { get; init; } = "EMPTY CONTAINER";
    public string ShippingLine { get; init; } = "";
    public string Pol { get; init; } = "—";
    public string Pod { get; init; } = "";
    public string DepotName { get; init; } = "";
    public string TruckPlate { get; init; } = "—";
    public string DriverName { get; init; } = "";
    public string DriverContact { get; init; } = "—";
    public string ScheduledDateTime { get; init; } = "";
    public string ServiceType { get; init; } = "EMPTY RETURN";
    public string Remarks { get; init; } = "—";
    public string AuthorizedByName { get; init; } = "ICS Ops";
    public string AuthorizedByRole { get; init; } = "SHIPPING LINE EVALUATOR";
    public string AuthorizedByOrg { get; init; } = "Intelligent Container Solution (ICS)";
    public byte[] QrPng { get; init; } = Array.Empty<byte>();
    public string? LogoPath { get; init; }
}
