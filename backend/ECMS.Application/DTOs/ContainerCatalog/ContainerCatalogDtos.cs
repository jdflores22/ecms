namespace ECMS.Application.DTOs.ContainerCatalog;

public record ContainerSizeDto(int Id, string Label, decimal Teu, int SortOrder, bool IsActive);

public record CreateContainerSizeRequest(string Label, decimal Teu, int SortOrder, bool IsActive);

public record UpdateContainerSizeRequest(string Label, decimal Teu, int SortOrder, bool IsActive);

public record ContainerTypeDto(int Id, string Code, string Label, int SortOrder, bool IsActive);

public record CreateContainerTypeRequest(string Code, string Label, int SortOrder, bool IsActive);

public record UpdateContainerTypeRequest(string Code, string Label, int SortOrder, bool IsActive);
