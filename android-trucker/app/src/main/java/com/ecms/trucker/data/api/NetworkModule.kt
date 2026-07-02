package com.ecms.trucker.data.api

import android.util.Base64
import com.ecms.trucker.data.local.TokenStore
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock

class AuthInterceptor(
    private val tokenStore: TokenStore,
    private val baseUrl: String,
) : Interceptor {
    private val lock = ReentrantLock()
    private var refreshBlocked = false
    private val json = Json { ignoreUnknownKeys = true }

    fun resetSession() {
        lock.withLock { refreshBlocked = false }
    }

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        if (request.url.encodedPath.contains("/auth/")) {
            return chain.proceed(request)
        }

        val token = runBlocking { tokenStore.getAccessToken() }
        val authedRequest = if (!token.isNullOrBlank()) {
            val bearer = if (isTokenExpired(token)) {
                refreshToken() ?: token
            } else {
                token
            }
            request.newBuilder().header("Authorization", "Bearer $bearer").build()
        } else {
            request
        }

        var response = chain.proceed(authedRequest)
        if (response.code == 401 && !request.url.encodedPath.contains("/auth/")) {
            response.close()
            val refreshed = refreshToken()
            if (refreshed != null) {
                val retry = request.newBuilder()
                    .header("Authorization", "Bearer $refreshed")
                    .build()
                response = chain.proceed(retry)
            }
        }
        return response
    }

    private fun refreshToken(): String? = lock.withLock {
        if (refreshBlocked) return null
        val refresh = runBlocking { tokenStore.getRefreshToken() } ?: run {
            refreshBlocked = true
            runBlocking { tokenStore.clear() }
            return null
        }

        val client = OkHttpClient.Builder().build()
        val body = """{"refreshToken":"$refresh"}"""
        val refreshRequest = Request.Builder()
            .url("${baseUrl.trimEnd('/')}/auth/refresh")
            .post(body.toRequestBody("application/json".toMediaType()))
            .build()

        return try {
            client.newCall(refreshRequest).execute().use { response ->
                if (!response.isSuccessful) {
                    refreshBlocked = true
                    runBlocking { tokenStore.clear() }
                    return null
                }
                val responseBody = response.body?.string() ?: return null
                val auth = json.decodeFromString<com.ecms.trucker.data.model.AuthResponse>(responseBody)
                runBlocking {
                    tokenStore.saveAuth(auth.accessToken, auth.refreshToken, auth.user)
                }
                auth.accessToken
            }
        } catch (_: Exception) {
            refreshBlocked = true
            runBlocking { tokenStore.clear() }
            null
        }
    }

    private fun isTokenExpired(token: String, skewSeconds: Long = 30): Boolean {
        return try {
            val payload = token.split(".")[1]
            val decoded = String(decodeBase64Url(payload))
            val exp = json.parseToJsonElement(decoded).jsonObject["exp"]?.jsonPrimitive?.long ?: return false
            System.currentTimeMillis() >= (exp * 1000) - (skewSeconds * 1000)
        } catch (_: Exception) {
            false
        }
    }

    private fun decodeBase64Url(input: String): ByteArray {
        var base64 = input.replace('-', '+').replace('_', '/')
        when (base64.length % 4) {
            2 -> base64 += "=="
            3 -> base64 += "="
        }
        return Base64.decode(base64, Base64.DEFAULT)
    }
}

data class NetworkServices(
    val api: EcmsApiService,
    val authInterceptor: AuthInterceptor,
)

object NetworkModule {
    fun create(tokenStore: TokenStore, baseUrl: String): NetworkServices {
        val normalizedBase = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
        val authInterceptor = AuthInterceptor(tokenStore, normalizedBase)
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }
        val client = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .addInterceptor(authInterceptor)
            .addInterceptor(logging)
            .build()

        val json = Json {
            ignoreUnknownKeys = true
            coerceInputValues = true
            isLenient = true
        }

        val api = Retrofit.Builder()
            .baseUrl(normalizedBase)
            .client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(EcmsApiService::class.java)

        return NetworkServices(api, authInterceptor)
    }
}
