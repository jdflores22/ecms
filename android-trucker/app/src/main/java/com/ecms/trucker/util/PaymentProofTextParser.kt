package com.ecms.trucker.util

data class PaymentProofMetadata(
    val referenceNo: String? = null,
    val paymentId: String? = null,
    val qrphInvoiceNo: String? = null,
    val transactionAt: String? = null,
    val provider: String? = null,
)

object PaymentProofTextParser {
    private val paymentIdPatterns = listOf(
        Regex("""Payment\s+ID\s*[:.]?\s*((?:[0-9A-Fa-f]{4}\s*){2,3}[0-9A-Fa-f]{4})\b""", RegexOption.IGNORE_CASE),
        Regex("""Payment\s+ID\s*[:.]?\s*([0-9A-Fa-f]{10,16})\b""", RegexOption.IGNORE_CASE),
    )
    private val referencePatterns = listOf(
        Regex("""(?:Reference\s+Number|Referencenumber)\s*(?:Transaction\s+Date|Transactiondate)?\s*(UB\d{4,12})\b""", RegexOption.IGNORE_CASE),
        Regex("""(UB\d{4,12})""", RegexOption.IGNORE_CASE),
        Regex("""Reference\s+Number\s*[:.]?\s*(\d{6,12})\b""", RegexOption.IGNORE_CASE),
        Regex("""(?:Ref(?:erence)?\.?\s*No\.?)\s*[:.]?\s*(\d{6,12})\b""", RegexOption.IGNORE_CASE),
        Regex("""\b(\d{4}\s+\d{3}\s+\d{6})\b"""),
        Regex("""\b(\d{3}\s+\d{3}\s+\d{3})\b"""),
    )
    private val qrphPatterns = listOf(
        Regex("""QR\s*Ph?\s*Invoice\s*No\.?\s*[:.]?\s*(\d{4,12})""", RegexOption.IGNORE_CASE),
        Regex("""QRPH\s*Invoice\s*No\.?\s*[:.]?\s*(\d{4,12})""", RegexOption.IGNORE_CASE),
        Regex("""Invoice\s*No\.?\s*[:.]?\s*(\d{4,8})\b""", RegexOption.IGNORE_CASE),
    )
    private val datePatterns = listOf(
        Regex("""\bDate\b\s*[:.]?\s*((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[^\n]{6,40})""", RegexOption.IGNORE_CASE),
        Regex("""((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2},?\s+\d{4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm|eM|pM|pn))""", RegexOption.IGNORE_CASE),
        Regex("""\b(\d{1,2}[/.-]\d{1,2}[/.-]20\d{2}\s+\d{1,2}\s*:\s*\d{2}\s*(?:AM|PM|am|pm|eM|pM|pn))\b""", RegexOption.IGNORE_CASE),
        Regex("""\b(20\d{2}[/.-]\d{1,2}[/.-]\d{1,2}\s+\d{1,2}\s*:\s*\d{2}\s*(?:AM|PM|am|pm|eM|pM|pn))\b""", RegexOption.IGNORE_CASE),
    )
    private val providerPatterns = listOf(
        "gcash" to "GCash",
        "maya" to "Maya",
        "paymaya" to "Maya",
        "unionbank" to "UnionBank",
        "bpi" to "BPI",
        "bdo" to "BDO",
        "metrobank" to "Metrobank",
        "landbank" to "Landbank",
    )

    fun parse(text: String): PaymentProofMetadata {
        val normalized = fixOcrDateText(text)
        val paymentId = firstMatch(paymentIdPatterns, normalized)?.replace(" ", "")
        val referenceNo = firstMatch(referencePatterns, normalized)?.replace(" ", "")
        val qrphInvoiceNo = firstMatch(qrphPatterns, normalized)
        val transactionAt = firstMatch(datePatterns, normalized)?.trim()
        val provider = detectProvider(normalized)
        return PaymentProofMetadata(
            referenceNo = referenceNo,
            paymentId = paymentId,
            qrphInvoiceNo = qrphInvoiceNo,
            transactionAt = transactionAt,
            provider = provider,
        )
    }

    private fun firstMatch(patterns: List<Regex>, text: String): String? {
        for (pattern in patterns) {
            val match = pattern.find(text) ?: continue
            return match.groupValues.getOrNull(1)?.trim()?.takeIf { it.isNotBlank() }
        }
        return null
    }

    private fun detectProvider(text: String): String? {
        val lower = text.lowercase()
        return providerPatterns.firstOrNull { lower.contains(it.first) }?.second
    }

    private fun fixOcrDateText(text: String): String = text
        .replace(Regex("""\b(?:D|0)ate\b""", RegexOption.IGNORE_CASE), "Date")
        .replace(Regex("""\b(\d{1,2})\s*:\s*(\d{2})\s*eM\b""", RegexOption.IGNORE_CASE), "$1:$2 PM")
        .replace(Regex("""\b(\d{1,2})\s*:\s*(\d{2})\s*pn\b""", RegexOption.IGNORE_CASE), "$1:$2 PM")
}
