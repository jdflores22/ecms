package com.ecms.trucker.util

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

object TextRecognitionOcr {
    private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

    suspend fun recognizeText(context: Context, uri: Uri): String {
        val bitmap = loadBitmap(context, uri) ?: return ""
        return recognizeBitmap(bitmap)
    }

    suspend fun recognizeBitmap(bitmap: Bitmap): String = suspendCancellableCoroutine { cont ->
        val image = InputImage.fromBitmap(bitmap, 0)
        recognizer.process(image)
            .addOnSuccessListener { result -> cont.resume(result.text.orEmpty()) }
            .addOnFailureListener { cont.resumeWithException(it) }
    }

    suspend fun extractPaymentProofMetadata(context: Context, uri: Uri): PaymentProofMetadata {
        val text = runCatching { recognizeText(context, uri) }.getOrDefault("")
        return if (text.isBlank()) PaymentProofMetadata() else PaymentProofTextParser.parse(text)
    }

    suspend fun extractAtwDocumentMetadata(context: Context, uri: Uri): AtwDocumentMetadata {
        val text = runCatching { recognizeText(context, uri) }.getOrDefault("")
        return if (text.isBlank()) AtwDocumentMetadata() else AtwDocumentParser.parse(text)
    }

    private fun loadBitmap(context: Context, uri: Uri): Bitmap? {
        return context.contentResolver.openInputStream(uri)?.use { stream ->
            BitmapFactory.decodeStream(stream)
        }
    }
}
