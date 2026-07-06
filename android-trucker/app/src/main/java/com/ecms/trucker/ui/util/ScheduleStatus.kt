package com.ecms.trucker.ui.util

import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import com.ecms.trucker.R

fun isWaitingSchedule(status: String): Boolean =
    status.equals("WaitingSchedule", ignoreCase = true)

fun formatScheduleStatus(status: String): String = when {
    status.equals("WaitingSchedule", ignoreCase = true) -> "Waiting schedule"
    status.equals("ForVerification", ignoreCase = true) -> "For verification"
    status.equals("NoShow", ignoreCase = true) -> "No show"
    else -> status.replace(Regex("([a-z])([A-Z])"), "$1 $2")
}

@Composable
fun scheduleListSubtitle(
    depotName: String,
    date: String,
    time: String,
    slotNo: Int,
    status: String,
): String {
    if (isWaitingSchedule(status)) {
        return stringResource(R.string.returns_waiting_schedule_list_subtitle, depotName)
    }
    return stringResource(R.string.returns_subtitle, depotName, date, time, slotNo)
}
