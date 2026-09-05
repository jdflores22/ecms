package com.ecms.trucker.util

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

private val phZone = ZoneId.of("Asia/Manila")

fun createdAtPhDate(createdAt: String): LocalDate? {
    return runCatching { Instant.parse(createdAt).atZone(phZone).toLocalDate() }
        .getOrNull()
        ?: runCatching { LocalDate.parse(createdAt.take(10)) }.getOrNull()
}

fun matchesPreForecastDateFilter(createdAt: String, from: String?, to: String?): Boolean {
    val date = createdAtPhDate(createdAt) ?: return true
    if (!from.isNullOrBlank()) {
        val f = runCatching { LocalDate.parse(from) }.getOrNull() ?: return true
        if (date.isBefore(f)) return false
    }
    if (!to.isNullOrBlank()) {
        val t = runCatching { LocalDate.parse(to) }.getOrNull() ?: return true
        if (date.isAfter(t)) return false
    }
    return true
}
