package com.ecms.trucker.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.outlined.RadioButtonUnchecked
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.ecms.trucker.data.model.PreAdviceDto
import com.ecms.trucker.data.model.QrBookingDto
import com.ecms.trucker.data.model.ScheduleDto
import com.ecms.trucker.ui.theme.IcsColors
import com.ecms.trucker.util.isScheduleConfirmed
import com.ecms.trucker.util.isScheduleForPayment
import com.ecms.trucker.util.scheduleStatusLabel

enum class ProgressStepState { Complete, Current, Upcoming, Error }

data class ProgressStep(
    val label: String,
    val detail: String,
    val state: ProgressStepState,
    val actionLabel: String? = null,
    val onAction: (() -> Unit)? = null,
)

fun buildPreForecastProgressSteps(
    item: PreAdviceDto,
    schedule: ScheduleDto?,
    scheduleLoading: Boolean,
    qr: QrBookingDto?,
    qrLoading: Boolean,
    onManagePhotos: () -> Unit,
    onOpenSchedule: () -> Unit,
    onViewQr: () -> Unit,
): List<ProgressStep> {
    val isDraft = item.status.equals("Draft", true)
    val isPending = item.status.equals("Submitted", true) ||
        item.status.equals("UnderEvaluation", true) ||
        item.status.equals("ForCompliance", true)
    val isApproved = item.status.equals("Approved", true)
    val isRejected = item.status.equals("Rejected", true)
    val isForCompliance = item.status.equals("ForCompliance", true)

    val submitted = when {
        isDraft -> ProgressStep(
            label = "Pre-forecast draft",
            detail = "Add container identity photos, then submit for evaluation",
            state = ProgressStepState.Current,
            actionLabel = "Add photos",
            onAction = onManagePhotos,
        )
        else -> ProgressStep(
            label = "Pre-forecast submitted",
            detail = "${item.truckerName} · ${item.createdAt}",
            state = ProgressStepState.Complete,
        )
    }

    val evaluation = when {
        isDraft -> ProgressStep("Shipping line evaluation", "Submit the pre-forecast to begin evaluation", ProgressStepState.Upcoming)
        isRejected -> ProgressStep("Shipping line evaluation", "This request was rejected", ProgressStepState.Error)
        isForCompliance -> ProgressStep(
            label = "Shipping line evaluation",
            detail = item.complianceRemarks ?: "Corrections requested — update photos or details, then resubmit",
            state = ProgressStepState.Current,
            actionLabel = "Fix & resubmit",
            onAction = onManagePhotos,
        )
        isApproved -> ProgressStep("Shipping line evaluation", "Approved by shipping line", ProgressStepState.Complete)
        isPending -> ProgressStep(
            label = "Shipping line evaluation",
            detail = if (item.status.equals("UnderEvaluation", true)) {
                "A shipping-line evaluator is reviewing your request"
            } else {
                "Waiting for a shipping-line evaluator to review this request"
            },
            state = ProgressStepState.Current,
            actionLabel = if (item.status.equals("Submitted", true)) "Manage photos" else null,
            onAction = if (item.status.equals("Submitted", true)) onManagePhotos else null,
        )
        else -> ProgressStep("Shipping line evaluation", "Awaiting evaluator decision", ProgressStepState.Upcoming)
    }

    val scheduling = when {
        !isApproved -> ProgressStep("Return scheduling", "Depot assigns date, slot, and trucker after approval", ProgressStepState.Upcoming)
        scheduleLoading -> ProgressStep("Return scheduling", "Loading schedule details…", ProgressStepState.Current, "View schedule", onOpenSchedule)
        schedule == null -> ProgressStep("Return scheduling", "Waiting for depot to create the return schedule", ProgressStepState.Current, "View schedule", onOpenSchedule)
        schedule.status.equals("WaitingSchedule", true) -> ProgressStep(
            "Return scheduling",
            "Depot is assigning date, time slot, and trucker",
            ProgressStepState.Current,
            "View schedule",
            onOpenSchedule,
        )
        else -> {
            val slot = buildString {
                append(scheduleStatusLabel(schedule.status))
                append(" · ")
                append(schedule.date)
                append(" ")
                append(schedule.time)
                if (schedule.slotNo > 0) append(" · Slot ${schedule.slotNo}")
                schedule.truckerName?.takeIf { it.isNotBlank() }?.let { append(" · $it") }
            }
            ProgressStep("Return scheduling", slot, ProgressStepState.Complete, "View return schedule", onOpenSchedule)
        }
    }

    val qrStep = when {
        !isApproved || schedule == null || !isScheduleConfirmed(schedule.status) ->
            ProgressStep("Booking QR", "Published after payment is verified in ICS", ProgressStepState.Upcoming)
        qrLoading -> ProgressStep("Booking QR", "Publishing booking QR…", ProgressStepState.Current)
        qr != null -> ProgressStep(
            "Booking QR",
            "Published for LOGICTECK integration · Ref ${qr.qrCode}",
            ProgressStepState.Complete,
            "View QR",
            onViewQr,
        )
        isScheduleForPayment(schedule.status) ->
            ProgressStep("Booking QR", "Upload payment proof to unlock the booking QR", ProgressStepState.Current, "Go to payment", onOpenSchedule)
        else -> ProgressStep("Booking QR", "Pre-forecast QR not yet published", ProgressStepState.Current)
    }

    return listOf(submitted, evaluation, scheduling, qrStep)
}

@Composable
fun PreForecastProgressStrip(steps: List<ProgressStep>, modifier: Modifier = Modifier) {
    IcsSectionCard(title = "Progress", modifier = modifier) {
        Column(Modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            steps.forEach { step ->
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.Top) {
                    val (bg, fg) = when (step.state) {
                        ProgressStepState.Complete -> Color(0x142E7D32) to Color(0xFF2E7D32)
                        ProgressStepState.Error -> Color(0x14C62828) to Color(0xFFC62828)
                        ProgressStepState.Current -> IcsColors.Primary.copy(alpha = 0.12f) to IcsColors.Primary
                        ProgressStepState.Upcoming -> IcsColors.Divider.copy(alpha = 0.3f) to IcsColors.TextSecondary
                    }
                    Surface(shape = CircleShape, color = bg, border = BorderStroke(1.dp, fg.copy(alpha = 0.35f)), modifier = Modifier.size(28.dp)) {
                        Icon(
                            if (step.state == ProgressStepState.Complete) Icons.Default.CheckCircle else Icons.Outlined.RadioButtonUnchecked,
                            contentDescription = null,
                            tint = fg,
                            modifier = Modifier.padding(4.dp),
                        )
                    }
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(step.label, style = MaterialTheme.typography.labelLarge)
                        Text(step.detail, style = MaterialTheme.typography.bodySmall, color = IcsColors.TextSecondary)
                        if (step.actionLabel != null && step.onAction != null) {
                            OutlinedButton(onClick = step.onAction, modifier = Modifier.padding(top = 4.dp)) {
                                Text(step.actionLabel)
                            }
                        }
                    }
                }
            }
        }
    }
}
