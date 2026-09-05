package com.ecms.trucker.util

import com.ecms.trucker.ui.components.ProgressStep
import com.ecms.trucker.ui.components.ProgressStepState

fun buildPaymentProgressSteps(
    paymentStatus: String,
    hasProof: Boolean,
    uploadNeeded: Boolean,
): List<ProgressStep> = when {
    paymentStatus.equals("Paid", true) -> listOf(
        ProgressStep("Upload proof", "Submitted", ProgressStepState.Complete),
        ProgressStep("Depot review", "Verified", ProgressStepState.Complete),
        ProgressStep("Confirmed", "Payment accepted", ProgressStepState.Complete),
    )
    paymentStatus.equals("ForVerification", true) -> listOf(
        ProgressStep("Upload proof", "Submitted", ProgressStepState.Complete),
        ProgressStep("Depot review", "Awaiting verification", ProgressStepState.Current),
        ProgressStep("Confirmed", "After depot approval", ProgressStepState.Upcoming),
    )
    paymentStatus.equals("Rejected", true) -> listOf(
        ProgressStep("Upload proof", "Re-upload required", ProgressStepState.Current),
        ProgressStep("Depot review", "Pending new proof", ProgressStepState.Upcoming),
        ProgressStep("Confirmed", "After depot approval", ProgressStepState.Upcoming),
    )
    uploadNeeded -> listOf(
        ProgressStep(
            label = "Upload proof",
            detail = if (hasProof) "Ready to submit" else "Upload image or PDF",
            state = ProgressStepState.Current,
        ),
        ProgressStep("Depot review", "After you submit", ProgressStepState.Upcoming),
        ProgressStep("Confirmed", "After depot approval", ProgressStepState.Upcoming),
    )
    else -> listOf(
        ProgressStep("Upload proof", "Not yet required", ProgressStepState.Upcoming),
        ProgressStep("Depot review", "—", ProgressStepState.Upcoming),
        ProgressStep("Confirmed", "—", ProgressStepState.Upcoming),
    )
}
