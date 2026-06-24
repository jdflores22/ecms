using ECMS.Domain.Enums;

namespace ECMS.Application;

public static class ContainerPhotoCatalog
{
    public static readonly ContainerPhotoCategory[] StandardViews =
    {
        ContainerPhotoCategory.Flooring,
        ContainerPhotoCategory.RightSideIn,
        ContainerPhotoCategory.LeftSideIn,
        ContainerPhotoCategory.Back,
        ContainerPhotoCategory.Front,
        ContainerPhotoCategory.LeftSideOut,
        ContainerPhotoCategory.RightSideOut,
    };

    public static string GetLabel(ContainerPhotoCategory category) => category switch
    {
        ContainerPhotoCategory.Flooring => "Flooring",
        ContainerPhotoCategory.RightSideIn => "Right side (in)",
        ContainerPhotoCategory.LeftSideIn => "Left side (in)",
        ContainerPhotoCategory.Back => "Back",
        ContainerPhotoCategory.Front => "Front",
        ContainerPhotoCategory.LeftSideOut => "Left side (out)",
        ContainerPhotoCategory.RightSideOut => "Right side (out)",
        ContainerPhotoCategory.Damage => "Damage",
        _ => category.ToString(),
    };

    public static bool TryParse(string? value, out ContainerPhotoCategory category)
    {
        if (!string.IsNullOrWhiteSpace(value) && Enum.TryParse(value, true, out category))
            return true;

        category = default;
        return false;
    }

    public static bool IsStandardView(ContainerPhotoCategory category)
        => StandardViews.Contains(category);
}
