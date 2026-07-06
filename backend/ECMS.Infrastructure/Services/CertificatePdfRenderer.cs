using ECMS.Application.Certificates;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace ECMS.Infrastructure.Services;

public static class CertificatePdfRenderer
{
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
                var block = ApplyAlign(column.Item().PaddingBottom(2), title.Align);
                var text = block.Text(title.Text).FontSize(title.FontSize);
                if (title.Bold) text.Bold();
                break;
            }

            case CertificateTextElement textEl:
            {
                var block = ApplyAlign(column.Item().PaddingBottom(2), textEl.Align);
                var text = block.Text(textEl.Text).FontSize(textEl.FontSize);
                if (textEl.Bold) text.Bold();
                break;
            }

            case CertificateFieldElement field:
            {
                var value = ResolveField(field.Binding, data);
                column.Item().PaddingBottom(2).Row(row =>
                {
                    row.ConstantItem(120).Text($"{field.Label}:").FontSize(field.FontSize).SemiBold();
                    var valueText = row.RelativeItem().Text(value).FontSize(field.FontSize);
                    if (field.Bold) valueText.Bold();
                });
                break;
            }

            case CertificateTableElement table:
                column.Item().PaddingVertical(4).Table(t =>
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
                            header.Cell().Background(Colors.Grey.Lighten3).Padding(4)
                                .Text(FormatColumnHeader(col)).FontSize(table.FontSize).SemiBold();
                        }
                    });

                    foreach (var line in data.ContainerLines)
                    {
                        foreach (var col in table.Columns)
                        {
                            t.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(4)
                                .Text(ResolveLineColumn(col, line)).FontSize(table.FontSize);
                        }
                    }
                });
                break;

            case CertificateSpacerElement spacer:
                column.Item().Height(spacer.HeightMm, Unit.Millimetre);
                break;

            case CertificateRuleElement rule:
                column.Item().PaddingVertical(2).LineHorizontal(rule.ThicknessPt).LineColor(Colors.Grey.Medium);
                break;

            case CertificateImageElement image:
            {
                var physicalPath = CertificateAssetPathResolver.ResolveUploadPhysicalPath(contentRootPath, image.Src);
                if (physicalPath is null || !File.Exists(physicalPath))
                    break;

                var block = ApplyAlign(column.Item().PaddingBottom(4), image.Align);
                var imageSlot = block;
                if (image.WidthMm > 0)
                    imageSlot = imageSlot.Width(image.WidthMm, Unit.Millimetre);
                if (image.HeightMm is > 0)
                    imageSlot = imageSlot.Height(image.HeightMm.Value, Unit.Millimetre);

                imageSlot.Image(physicalPath);
                break;
            }
        }
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
}
