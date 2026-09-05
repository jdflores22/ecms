package com.ecms.trucker.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private val Context.withdrawalDraftDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "withdrawal_wizard_draft",
)

@Serializable
data class WithdrawalLineDraft(
    val containerNo: String = "",
    val containerSizeId: Int = 0,
    val containerTypeId: Int = 0,
)

@Serializable
data class WithdrawalWizardDraft(
    val plateNumber: String = "",
    val driverName: String = "",
    val purpose: String = "Repositioning",
    val atwNumber: String = "",
    val shippingLineId: Int = 0,
    val destination: String = "",
    val issueDate: String = "",
    val expirationDate: String = "",
    val remarks: String = "",
    val lines: List<WithdrawalLineDraft> = listOf(WithdrawalLineDraft()),
)

class WithdrawalDraftStore(context: Context) {
    private val appContext = context.applicationContext
    private val json = Json { ignoreUnknownKeys = true }
    private val draftKey = stringPreferencesKey("draft_json")

    suspend fun load(): WithdrawalWizardDraft? {
        val raw = appContext.withdrawalDraftDataStore.data.first()[draftKey] ?: return null
        return runCatching { json.decodeFromString<WithdrawalWizardDraft>(raw) }.getOrNull()
    }

    suspend fun save(draft: WithdrawalWizardDraft) {
        appContext.withdrawalDraftDataStore.edit { prefs ->
            prefs[draftKey] = json.encodeToString(draft)
        }
    }

    suspend fun clear() {
        appContext.withdrawalDraftDataStore.edit { it.remove(draftKey) }
    }

    suspend fun hasDraft(): Boolean = appContext.withdrawalDraftDataStore.data
        .map { !it[draftKey].isNullOrBlank() }
        .first()
}
