package com.ecms.trucker.util

import com.ecms.trucker.data.model.ScheduleDto

const val TRUCKER_AWAITING_CY_MESSAGE =
    "Awaiting Container Yard to confirm the date of return"

const val TRUCKER_AWAITING_PAYMENT_MESSAGE =
    "Upload payment proof to view your confirmed return schedule"

fun isScheduleDetailsVisible(schedule: ScheduleDto): Boolean {
    if (!schedule.detailsVisible) return false
    if (schedule.status.equals("WaitingSchedule", true) || schedule.status.equals("Scheduled", true)) {
        return false
    }
    return schedule.status.equals("Confirmed", true) ||
        schedule.status.equals("Completed", true) ||
        schedule.status.equals("NoShow", true)
}

fun truckerScheduleStatusHint(schedule: ScheduleDto): String =
    schedule.statusHint?.takeIf { it.isNotBlank() }
        ?: when {
            schedule.status.equals("WaitingSchedule", true) -> TRUCKER_AWAITING_CY_MESSAGE
            schedule.status.equals("Scheduled", true) -> TRUCKER_AWAITING_PAYMENT_MESSAGE
            else -> ""
        }

fun truckerScheduleStatusLabel(schedule: ScheduleDto): String =
    when {
        !isScheduleDetailsVisible(schedule) && schedule.status.equals("WaitingSchedule", true) ->
            "Awaiting CY confirmation"
        !isScheduleDetailsVisible(schedule) && schedule.status.equals("Scheduled", true) ->
            "For payment"
        schedule.status.equals("WaitingSchedule", true) -> "Awaiting schedule"
        schedule.status.equals("Scheduled", true) -> "For payment"
        schedule.status.equals("Confirmed", true) -> "Confirmed"
        schedule.status.equals("Completed", true) -> "Completed"
        schedule.status.equals("NoShow", true) -> "No show"
        else -> schedule.status.replace(Regex("([a-z])([A-Z])"), "$1 $2")
    }

fun formatTruckerScheduleSlot(schedule: ScheduleDto): String =
    if (isScheduleDetailsVisible(schedule) && schedule.date.isNotBlank()) {
        "${schedule.date} ${schedule.time}".trim()
    } else {
        truckerScheduleStatusHint(schedule)
    }
