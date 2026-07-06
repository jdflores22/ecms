package com.ecms.trucker.ui.util

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File

object DocumentOpener {
    private val client = OkHttpClient()

    suspend fun open(
        context: Context,
        filePath: String,
        accessToken: String?,
        fileName: String? = null,
    ) = withContext(Dispatchers.IO) {
        val url = AssetUrls.resolve(filePath)
        val requestBuilder = Request.Builder().url(url).get()
        if (!accessToken.isNullOrBlank()) {
            requestBuilder.header("Authorization", "Bearer $accessToken")
        }
        val response = client.newCall(requestBuilder.build()).execute()
        if (!response.isSuccessful) {
            throw IllegalStateException("Unable to open document (${response.code}).")
        }
        val body = response.body ?: throw IllegalStateException("Document response was empty.")
        val safeName = (fileName ?: url.substringAfterLast('/'))
            .replace(Regex("""[\\/:*?"<>|]"""), "_")
            .ifBlank { "document.pdf" }
        val target = File(context.cacheDir, "doc_${System.currentTimeMillis()}_$safeName")
        target.outputStream().use { out -> body.byteStream().copyTo(out) }

        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            target,
        )
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, response.header("Content-Type") ?: "application/pdf")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        withContext(Dispatchers.Main) {
            context.startActivity(Intent.createChooser(intent, null))
        }
    }
}
