package com.ecms.trucker.data.api

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import retrofit2.HttpException

private val errorJson = Json { ignoreUnknownKeys = true }

private fun parseApiErrorMessage(body: String): String? {
    val root = runCatching { errorJson.parseToJsonElement(body).jsonObject }.getOrNull() ?: return null
    root["message"]?.jsonPrimitive?.content?.takeIf { it.isNotBlank() }?.let { return it }
    val errors = root["errors"]?.jsonObject ?: return null
    return errors.values
        .flatMap { element ->
            when {
                element.jsonPrimitive.isString -> listOf(element.jsonPrimitive.content)
                else -> element.jsonArray.mapNotNull { it.jsonPrimitive.content.takeIf { msg -> msg.isNotBlank() } }
            }
        }
        .firstOrNull { it.isNotBlank() }
}

fun Throwable.userMessage(fallback: String): String {
    if (this is HttpException) {
        val body = response()?.errorBody()?.string()
        if (!body.isNullOrBlank()) {
            parseApiErrorMessage(body)?.let { return it }
        }
        when (code()) {
            401 -> return "Invalid username or password."
            403 -> return "This account cannot use the trucker app."
            429 -> return "Too many attempts. Please wait a minute and try again."
            500 -> return "Server error. The API database may need an update — try again after a few minutes."
        }
        return "Request failed (HTTP ${code()})."
    }
    return message?.takeIf { it.isNotBlank() } ?: fallback
}
