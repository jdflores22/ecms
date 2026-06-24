namespace ECMS.Application.DTOs.Evaluation;

public record EvaluationDto(
    int Id,
    int PreAdviceId,
    string ReferenceNo,
    int EvaluatorId,
    string EvaluatorName,
    int? DepotId,
    string? DepotName,
    string? Remarks,
    string Status,
    DateTime EvaluatedAt);

public record ApproveEvaluationRequest(int PreAdviceId, int DepotId, string? Remarks);

public record RejectEvaluationRequest(int PreAdviceId, string Remarks);
