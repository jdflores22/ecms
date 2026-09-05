package com.ecms.trucker.util

import com.ecms.trucker.data.model.PreAdviceDto
import com.ecms.trucker.data.model.ScheduleDto

enum class GuidanceSeverity { Info, Success, Warning, Error }

data class StatusGuidance(
    val severity: GuidanceSeverity,
    val message: String,
)

fun preAdviceStatusGuidance(
    item: PreAdviceDto,
    schedule: ScheduleDto?,
    photosComplete: Boolean,
    uploadedRequired: Int,
    photosTotal: Int,
    missingPhotoLabels: String,
    freeTimeExpired: Boolean,
    demurrageSettled: Boolean,
    linkedDemurrageReference: String?,
    linkedDemurrageAmount: Double?,
    linkedDemurrageStatus: String?,
): StatusGuidance? {
    val isDraft = item.status.equals("Draft", true)
    val isForCompliance = item.status.equals("ForCompliance", true)

    if ((isDraft || isForCompliance) && freeTimeExpired && !demurrageSettled) {
        val message = if (linkedDemurrageReference != null && linkedDemurrageAmount != null && linkedDemurrageStatus != null) {
            "CRO/eDO free time expired on ${item.demurrageValidUntil}. Demurrage billing $linkedDemurrageReference (₱${"%.2f".format(linkedDemurrageAmount)}) is $linkedDemurrageStatus. Settle under Demurrage before submitting."
        } else {
            "CRO/eDO free time expired on ${item.demurrageValidUntil}. Demurrage and detention charges must be settled before you can submit."
        }
        return StatusGuidance(GuidanceSeverity.Error, message)
    }
    if ((isDraft || isForCompliance) && freeTimeExpired && demurrageSettled) {
        return StatusGuidance(GuidanceSeverity.Success, "Demurrage and detention are settled. You can submit this pre-forecast now.")
    }
    if (isDraft && !photosComplete) {
        return StatusGuidance(
            GuidanceSeverity.Warning,
            "Upload all $photosTotal container identity photos before submitting ($uploadedRequired/$photosTotal complete). Missing: $missingPhotoLabels.",
        )
    }
    if (isForCompliance && !photosComplete) {
        return StatusGuidance(
            GuidanceSeverity.Warning,
            "Upload all $photosTotal container identity photos before resubmitting ($uploadedRequired/$photosTotal complete). Missing: $missingPhotoLabels.",
        )
    }

    return when {
        isDraft -> StatusGuidance(
            GuidanceSeverity.Info,
            "This request is still a draft. Add container identity photos for each view, then submit for evaluation.",
        )
        item.status.equals("Submitted", true) -> StatusGuidance(
            GuidanceSeverity.Info,
            "Submitted and waiting for a shipping-line evaluator to review this request.",
        )
        item.status.equals("UnderEvaluation", true) -> StatusGuidance(
            GuidanceSeverity.Warning,
            "A shipping-line evaluator is reviewing this request. You can still cancel while evaluation is in progress.",
        )
        item.status.equals("Approved", true) -> {
            val message = when {
                schedule?.status?.let { isScheduleConfirmed(it) } == true ->
                    "Return schedule is confirmed. Pre-forecast stays Approved in ICS — send data to LOGICTECK to create the return booking there."
                schedule?.status?.let { isScheduleForPayment(it) } == true ->
                    "Return date assigned. Upload payment proof to confirm your return slot."
                else -> "Approved. The depot will assign a return schedule and notify the assigned trucker."
            }
            StatusGuidance(GuidanceSeverity.Success, message)
        }
        item.status.equals("Rejected", true) -> StatusGuidance(
            GuidanceSeverity.Error,
            "This request was rejected. Create a new pre-forecast if you need to resubmit.",
        )
        isForCompliance -> StatusGuidance(
            GuidanceSeverity.Warning,
            item.complianceRemarks?.takeIf { it.isNotBlank() }?.let {
                "Corrections required: $it Update photos or request details, then resubmit for evaluation."
            } ?: "Corrections required by the evaluator. Update photos or request details, then resubmit for evaluation.",
        )
        item.status.equals("Cancelled", true) -> StatusGuidance(
            GuidanceSeverity.Warning,
            "This request was cancelled and cannot be resumed.",
        )
        else -> null
    }
}
