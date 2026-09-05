package com.ecms.trucker.util

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

private val monthMap = mapOf(
    "jan" to 1, "feb" to 2, "mar" to 3, "apr" to 4, "may" to 5, "jun" to 6,
    "jul" to 7, "aug" to 8, "sep" to 9, "oct" to 10, "nov" to 11, "dec" to 12,
)

fun parseCroFreeTimeToIso(value: String?): String? {
    val raw = value?.trim().orEmpty()
    if (raw.isEmpty()) return null

    if (Regex("""^\d{4}-\d{2}-\d{2}$""").matches(raw)) return raw

    val mmm = Regex("""^(\d{1,2})-([A-Za-z]{3})-(\d{4})$""").find(raw)
    if (mmm != null) {
        val day = mmm.groupValues[1].toIntOrNull() ?: return null
        val month = monthMap[mmm.groupValues[2].lowercase(Locale.US)] ?: return null
        val year = mmm.groupValues[3].toIntOrNull() ?: return null
        return LocalDate.of(year, month, day).format(DateTimeFormatter.ISO_LOCAL_DATE)
    }
    return null
}

fun isCroFreeTimeExpired(value: String?): Boolean {
    val iso = parseCroFreeTimeToIso(value) ?: return false
    return iso < LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
}

fun croFreeTimeExpiredMessage(value: String?): String {
    val until = value?.trim().orEmpty().ifEmpty { "the stated date" }
    return "CRO/eDO free time expired on $until. Settle charges under Demurrage before submitting."
}
