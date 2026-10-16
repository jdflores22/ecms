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
        ContainerPhotoCategory.Backdoor,
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
        ContainerPhotoCategory.Backdoor => "Back door",
        ContainerPhotoCategory.Front => "Front",
        ContainerPhotoCategory.LeftSideOut => "Left side (out)",
        ContainerPhotoCategory.RightSideOut => "Right side (out)",
        ContainerPhotoCategory.Damage => "Damage",
        ContainerPhotoCategory.Others => "Others (optional)",
        ContainerPhotoCategory.CroEdo => "CRO / eDO",
        ContainerPhotoCategory.CscPlate => "CSC plate",
        _ => category.ToString(),
    };

    /// <summary>Standard container views plus CSC plate — all required before submit.</summary>
    public static readonly ContainerPhotoCategory[] RequiredIdentityPhotos =
        StandardViews.Concat(new[] { ContainerPhotoCategory.CscPlate }).ToArray();

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
        => IsStandardView(category)
           || category == ContainerPhotoCategory.CscPlate
           || category == ContainerPhotoCategory.Others;

    public static bool AllowsMultiple(ContainerPhotoCategory category)
        => category == ContainerPhotoCategory.Damage;

    /// <summary>Sort identity photos: 8 standard views, CSC plate, optional Others, then damage.</summary>
    public static int GetDisplaySortOrder(ContainerPhotoCategory? category)
    {
        if (!category.HasValue) return 999;
        var index = Array.IndexOf(StandardViews, category.Value);
        if (index >= 0) return index;
        return category.Value switch
        {
            ContainerPhotoCategory.CscPlate => 95,
            ContainerPhotoCategory.Others => 100,
            ContainerPhotoCategory.CroEdo => 150,
            ContainerPhotoCategory.Damage => 200,
            _ => 300,
        };
    }
}
