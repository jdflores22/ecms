package com.ecms.trucker.ui.util

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import com.ecms.trucker.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File

object FileShareHelper {
    private val client = OkHttpClient()

    suspend fun downloadAuthenticatedFile(
        context: Context,
        relativeOrAbsoluteUrl: String,
        accessToken: String?,
        fileName: String,
        mimeType: String,
    ): File = withContext(Dispatchers.IO) {
        val url = if (relativeOrAbsoluteUrl.startsWith("http")) {
            relativeOrAbsoluteUrl
        } else {
            AssetUrls.resolve(relativeOrAbsoluteUrl)
        }
        val requestBuilder = Request.Builder().url(url).get()
        if (!accessToken.isNullOrBlank()) {
            requestBuilder.header("Authorization", "Bearer $accessToken")
        }
        val response = client.newCall(requestBuilder.build()).execute()
        if (!response.isSuccessful) {
            throw IllegalStateException("Download failed (${response.code}).")
        }
        val body = response.body ?: throw IllegalStateException("Empty download response.")
        val safeName = fileName.replace(Regex("""[\\/:*?"<>|]"""), "_")
        val target = File(context.cacheDir, "ecms_${System.currentTimeMillis()}_$safeName")
        target.outputStream().use { out -> body.byteStream().copyTo(out) }
        target
    }

    suspend fun downloadQrImage(context: Context, bookingId: Int, qrCode: String, accessToken: String?): File {
        val base = BuildConfig.API_BASE_URL.trimEnd('/')
        return downloadAuthenticatedFile(
            context = context,
            relativeOrAbsoluteUrl = "$base/qr/download/$bookingId",
            accessToken = accessToken,
            fileName = "qr-$qrCode.png",
            mimeType = "image/png",
        )
    }

    suspend fun downloadConfirmationPdf(context: Context, bookingId: Int, qrCode: String, accessToken: String?): File {
        val base = BuildConfig.API_BASE_URL.trimEnd('/')
        return downloadAuthenticatedFile(
            context = context,
            relativeOrAbsoluteUrl = "$base/qr/confirmation-pdf/$bookingId",
            accessToken = accessToken,
            fileName = "ICS-Booking-Confirmation-$qrCode.pdf",
            mimeType = "application/pdf",
        )
    }

    fun shareFile(context: Context, file: File, mimeType: String, chooserTitle: String) {
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = mimeType
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, chooserTitle).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    fun openFile(context: Context, file: File, mimeType: String) {
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, mimeType)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(Intent.createChooser(intent, null))
    }
}
