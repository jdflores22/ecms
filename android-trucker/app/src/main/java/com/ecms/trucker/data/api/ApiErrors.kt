package com.ecms.trucker.data.api

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import retrofit2.HttpException

private val errorJson = Json { ignoreUnknownKeys = true }

fun Throwable.userMessage(fallback: String): String {
    if (this is HttpException) {
        val body = response()?.errorBody()?.string()
        if (!body.isNullOrBlank()) {
            runCatching {
                errorJson.parseToJsonElement(body).jsonObject["message"]?.jsonPrimitive?.content
            }.getOrNull()?.takeIf { it.isNotBlank() }?.let { return it }
        }
        when (code()) {
            401 -> return "Invalid username or password."
            403 -> return "This account cannot use the trucker app."
            429 -> return "Too many attempts. Please wait a minute and try again."
        }
        return "Request failed (HTTP ${code()})."
    }
    return message?.takeIf { it.isNotBlank() } ?: fallback
}
