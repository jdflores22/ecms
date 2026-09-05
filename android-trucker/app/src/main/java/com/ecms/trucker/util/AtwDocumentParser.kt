package com.ecms.trucker.util

data class AtwDocumentMetadata(
    val atwNumber: String? = null,
    val issueDate: String? = null,
    val expirationDate: String? = null,
    val containerNumbers: List<String> = emptyList(),
    val destination: String? = null,
)

object AtwDocumentParser {
    fun parse(text: String): AtwDocumentMetadata {
        val upper = text.uppercase()
        val containerNumbers = Regex("""\b([A-Z]{4}\d{7})\b""")
            .findAll(upper)
            .map { it.groupValues[1] }
            .distinct()
            .toList()

        val atwMatch = Regex("""\bATW[\s\-#:]*([A-Z0-9\-]{4,24})\b""").find(upper)
            ?: Regex("""\bAUTHORITY\s+TO\s+WITHDRAW[\s\S]{0,40}?([A-Z0-9\-]{5,24})\b""").find(upper)

        val issueMatch = Regex("""ISSUE\s*DATE[:\s]+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})""").find(upper)
            ?: Regex("""DATE\s+ISSUED[:\s]+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})""").find(upper)

        val expiryMatch = Regex("""EXPIR(?:Y|ATION)\s*DATE[:\s]+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})""").find(upper)
            ?: Regex("""VALID\s+UNTIL[:\s]+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})""").find(upper)

        val destinationMatch = Regex("""DESTINATION[:\s]+([A-Z0-9 ,.\-]{4,60})""").find(upper)

        return AtwDocumentMetadata(
            atwNumber = atwMatch?.groupValues?.getOrNull(1)?.replace(Regex("""[^A-Z0-9\-]"""), ""),
            issueDate = issueMatch?.let { toIsoDate(it) },
            expirationDate = expiryMatch?.let { toIsoDate(it) },
            containerNumbers = containerNumbers,
            destination = destinationMatch?.groupValues?.getOrNull(1)?.trim()?.replace(Regex("""\s{2,}"""), " "),
        )
    }

    private fun toIsoDate(match: MatchResult): String? {
        val y = match.groupValues.getOrNull(3) ?: return null
        val m = match.groupValues.getOrNull(2) ?: return null
        val d = match.groupValues.getOrNull(1) ?: return null
        val year = if (y.length == 2) "20$y" else y
        return "$year-${m.padStart(2, '0')}-${d.padStart(2, '0')}"
    }
}
