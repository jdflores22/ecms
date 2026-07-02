package com.ecms.trucker.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.ecms.trucker.R
import com.ecms.trucker.data.model.PaymentDto
import com.ecms.trucker.data.model.ScheduleDto
import com.ecms.trucker.data.repository.TruckerRepository
import com.ecms.trucker.ui.components.*
import kotlinx.coroutines.async
import kotlinx.coroutines.launch

private data class PaymentsCacheEntry(
    val payments: List<PaymentDto>,
    val schedules: List<ScheduleDto>,
    val fee: Double,
    val updatedAtMs: Long,
)

private const val PAYMENTS_CACHE_TTL_MS = 60_000L
private var PaymentsCache: PaymentsCacheEntry? = null

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentsListScreen(
    repository: TruckerRepository,
    onOpenNotifications: () -> Unit,
    onUploadClick: (Int) -> Unit,
) {
    val cached = PaymentsCache
        ?.takeIf { System.currentTimeMillis() - it.updatedAtMs <= PAYMENTS_CACHE_TTL_MS }
    var payments by remember { mutableStateOf(cached?.payments ?: emptyList()) }
    var schedules by remember { mutableStateOf(cached?.schedules ?: emptyList()) }
    var fee by remember { mutableStateOf(cached?.fee ?: 0.0) }
    var loading by remember { mutableStateOf(cached == null) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun load(force: Boolean = false) {
        scope.launch {
            if (payments.isEmpty() && schedules.isEmpty()) loading = true
            if (!force) {
                PaymentsCache
                    ?.takeIf { System.currentTimeMillis() - it.updatedAtMs <= PAYMENTS_CACHE_TTL_MS }
                    ?.let { entry ->
                        payments = entry.payments
                        schedules = entry.schedules
                        fee = entry.fee
                        loading = false
                        return@launch
                    }
            }
            runCatching {
                val paymentsDeferred = async { repository.getMyPayments() }
                val schedulesDeferred = async { repository.listSchedules() }
                val settingsDeferred = async { repository.getPaymentSettings() }
                payments = paymentsDeferred.await()
                schedules = schedulesDeferred.await()
                fee = settingsDeferred.await().returnFeeAmount
                PaymentsCache = PaymentsCacheEntry(
                    payments = payments,
                    schedules = schedules,
                    fee = fee,
                    updatedAtMs = System.currentTimeMillis(),
                )
            }.onFailure { error = it.message }
            loading = false
        }
    }
    LaunchedEffect(Unit) { load(force = cached == null) }

    val needsUpload = schedules.filter { s ->
        s.status.equals("Scheduled", true) || s.status.equals("Confirmed", true)
    }.filter { s ->
        val pay = payments.find { it.scheduleId == s.id }
        pay == null || pay.status.equals("Pending", true) || pay.status.equals("Rejected", true)
    }
    val currencySymbol = "\u20B1"

    IcsScreenScaffold(
        title = stringResource(R.string.payments_title),
        branded = true,
        onNotificationClick = onOpenNotifications,
        refreshing = loading,
        onRefresh = { load(force = true) },
    ) { padding ->
        when {
            loading -> LoadingBox(Modifier.padding(padding))
            error != null -> ErrorMessage(error!!, { load() }, Modifier.padding(padding))
            else -> LazyColumn(Modifier.padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                item {
                    Text(
                        stringResource(R.string.payments_return_fee, "$currencySymbol$fee"),
                        style = MaterialTheme.typography.titleMedium,
                    )
                }
                if (needsUpload.isEmpty() && payments.isEmpty()) {
                    item { Text(stringResource(R.string.payments_no_actions)) }
                }
                items(needsUpload) { s ->
                    Card(Modifier.fillMaxWidth().clickable { onUploadClick(s.id) }) {
                        Column(Modifier.padding(16.dp)) {
                            Text(s.referenceNo, style = MaterialTheme.typography.titleSmall)
                            Text("${s.depotName} · ${s.date}")
                            Text(stringResource(R.string.payments_upload_hint), style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
                if (payments.isNotEmpty()) {
                    item { Text(stringResource(R.string.payments_history_title), style = MaterialTheme.typography.titleMedium) }
                    items(payments) { p ->
                        Card(Modifier.fillMaxWidth()) {
                            Row(
                                Modifier.padding(16.dp).fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Column {
                                    Text(stringResource(R.string.payments_schedule_number, p.scheduleId))
                                    Text("$currencySymbol${p.amount}")
                                }
                                StatusChip(p.status)
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentUploadScreen(
    scheduleId: Int,
    repository: TruckerRepository,
    onBack: () -> Unit,
    onUploaded: () -> Unit,
) {
    var referenceNo by remember { mutableStateOf("") }
    var transactionAt by remember { mutableStateOf("") }
    var selectedUri by remember { mutableStateOf<Uri?>(null) }
    var uploading by remember { mutableStateOf(false) }
    var refreshing by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }
    val refreshMessage = stringResource(R.string.refresh_feedback_payment_form_reset)

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        selectedUri = uri
    }

    fun resetUploadForm() {
        refreshing = true
        selectedUri = null
        referenceNo = ""
        transactionAt = ""
        error = null
        refreshing = false
        scope.launch { snackbarHostState.showSnackbar(refreshMessage) }
    }

    IcsScreenScaffold(
        title = stringResource(R.string.payment_upload_title),
        onBack = onBack,
        refreshing = refreshing,
        onRefresh = { resetUploadForm() },
        showRefreshFeedback = false,
        snackbarHost = { _ -> SnackbarHost(hostState = snackbarHostState) },
    ) { padding ->
        Column(
            Modifier.padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(stringResource(R.string.payment_upload_schedule, scheduleId))
            OutlinedButton(onClick = { picker.launch("*/*") }, modifier = Modifier.fillMaxWidth()) {
                Text(selectedUri?.lastPathSegment ?: stringResource(R.string.payment_upload_select_file))
            }
            OutlinedTextField(
                referenceNo, { referenceNo = it },
                label = { Text(stringResource(R.string.payment_upload_reference_optional)) },
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                transactionAt, { transactionAt = it },
                label = { Text(stringResource(R.string.payment_upload_transaction_date_optional)) },
                modifier = Modifier.fillMaxWidth(),
            )
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            Button(
                onClick = {
                    val uri = selectedUri ?: return@Button
                    uploading = true
                    scope.launch {
                        runCatching {
                            repository.uploadPaymentProof(
                                scheduleId, uri,
                                referenceNo.ifBlank { null },
                                transactionAt.ifBlank { null },
                            )
                        }.onSuccess { onUploaded() }
                            .onFailure { error = it.message; uploading = false }
                    }
                },
                enabled = !uploading && selectedUri != null,
                modifier = Modifier.fillMaxWidth(),
            ) { Text(stringResource(R.string.action_upload)) }
        }
    }
}
