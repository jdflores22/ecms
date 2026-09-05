package com.ecms.trucker.util

import com.ecms.trucker.data.model.PaymentDto
import com.ecms.trucker.data.model.ScheduleDto

fun isActiveReturnSchedule(schedule: ScheduleDto): Boolean =
    schedule.status.equals("Scheduled", true) || schedule.status.equals("Confirmed", true)

fun needsPaymentUpload(schedule: ScheduleDto, payment: PaymentDto?): Boolean {
    if (!isActiveReturnSchedule(schedule)) return false
    return payment == null ||
        payment.status.equals("Pending", true) ||
        payment.status.equals("Rejected", true)
}

fun resolvePaymentStatus(schedule: ScheduleDto, payment: PaymentDto?): String =
    payment?.status ?: if (schedule.status.equals("Scheduled", true)) "Pending" else "Pending"

fun showPaymentStatus(schedule: ScheduleDto, payment: PaymentDto?): Boolean =
    isActiveReturnSchedule(schedule) || payment != null
