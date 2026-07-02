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
        ContainerPhotoCategory.Others => "Others (optional)",
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

    public static bool IsIdentityGridSlot(ContainerPhotoCategory category)
        => IsStandardView(category) || category == ContainerPhotoCategory.Others;

    public static bool AllowsMultiple(ContainerPhotoCategory category)
        => category == ContainerPhotoCategory.Damage;

    /// <summary>Sort identity photos: 7 standard views, optional Others, then damage.</summary>
    public static int GetDisplaySortOrder(ContainerPhotoCategory? category)
    {
        if (!category.HasValue) return 999;
        var index = Array.IndexOf(StandardViews, category.Value);
        if (index >= 0) return index;
        return category.Value switch
        {
            ContainerPhotoCategory.Others => 100,
            ContainerPhotoCategory.Damage => 200,
            _ => 300,
        };
    }
}
