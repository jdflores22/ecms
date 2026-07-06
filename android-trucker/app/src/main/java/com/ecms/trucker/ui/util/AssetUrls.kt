package com.ecms.trucker.ui.util

import com.ecms.trucker.BuildConfig

object AssetUrls {
    fun resolve(path: String): String {
        val normalizedPath = path.replace("\\", "/")
        if (normalizedPath.startsWith("http://") || normalizedPath.startsWith("https://")) {
            return normalizedPath
        }
        val base = BuildConfig.API_BASE_URL
            .trimEnd('/')
            .replace(Regex("/api$"), "")
        val normalized = if (normalizedPath.startsWith("/")) normalizedPath else "/$normalizedPath"
        return "$base$normalized"
    }
}
