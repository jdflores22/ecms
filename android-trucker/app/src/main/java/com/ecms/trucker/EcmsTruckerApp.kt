package com.ecms.trucker

import android.app.Application
import com.ecms.trucker.data.api.NetworkModule
import com.ecms.trucker.data.local.TokenStore
import com.ecms.trucker.data.repository.AuthRepository
import com.ecms.trucker.data.repository.TruckerRepository

class EcmsTruckerApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, error ->
            android.util.Log.e("EcmsTruckerApp", "Uncaught crash on ${thread.name}", error)
            defaultHandler?.uncaughtException(thread, error)
        }
        container = AppContainer(this)
    }
}

class AppContainer(app: Application) {
    val tokenStore = TokenStore(app)
    private val network = NetworkModule.create(tokenStore, BuildConfig.API_BASE_URL)
    val api = network.api
    val authRepository = AuthRepository(api, tokenStore, network.authInterceptor)
    val truckerRepository = TruckerRepository(api, app)
}
