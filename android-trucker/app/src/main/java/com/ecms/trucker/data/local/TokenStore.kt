package com.ecms.trucker.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.ecms.trucker.data.model.UserDto
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "ecms_auth")

class TokenStore(private val context: Context) {
    private val json = Json { ignoreUnknownKeys = true }

    private val accessTokenKey = stringPreferencesKey("access_token")
    private val refreshTokenKey = stringPreferencesKey("refresh_token")
    private val userKey = stringPreferencesKey("user")

    val authState: Flow<AuthState> = context.dataStore.data
        .map { prefs -> readAuthState(prefs) }
        .catch {
            emit(AuthState())
        }

    suspend fun getAccessToken(): String? = context.dataStore.data.first()[accessTokenKey]

    suspend fun getRefreshToken(): String? = context.dataStore.data.first()[refreshTokenKey]

    suspend fun saveAuth(accessToken: String, refreshToken: String, user: UserDto) {
        context.dataStore.edit { prefs ->
            prefs[accessTokenKey] = accessToken
            prefs[refreshTokenKey] = refreshToken
            prefs[userKey] = json.encodeToString(user)
        }
    }

    suspend fun updateUser(user: UserDto) {
        context.dataStore.edit { prefs ->
            prefs[userKey] = json.encodeToString(user)
        }
    }

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }

    suspend fun repairCorruptSession() {
        val prefs = context.dataStore.data.first()
        val hasToken = !prefs[accessTokenKey].isNullOrBlank() || !prefs[refreshTokenKey].isNullOrBlank()
        val userValid = prefs[userKey]?.let { raw ->
            runCatching { json.decodeFromString<UserDto>(raw) }.isSuccess
        } == true
        if (hasToken && !userValid) {
            clear()
        }
    }

    private fun readAuthState(prefs: Preferences): AuthState {
        val accessToken = prefs[accessTokenKey]
        val refreshToken = prefs[refreshTokenKey]
        val user = prefs[userKey]?.let { raw ->
            runCatching { json.decodeFromString<UserDto>(raw) }.getOrNull()
        }
        if ((!accessToken.isNullOrBlank() || !refreshToken.isNullOrBlank()) && user == null) {
            return AuthState()
        }
        return AuthState(
            accessToken = accessToken,
            refreshToken = refreshToken,
            user = user,
        )
    }
}

data class AuthState(
    val accessToken: String? = null,
    val refreshToken: String? = null,
    val user: UserDto? = null,
) {
    val isLoggedIn: Boolean get() = !accessToken.isNullOrBlank() && user != null
}
