package com.ecms.trucker.util

import com.ecms.trucker.data.model.QrBookingDto
import com.ecms.trucker.data.model.ScheduleDto
import com.ecms.trucker.ui.components.ProgressStep
import com.ecms.trucker.ui.components.ProgressStepState

fun buildReturnJourneySteps(
    schedule: ScheduleDto,
    paymentStatus: String,
    qrBooking: QrBookingDto?,
    qrLoading: Boolean,
): List<ProgressStep> {
    if (schedule.status.equals("NoShow", true)) {
        return listOf(
            ProgressStep("Return assigned", "Marked as no show at depot", ProgressStepState.Upcoming),
            ProgressStep("Payment", "Not required", ProgressStepState.Upcoming),
            ProgressStep("Booking QR", "Not published", ProgressStepState.Upcoming),
            ProgressStep("LOGICTECK integration", "Not applicable", ProgressStepState.Upcoming),
        )
    }

    val scheduleDone = !schedule.status.equals("WaitingSchedule", true)
    val paymentDone = paymentStatus.equals("Paid", true)
    val paymentCurrent = schedule.status.equals("Scheduled", true) &&
        (paymentStatus.equals("Pending", true) ||
            paymentStatus.equals("ForVerification", true) ||
            paymentStatus.equals("Rejected", true))
    val qrReady = qrBooking != null
    val qrCurrent = (schedule.status.equals("Confirmed", true) || schedule.status.equals("Completed", true)) &&
        paymentDone && !qrReady
    val integrationDone = schedule.status.equals("Completed", true)
    val integrationCurrent = qrReady && schedule.status.equals("Confirmed", true)

    return listOf(
        ProgressStep(
            label = "Return assigned",
            detail = when {
                scheduleDone && schedule.date.isNotBlank() -> "Slot confirmed by depot"
                scheduleDone -> "Assigned to you"
                else -> "Waiting for depot"
            },
            state = if (scheduleDone) ProgressStepState.Complete else ProgressStepState.Current,
        ),
        ProgressStep(
            label = "Payment",
            detail = when {
                paymentDone -> "Verified by depot"
                paymentStatus.equals("ForVerification", true) -> "Awaiting depot review"
                paymentStatus.equals("Rejected", true) -> "Re-upload required"
                schedule.status.equals("Scheduled", true) -> "Upload proof to continue"
                else -> "Not yet due"
            },
            state = when {
                paymentDone -> ProgressStepState.Complete
                paymentCurrent -> ProgressStepState.Current
                else -> ProgressStepState.Upcoming
            },
        ),
        ProgressStep(
            label = "Booking QR",
            detail = when {
                qrReady -> "QR & confirmation PDF ready"
                qrLoading -> "Publishing…"
                paymentDone && (schedule.status.equals("Confirmed", true) || schedule.status.equals("Completed", true)) ->
                    "Preparing booking QR"
                else -> "After payment approval"
            },
            state = when {
                qrReady -> ProgressStepState.Complete
                qrCurrent -> ProgressStepState.Current
                else -> ProgressStepState.Upcoming
            },
        ),
        ProgressStep(
            label = "LOGICTECK integration",
            detail = when {
                integrationDone -> "Return completed"
                integrationCurrent -> "Send booking to LOGICTECK from QR tab"
                else -> "After booking QR is published"
            },
            state = when {
                integrationDone -> ProgressStepState.Complete
                integrationCurrent -> ProgressStepState.Current
                else -> ProgressStepState.Upcoming
            },
        ),
    )
}
