using ECMS.Application.DTOs.Logicteck;

namespace ECMS.Application.Interfaces;

public interface ILogicteckEmptyReturnService
{
    Task<LogicteckEmptyReturnSubmitResponse> SubmitAsync(
        LogicteckEmptyReturnSubmitRequest request,
        IReadOnlyList<LogicteckEmptyReturnFileAttachment> files,
        int userId,
        CancellationToken cancellationToken = default);
}
