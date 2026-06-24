using ECMS.Application.DTOs.Evaluation;

namespace ECMS.Application.Interfaces;

public interface IEvaluationService
{
    Task<IReadOnlyList<EvaluationDto>> GetAllAsync(int userId, string role, CancellationToken cancellationToken = default);
    Task<EvaluationDto> ApproveAsync(ApproveEvaluationRequest request, int evaluatorId, CancellationToken cancellationToken = default);
    Task<EvaluationDto> RejectAsync(RejectEvaluationRequest request, int evaluatorId, CancellationToken cancellationToken = default);
}
