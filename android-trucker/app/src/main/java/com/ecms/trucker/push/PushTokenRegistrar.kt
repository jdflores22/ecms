package com.ecms.trucker.push

import android.content.Context
import android.os.Build
import android.util.Log
import com.ecms.trucker.BuildConfig
import com.ecms.trucker.EcmsTruckerApp
import com.ecms.trucker.data.api.EcmsApiService
import com.ecms.trucker.data.local.TokenStore
import com.ecms.trucker.data.model.RegisterPushTokenRequest
import com.ecms.trucker.data.model.UnregisterPushTokenRequest
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.tasks.await

object PushTokenRegistrar {
    private const val TAG = "PushTokenRegistrar"
    private const val PREFS = "ecms_push"
    private const val KEY_TOKEN = "fcm_token"

    suspend fun sync(context: Context, api: EcmsApiService) {
        if (!BuildConfig.FIREBASE_ENABLED) return

        val tokenStore = TokenStore(context)
        if (tokenStore.getAccessToken().isNullOrBlank()) return

        runCatching {
            val token = FirebaseMessaging.getInstance().token.await()
            if (token.isBlank()) return

            api.registerPushToken(
                RegisterPushTokenRequest(
                    token = token,
                    platform = "android",
                    deviceName = deviceName(),
                ),
            )
            saveLocalToken(context, token)
            Log.i(TAG, "Push token registered")
        }.onFailure {
            Log.w(TAG, "Failed to register push token", it)
        }
    }

    suspend fun unregister(context: Context, api: EcmsApiService) {
        if (!BuildConfig.FIREBASE_ENABLED) return

        val token = loadLocalToken(context) ?: return
        runCatching {
            api.unregisterPushToken(UnregisterPushTokenRequest(token))
            clearLocalToken(context)
            Log.i(TAG, "Push token unregistered")
        }.onFailure {
            Log.w(TAG, "Failed to unregister push token", it)
        }
    }

    suspend fun handleNewToken(context: Context, token: String) {
        if (!BuildConfig.FIREBASE_ENABLED || token.isBlank()) return
        val app = context.applicationContext as? EcmsTruckerApp ?: return
        sync(context, app.container.api)
    }

    private fun deviceName(): String {
        val manufacturer = Build.MANUFACTURER?.trim().orEmpty()
        val model = Build.MODEL?.trim().orEmpty()
        return listOf(manufacturer, model)
            .filter { it.isNotBlank() }
            .joinToString(" ")
            .ifBlank { "Android device" }
    }

    private fun saveLocalToken(context: Context, token: String) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_TOKEN, token)
            .apply()
    }

    private fun loadLocalToken(context: Context): String? =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_TOKEN, null)

    private fun clearLocalToken(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .remove(KEY_TOKEN)
            .apply()
    }
}
