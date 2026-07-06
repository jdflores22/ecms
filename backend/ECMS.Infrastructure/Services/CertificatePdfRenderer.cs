using ECMS.Application.Certificates;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace ECMS.Infrastructure.Services;

public static class CertificatePdfRenderer
{
    private const float DefaultLabelWidthMm = 42;
    private const float DefaultColumnLabelWidthMm = 28;
    private const float DefaultCellPaddingMm = 1.4f;
    private const float DefaultLineHeight = 1.35f;

    static CertificatePdfRenderer()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public static byte[] RenderAtw(
        CertificateLayoutDefinition layout,
        AtwCertificateMergeData data,
        string? contentRootPath = null)
    {
        var margin = layout.Page.MarginMm;

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(margin, Unit.Millimetre);
                page.DefaultTextStyle(x => x.FontSize(11));

                page.Content().Column(column =>
                {
                    foreach (var element in layout.Elements)
                        RenderElement(column, element, data, contentRootPath);
                });
            });
        }).GeneratePdf();
    }

    private static void RenderElement(
        ColumnDescriptor column,
        CertificateLayoutElement element,
        AtwCertificateMergeData data,
        string? contentRootPath)
    {
        switch (element)
        {
            case CertificateTitleElement title:
            {
                var block = ApplyAlign(BeginItem(column, title), title.Align);
                var text = block.Text(title.Text).FontSize(title.FontSize);
                if (title.Bold) text.Bold();
                ApplyTextStyle(text, title);
                break;
            }

            case CertificateSubtitleElement subtitle:
            {
                var block = ApplyAlign(BeginItem(column, subtitle), subtitle.Align);
                var text = block.Text(subtitle.Text).FontSize(subtitle.FontSize);
                if (subtitle.Bold) text.Bold();
                ApplyTextStyle(text, subtitle);
                break;
            }

            case CertificateTextElement textEl:
            {
                var block = ApplyAlign(BeginItem(column, textEl), textEl.Align);
                var text = block.Text(textEl.Text).FontSize(textEl.FontSize);
                if (textEl.Bold) text.Bold();
                ApplyTextStyle(text, textEl);
                break;
            }

            case CertificateFieldElement field:
            {
                var value = ResolveField(field.Binding, data);
                var labelWidth = field.LabelWidthMm > 0 ? field.LabelWidthMm : DefaultLabelWidthMm;
                BeginItem(column, field).Row(row =>
                {
                    row.ConstantItem(labelWidth, Unit.Millimetre).Text($"{field.Label}:").FontSize(field.FontSize).SemiBold();
                    var valueText = row.RelativeItem().Text(value).FontSize(field.FontSize);
                    if (field.Bold) valueText.Bold();
                    ApplyTextStyle(valueText, field);
                });
                break;
            }

            case CertificateValueElement valueEl:
            {
                var block = ApplyAlign(BeginItem(column, valueEl), valueEl.Align);
                var text = block.Text(ResolveField(valueEl.Binding, data)).FontSize(valueEl.FontSize);
                if (valueEl.Bold) text.Bold();
                ApplyTextStyle(text, valueEl);
                break;
            }

            case CertificateColumnsElement columns:
            {
                var labelWidth = columns.LabelWidthMm > 0 ? columns.LabelWidthMm : DefaultColumnLabelWidthMm;
                BeginItem(column, columns).Row(row =>
                {
                    row.RelativeItem().Row(inner =>
                    {
                        inner.ConstantItem(labelWidth, Unit.Millimetre).Text($"{columns.LeftLabel}:").FontSize(columns.FontSize).SemiBold();
                        inner.RelativeItem().Text(ResolveField(columns.LeftBinding, data)).FontSize(columns.FontSize);
                    });
                    row.RelativeItem().Row(inner =>
                    {
                        inner.ConstantItem(labelWidth, Unit.Millimetre).Text($"{columns.RightLabel}:").FontSize(columns.FontSize).SemiBold();
                        inner.RelativeItem().Text(ResolveField(columns.RightBinding, data)).FontSize(columns.FontSize);
                    });
                });
                break;
            }

            case CertificateTableElement table:
            {
                var cellPadding = table.CellPaddingMm > 0 ? table.CellPaddingMm : DefaultCellPaddingMm;
                BeginItem(column, table).Table(t =>
                {
                    t.ColumnsDefinition(cols =>
                    {
                        foreach (var _ in table.Columns)
                            cols.RelativeColumn();
                    });

                    t.Header(header =>
                    {
                        foreach (var col in table.Columns)
                        {
                            header.Cell().Background(Colors.Grey.Lighten3).Padding(cellPadding, Unit.Millimetre)
                                .Text(FormatColumnHeader(col)).FontSize(table.FontSize).SemiBold();
                        }
                    });

                    foreach (var line in data.ContainerLines)
                    {
                        foreach (var col in table.Columns)
                        {
                            t.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(cellPadding, Unit.Millimetre)
                                .Text(ResolveLineColumn(col, line)).FontSize(table.FontSize);
                        }
                    }
                });
                break;
            }

            case CertificateSpacerElement spacer:
                BeginItem(column, spacer).Height(spacer.HeightMm, Unit.Millimetre);
                break;

            case CertificateRuleElement rule:
                BeginItem(column, rule).LineHorizontal(rule.ThicknessPt).LineColor(Colors.Grey.Medium);
                break;

            case CertificateImageElement image:
            {
                var physicalPath = CertificateAssetPathResolver.ResolveUploadPhysicalPath(contentRootPath, image.Src);
                if (physicalPath is null || !File.Exists(physicalPath))
                    break;

                BeginItem(column, image).Element(c =>
                    RenderImageBlock(
                        c,
                        image.Align,
                        physicalPath,
                        image.WidthMm,
                        image.HeightMm,
                        image.ShowTitle,
                        image.Title,
                        image.Subtitle,
                        image.TitleFontSize,
                        image.SubtitleFontSize));
                break;
            }

            case CertificateSignatureElement signature:
            {
                BeginItem(column, signature).Element(c =>
                    RenderSignatureBlock(
                        c,
                        signature.Align,
                        signature.Caption,
                        signature.NameBinding,
                        signature.TitleText,
                        signature.ShowLine,
                        signature.FontSize,
                        signature.ShowDigitalSeal,
                        signature.DigitalSealColor,
                        data));
                break;
            }

            case CertificateFooterElement footer:
            {
                var suffix = string.IsNullOrWhiteSpace(footer.Binding)
                    ? string.Empty
                    : ResolveField(footer.Binding, data);
                var block = ApplyAlign(BeginItem(column, footer), footer.Align);
                var text = block.Text($"{footer.Text}{suffix}").FontSize(footer.FontSize).FontColor(Colors.Grey.Medium);
                ApplyTextStyle(text, footer);
                break;
            }

            case CertificateStampElement stamp:
            {
                BeginItem(column, stamp).Element(c =>
                    RenderStampBlock(c, stamp.Align, stamp.Text, stamp.Color, stamp.FontSize));
                break;
            }

            case CertificateQrCodeElement qr:
            {
                if (string.IsNullOrWhiteSpace(data.VerificationUrl))
                    break;

                BeginItem(column, qr).Element(c =>
                    RenderQrCodeBlock(c, qr.Align, qr.WidthMm, qr.ShowCaption, qr.Caption, qr.CaptionFontSize, data.VerificationUrl));
                break;
            }

            case CertificateRowElement row:
                BeginItem(column, row).Row(r =>
                {
                    r.RelativeItem().AlignTop().PaddingRight(row.GapMm / 2f, Unit.Millimetre)
                        .Element(c => RenderRowSlot(c, row.Left, data, contentRootPath));
                    r.RelativeItem().AlignTop().PaddingLeft(row.GapMm / 2f, Unit.Millimetre)
                        .Element(c => RenderRowSlot(c, row.Right, data, contentRootPath));
                });
                break;

            case CertificateTripleRowElement tripleRow:
                BeginItem(column, tripleRow).Row(r =>
                {
                    r.RelativeItem().AlignTop().PaddingRight(tripleRow.GapMm / 2f, Unit.Millimetre)
                        .Element(c => RenderRowSlot(c, tripleRow.Left, data, contentRootPath));
                    r.RelativeItem().AlignTop().PaddingHorizontal(tripleRow.GapMm / 2f, Unit.Millimetre)
                        .Element(c => RenderRowSlot(c, tripleRow.Center, data, contentRootPath));
                    r.RelativeItem().AlignTop().PaddingLeft(tripleRow.GapMm / 2f, Unit.Millimetre)
                        .Element(c => RenderRowSlot(c, tripleRow.Right, data, contentRootPath));
                });
                break;
        }
    }

    private static void RenderRowSlot(
        IContainer container,
        CertificateRowSlot slot,
        AtwCertificateMergeData data,
        string? contentRootPath)
    {
        switch (slot.Kind.ToLowerInvariant())
        {
            case "image":
            {
                var physicalPath = CertificateAssetPathResolver.ResolveUploadPhysicalPath(contentRootPath, slot.Src);
                if (physicalPath is null || !File.Exists(physicalPath))
                    break;

                RenderImageBlock(
                    container,
                    slot.Align,
                    physicalPath,
                    slot.WidthMm,
                    slot.HeightMm,
                    slot.ShowImageTitle,
                    slot.ImageTitle,
                    slot.ImageSubtitle,
                    slot.ImageTitleFontSize,
                    slot.ImageSubtitleFontSize);
                break;
            }

            case "qrcode":
                if (string.IsNullOrWhiteSpace(data.VerificationUrl))
                    break;
                RenderQrCodeBlock(
                    container,
                    slot.Align,
                    slot.QrWidthMm,
                    slot.ShowQrCaption,
                    slot.QrCaption,
                    slot.QrCaptionFontSize,
                    data.VerificationUrl);
                break;

            case "signature":
                RenderSignatureBlock(
                    container,
                    slot.Align,
                    slot.Caption,
                    slot.NameBinding,
                    slot.TitleText,
                    slot.ShowLine,
                    slot.FontSize,
                    slot.ShowDigitalSeal,
                    slot.DigitalSealColor,
                    data);
                break;

            case "stamp":
                RenderStampBlock(
                    container,
                    slot.Align,
                    slot.StampText,
                    slot.StampColor,
                    slot.StampFontSize);
                break;
        }
    }

    private static void RenderStampBlock(
        IContainer container,
        string align,
        string text,
        string color,
        float fontSize)
    {
        var stampColor = NormalizeHexColor(color);
        var size = fontSize > 0 ? fontSize : 22;
        container.AlignTop().Element(stamp =>
            ApplyAlign(stamp, align)
                .Border(1.5f).BorderColor(stampColor)
                .PaddingVertical(6).PaddingHorizontal(12)
                .Text(text).FontSize(size).Bold().FontColor(stampColor));
    }

    private static void RenderImageBlock(
        IContainer container,
        string align,
        string physicalPath,
        float widthMm,
        float? heightMm,
        bool showTitle,
        string title,
        string subtitle,
        float titleFontSize,
        float subtitleFontSize)
    {
        var block = ApplyAlign(container, align);
        block.Column(col =>
        {
            var imageSlot = col.Item();
            if (widthMm > 0)
                imageSlot = imageSlot.Width(widthMm, Unit.Millimetre);
            if (heightMm is > 0)
                imageSlot = imageSlot.Height(heightMm.Value, Unit.Millimetre);
            imageSlot.Image(physicalPath);

            if (showTitle && !string.IsNullOrWhiteSpace(title))
            {
                col.Item().PaddingTop(2).Text(title)
                    .FontSize(titleFontSize > 0 ? titleFontSize : 10)
                    .SemiBold();
            }

            if (!string.IsNullOrWhiteSpace(subtitle))
            {
                col.Item().Text(subtitle)
                    .FontSize(subtitleFontSize > 0 ? subtitleFontSize : 8)
                    .FontColor(Colors.Grey.Darken1);
            }
        });
    }

    private static void RenderQrCodeBlock(
        IContainer container,
        string align,
        float widthMm,
        bool showCaption,
        string caption,
        float captionFontSize,
        string verificationUrl)
    {
        var qrBytes = CertificateQrImageGenerator.GeneratePng(verificationUrl);
        var block = ApplyAlign(container, align);
        block.Column(col =>
        {
            if (showCaption && !string.IsNullOrWhiteSpace(caption))
            {
                col.Item().Text(caption)
                    .FontSize(captionFontSize > 0 ? captionFontSize : 8)
                    .FontColor(Colors.Grey.Darken1);
            }

            var imageSlot = col.Item();
            if (widthMm > 0)
                imageSlot = imageSlot.Width(widthMm, Unit.Millimetre);
            imageSlot.Image(qrBytes);
        });
    }

    private static void RenderDigitalSeal(IContainer container, string color)
    {
        var sealColor = NormalizeHexColor(color);
        container.AlignTop().Element(seal =>
            seal.Border(1.25f).BorderColor(sealColor)
                .PaddingVertical(4).PaddingHorizontal(10)
                .Column(col =>
                {
                    col.Item().AlignCenter().Text("ICS")
                        .FontSize(7).Bold().FontColor(sealColor).LetterSpacing(0.8f);
                    col.Item().PaddingTop(1).AlignCenter().Text("SYSTEM ISSUED")
                        .FontSize(8).Bold().FontColor(sealColor);
                    col.Item().PaddingTop(1).AlignCenter().Text("Intelligent Container Solutions")
                        .FontSize(5.5f).FontColor(Colors.Grey.Darken1);
                }));
    }

    private static void RenderSignatureBlock(
        IContainer container,
        string align,
        string caption,
        string nameBinding,
        string titleText,
        bool showLine,
        float fontSize,
        bool showDigitalSeal,
        string digitalSealColor,
        AtwCertificateMergeData data)
    {
        var block = ApplyAlign(container.AlignTop(), align);
        block.Column(sigCol =>
        {
            if (showDigitalSeal)
            {
                sigCol.Item().PaddingBottom(4).Element(c => RenderDigitalSeal(c, digitalSealColor));
            }

            if (!string.IsNullOrWhiteSpace(caption))
                sigCol.Item().Text(caption).FontSize(fontSize).Italic();

            var name = string.IsNullOrWhiteSpace(nameBinding)
                ? string.Empty
                : ResolveField(nameBinding, data);

            if (showLine)
                sigCol.Item().PaddingTop(12).Width(120).LineHorizontal(0.75f).LineColor(Colors.Grey.Darken1);

            sigCol.Item().PaddingTop(2).Text(string.IsNullOrWhiteSpace(name) ? " " : name)
                .FontSize(fontSize).SemiBold();

            if (!string.IsNullOrWhiteSpace(titleText))
                sigCol.Item().Text(titleText).FontSize(fontSize - 1);
        });
    }

    private static IContainer BeginItem(ColumnDescriptor column, CertificateLayoutElement element)
        => ApplyBoxSpacing(column.Item(), element);

    private static IContainer ApplyBoxSpacing(IContainer container, CertificateLayoutElement element)
    {
        var top = element.MarginTopMm + element.PaddingTopMm;
        var bottom = element.MarginBottomMm + element.PaddingBottomMm;
        var left = element.MarginLeftMm + element.PaddingLeftMm;
        var right = element.MarginRightMm + element.PaddingRightMm;

        if (top > 0) container = container.PaddingTop(top, Unit.Millimetre);
        if (bottom > 0) container = container.PaddingBottom(bottom, Unit.Millimetre);
        if (left > 0) container = container.PaddingLeft(left, Unit.Millimetre);
        if (right > 0) container = container.PaddingRight(right, Unit.Millimetre);

        return container;
    }

    private static void ApplyTextStyle(TextBlockDescriptor text, CertificateLayoutElement element)
    {
        if (element.LineHeight > 0)
            text.LineHeight(element.LineHeight);
        else
            text.LineHeight(DefaultLineHeight);

        if (!string.IsNullOrWhiteSpace(element.TextColor))
            text.FontColor(NormalizeHexColor(element.TextColor));
    }

    private static string ResolveField(string binding, AtwCertificateMergeData data)
    {
        return binding switch
        {
            "AtwNumber" => data.AtwNumber,
            "ReferenceNo" => data.ReferenceNo,
            "ShippingLineName" => data.ShippingLineName,
            "TruckerName" => data.TruckerName,
            "CurrentDepotName" => data.CurrentDepotName,
            "Destination" => data.Destination,
            "IssueDate" => data.IssueDate,
            "ExpirationDate" => data.ExpirationDate,
            "Remarks" => string.IsNullOrWhiteSpace(data.Remarks) ? "—" : data.Remarks!,
            "ReleasedDate" => data.ReleasedDate ?? "—",
            "ReleasedAt" => data.ReleasedAt ?? "—",
            "ReleasedByDepotName" => data.ReleasedByDepotName ?? "—",
            "ContainerNo" => data.ContainerNo ?? "—",
            "ContainerSize" => data.ContainerSize ?? "—",
            "ContainerType" => data.ContainerType ?? "—",
            "GeneratedAt" => data.GeneratedAt ?? "—",
            "IssuedByName" => data.IssuedByName ?? "—",
            _ => string.Empty,
        };
    }

    private static string ResolveLineColumn(string column, AtwContainerLineMergeData line)
    {
        return column switch
        {
            "ContainerNo" => line.ContainerNo,
            "Size" => line.Size,
            "Type" => line.Type,
            _ => string.Empty,
        };
    }

    private static string FormatColumnHeader(string column)
    {
        return column switch
        {
            "ContainerNo" => "Container",
            "Size" => "Size",
            "Type" => "Type",
            _ => column,
        };
    }

    private static IContainer ApplyAlign(IContainer container, string align)
    {
        return align.ToLowerInvariant() switch
        {
            "center" => container.AlignCenter(),
            "right" => container.AlignRight(),
            _ => container.AlignLeft(),
        };
    }

    private static string NormalizeHexColor(string color)
    {
        if (string.IsNullOrWhiteSpace(color))
            return Colors.Red.Medium;

        var trimmed = color.Trim();
        return trimmed.StartsWith('#') ? trimmed : $"#{trimmed}";
    }
}
