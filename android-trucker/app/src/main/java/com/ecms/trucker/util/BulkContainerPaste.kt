package com.ecms.trucker.util

object BulkContainerPaste {
    fun parse(text: String): List<String> {
        return text
            .split(Regex("""[\r\n,;]+"""))
            .map { it.trim().uppercase().replace(Regex("""\s+"""), "") }
            .filter { it.matches(Regex("""^[A-Z]{4}\d{7}$""")) }
            .distinct()
    }
}
