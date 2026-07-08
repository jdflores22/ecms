package com.ecms.trucker.ui.util

import android.content.Context
import coil.request.ImageRequest
import com.ecms.trucker.data.local.AuthState

fun buildAuthedImageRequest(
    context: Context,
    filePath: String?,
    accessToken: String?,
): ImageRequest {
    val url = AssetUrls.resolve(filePath.orEmpty())
    val builder = ImageRequest.Builder(context)
        .data(url)
        .crossfade(true)
    if (!accessToken.isNullOrBlank()) {
        builder.setHeader("Authorization", "Bearer $accessToken")
    }
    return builder.build()
}

fun AuthState.accessTokenOrNull(): String? = accessToken?.takeIf { it.isNotBlank() }
