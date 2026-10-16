namespace ECMS.Application.DTOs.Evaluation;

public record EvaluationDto(
    int Id,
    int PreAdviceId,
    string ReferenceNo,
    int EvaluatorId,
    string EvaluatorName,
    int? DepotId,
    string? DepotName,
    int? CompanionDepotId,
    string? CompanionDepotName,
    string? Remarks,
    string Status,
    DateTime EvaluatedAt);

public record ApproveEvaluationRequest(
    int PreAdviceId,
    int DepotId,
    DateOnly? DemurrageValidUntil,
    string? Remarks,
    int? CompanionDepotId = null);

public record RejectEvaluationRequest(int PreAdviceId, string Remarks);

public record ReturnForComplianceRequest(int PreAdviceId, string Remarks);

public record SetCroFreeTimeRequest(DateOnly FreeTimeDate, string? IdentityUnit = null);
