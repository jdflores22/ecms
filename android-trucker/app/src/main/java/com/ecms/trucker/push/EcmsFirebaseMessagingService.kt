package com.ecms.trucker.push

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class EcmsFirebaseMessagingService : FirebaseMessagingService() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onMessageReceived(message: RemoteMessage) {
        val title = message.notification?.title
            ?: message.data["title"]
            ?: return
        val body = message.notification?.body
            ?: message.data["message"]
            ?: return

        PushNotificationManager.showNotification(
            context = applicationContext,
            title = title,
            body = body,
            category = message.data["category"],
            linkPath = message.data["linkPath"],
        )
    }

    override fun onNewToken(token: String) {
        scope.launch {
            runCatching {
                PushTokenRegistrar.handleNewToken(applicationContext, token)
            }.onFailure {
                Log.w(TAG, "Failed to sync refreshed FCM token", it)
            }
        }
    }

    companion object {
        private const val TAG = "EcmsFcmService"
    }
}
