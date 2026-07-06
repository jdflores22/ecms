package com.ecms.trucker.ui.util

import java.time.Instant
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

fun formatRelativeTime(value: String): String {
    val instant = runCatching {
        OffsetDateTime.parse(value).toInstant()
    }.getOrElse {
        runCatching { Instant.parse(value) }.getOrNull()
    } ?: return value

    val minutes = ChronoUnit.MINUTES.between(instant, Instant.now()).coerceAtLeast(0)
    val hours = minutes / 60
    val days = hours / 24
    val months = days / 30

    return when {
        months >= 1 -> if (months == 1L) "about 1 month ago" else "about $months months ago"
        days >= 1 -> if (days == 1L) "about 1 day ago" else "about $days days ago"
        hours >= 1 -> if (hours == 1L) "about 1 hour ago" else "about $hours hours ago"
        minutes >= 1 -> if (minutes == 1L) "about 1 minute ago" else "about $minutes minutes ago"
        else -> "just now"
    }
}

fun formatScheduleDate(value: String): String {
    return runCatching {
        val date = java.time.LocalDate.parse(value.take(10))
        date.format(DateTimeFormatter.ofPattern("MMM d, yyyy"))
    }.getOrElse { value }
}

fun formatScheduleTime(value: String): String {
    return runCatching {
        val time = java.time.LocalTime.parse(value.take(8))
        time.format(DateTimeFormatter.ofPattern("h:mm a"))
    }.getOrElse { value }
}
