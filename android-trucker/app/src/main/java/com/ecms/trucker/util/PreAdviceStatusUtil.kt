package com.ecms.trucker.util

import androidx.compose.ui.graphics.Color
import com.ecms.trucker.data.model.PreAdviceDto
import com.ecms.trucker.data.model.QrBookingDto
import com.ecms.trucker.ui.theme.IcsColors

data class StatusBadgeStyle(
    val label: String,
    val color: Color,
    val background: Color,
)

private val preAdviceStatusStyles = mapOf(
    "Draft" to StatusBadgeStyle("Draft", Color(0xFF616161), Color(0x14616161)),
    "Submitted" to StatusBadgeStyle("Submitted", Color(0xFF1565C0), Color(0x141565C0)),
    "UnderEvaluation" to StatusBadgeStyle("Under evaluation", Color(0xFFED6C02), Color(0x14ED6C02)),
    "Approved" to StatusBadgeStyle("Approved", Color(0xFF2E7D32), Color(0x142E7D32)),
    "Rejected" to StatusBadgeStyle("Rejected", Color(0xFFC62828), Color(0x14C62828)),
    "ForCompliance" to StatusBadgeStyle("For compliance", Color(0xFFED6C02), Color(0x14ED6C02)),
    "Cancelled" to StatusBadgeStyle("Cancelled", Color(0xFF757575), Color(0x14757575)),
)

private val scheduleFlowStyles = mapOf(
    "WaitingSchedule" to StatusBadgeStyle("Awaiting schedule", Color(0xFFED6C02), Color(0x14ED6C02)),
    "Scheduled" to StatusBadgeStyle("For Payment", Color(0xFF1565C0), Color(0x141565C0)),
    "Confirmed" to StatusBadgeStyle("Confirmed", Color(0xFF2E7D32), Color(0x142E7D32)),
    "Completed" to StatusBadgeStyle("Completed", Color(0xFF1565C0), Color(0x141565C0)),
    "NoShow" to StatusBadgeStyle("No show", Color(0xFFC62828), Color(0x14C62828)),
)

fun scheduleStatusLabel(status: String): String =
    scheduleFlowStyles[status]?.label ?: when (status) {
        "WaitingSchedule" -> "Waiting schedule"
        else -> status
    }

fun getPreAdviceListStatus(item: PreAdviceDto): StatusBadgeStyle {
    if (item.status.equals("Approved", true) && !item.scheduleStatus.isNullOrBlank()) {
        scheduleFlowStyles[item.scheduleStatus]?.let { return it }
    }
    return preAdviceStatusStyles[item.status] ?: StatusBadgeStyle(item.status, IcsColors.TextSecondary, IcsColors.Divider.copy(alpha = 0.2f))
}

enum class LogicteckQrStatus(val label: String) {
    ReadyToSend("Ready to send"),
    Booked("Booked on LOGICTECK"),
    Retrieved("Retrieved"),
}

fun qrLogicteckStatusFromPreAdvice(item: PreAdviceDto): LogicteckQrStatus? {
    if (!item.hasQrBooking) return null
    return logicteckStatusFromRaw(item.logicteckStatus)
}

fun logicteckStatusFromPreAdvice(item: PreAdviceDto): LogicteckQrStatus? =
    qrLogicteckStatusFromPreAdvice(item)

fun logicteckStatusFromRaw(raw: String?): LogicteckQrStatus {
    return when {
        raw.equals("Retrieved", true) || raw.equals("Used", true) -> LogicteckQrStatus.Retrieved
        raw.equals("Booked", true) || raw.equals("Booked on LOGICTECK", true) -> LogicteckQrStatus.Booked
        else -> LogicteckQrStatus.ReadyToSend
    }
}

fun logicteckStatusFromBooking(booking: QrBookingDto): LogicteckQrStatus {
    if (booking.isUsed || booking.logicteckStatus.equals("Retrieved", true) || booking.logicteckStatus.equals("Used", true)) {
        return LogicteckQrStatus.Retrieved
    }
    if (!booking.logicteckBookedAt.isNullOrBlank() || booking.logicteckStatus.equals("Booked", true)) {
        return LogicteckQrStatus.Booked
    }
    return LogicteckQrStatus.ReadyToSend
}

fun canBookLogicteck(booking: QrBookingDto?): Boolean =
    booking != null && !booking.isUsed && booking.logicteckBookedAt.isNullOrBlank()

fun isScheduleForPayment(status: String): Boolean = status.equals("Scheduled", true)

fun isScheduleConfirmed(status: String): Boolean =
    status.equals("Confirmed", true) || status.equals("Completed", true)
