namespace ECMS.Application.DTOs.Depot;

public record DepotDto(int Id, string Name, string Address, int Capacity, bool IsActive);

public record CreateDepotRequest(string Name, string Address, int Capacity);

public record UpdateDepotRequest(string Name, string Address, int Capacity, bool IsActive);
