package com.ecms.trucker.util

import android.content.Context
import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.provider.OpenableColumns
import com.google.zxing.BinaryBitmap
import com.google.zxing.MultiFormatReader
import com.google.zxing.NotFoundException
import com.google.zxing.RGBLuminanceSource
import com.google.zxing.common.HybridBinarizer
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.URLDecoder

object CroEdoQrDecoder {
    private val verifyPathRegex = Regex("""/verify/cro-edo/([^/?#]+)""", RegexOption.IGNORE_CASE)
    private val rawTokenRegex = Regex("""^[A-Za-z0-9_-]{40,64}$""")

    fun extractTokenFromText(raw: String): String? {
        val text = raw.trim()
        if (text.isEmpty()) return null

        verifyPathRegex.find(text)?.groupValues?.getOrNull(1)?.let { token ->
            return runCatching { URLDecoder.decode(token, Charsets.UTF_8.name()).trim() }
                .getOrElse { token.trim() }
        }

        if (rawTokenRegex.matches(text)) return text
        return null
    }

    suspend fun extractTokenFromUri(context: Context, uri: Uri): String? = withContext(Dispatchers.IO) {
        val mime = context.contentResolver.getType(uri).orEmpty()
        val name = context.contentResolver.queryFileName(uri)?.lowercase().orEmpty()
        val isPdf = mime == "application/pdf" || name.endsWith(".pdf")
        val bitmap = if (isPdf) {
            renderPdfFirstPage(context, uri)
        } else {
            decodeBitmapFromUri(context, uri)
        } ?: return@withContext null

        val payload = decodeQrFromBitmap(bitmap) ?: return@withContext null
        extractTokenFromText(payload)
    }

    private fun decodeBitmapFromUri(context: Context, uri: Uri): Bitmap? {
        return context.contentResolver.openInputStream(uri)?.use { input ->
            android.graphics.BitmapFactory.decodeStream(input)
        }
    }

    private fun renderPdfFirstPage(context: Context, uri: Uri): Bitmap? {
        val pfd = context.contentResolver.openFileDescriptor(uri, "r") ?: return null
        pfd.use { descriptor ->
            PdfRenderer(descriptor).use { renderer ->
                if (renderer.pageCount == 0) return null
                val page = renderer.openPage(0)
                val scale = 2
                val width = page.width * scale
                val height = page.height * scale
                val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                page.close()
                return bitmap
            }
        }
    }

    private fun decodeQrFromBitmap(bitmap: Bitmap): String? {
        val width = bitmap.width
        val height = bitmap.height
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, 0, 0, width, height)
        val source = RGBLuminanceSource(width, height, pixels)
        val binaryBitmap = BinaryBitmap(HybridBinarizer(source))
        return try {
            MultiFormatReader().decode(binaryBitmap).text?.trim()
        } catch (_: NotFoundException) {
            null
        }
    }

    private fun android.content.ContentResolver.queryFileName(uri: Uri): String? {
        return query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
            val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (index >= 0 && cursor.moveToFirst()) cursor.getString(index) else null
        }
    }
}
