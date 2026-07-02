package com.ecms.trucker.ui.screens

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
import com.ecms.trucker.data.model.*
import com.ecms.trucker.data.repository.TruckerRepository
import com.ecms.trucker.ui.components.*
import com.ecms.trucker.ui.navigation.Routes
import com.ecms.trucker.ui.theme.IcsColors
import kotlinx.coroutines.async
import kotlinx.coroutines.launch

private data class ReturnsListCacheEntry(
    val items: List<ScheduleDto>,
    val updatedAtMs: Long,
)

private const val RETURNS_LIST_CACHE_TTL_MS = 60_000L
private var ReturnsListCache: ReturnsListCacheEntry? = null

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReturnsListScreen(
    repository: TruckerRepository,
    onOpenNotifications: () -> Unit,
    onItemClick: (Int) -> Unit,
) {
    val cachedSchedules = ReturnsListCache
        ?.takeIf { System.currentTimeMillis() - it.updatedAtMs <= RETURNS_LIST_CACHE_TTL_MS }
        ?.items
        ?: emptyList()
    var schedules by remember { mutableStateOf(cachedSchedules) }
    var loading by remember { mutableStateOf(cachedSchedules.isEmpty()) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun load(force: Boolean = false) {
        scope.launch {
            if (schedules.isEmpty()) loading = true
            if (!force) {
                ReturnsListCache
                    ?.takeIf { System.currentTimeMillis() - it.updatedAtMs <= RETURNS_LIST_CACHE_TTL_MS }
                    ?.let { entry ->
                        schedules = entry.items
                        loading = false
                        return@launch
                    }
            }
            runCatching { repository.listSchedules() }
                .onSuccess {
                    schedules = it
                    ReturnsListCache = ReturnsListCacheEntry(
                        items = it,
                        updatedAtMs = System.currentTimeMillis(),
                    )
                }
                .onFailure { error = it.message }
            loading = false
        }
    }
    LaunchedEffect(Unit) { load(force = cachedSchedules.isEmpty()) }

    IcsScreenScaffold(
        title = stringResource(R.string.returns_title),
        branded = true,
        onNotificationClick = onOpenNotifications,
        refreshing = loading,
        onRefresh = { load(force = true) },
    ) { padding ->
        when {
            loading -> LoadingBox(Modifier.padding(padding))
            error != null -> ErrorMessage(error!!, { load() }, Modifier.padding(padding))
            schedules.isEmpty() -> EmptyState(stringResource(R.string.returns_empty), Modifier.padding(padding))
            else -> LazyColumn(Modifier.padding(padding), contentPadding = PaddingValues(vertical = 8.dp)) {
                items(schedules) { s ->
                    IcsListItemCard(
                        title = s.referenceNo,
                        subtitle = stringResource(R.string.returns_subtitle, s.depotName, s.date, s.time, s.slotNo),
                        status = s.status,
                        onClick = { onItemClick(s.id) },
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReturnDetailScreen(
    scheduleId: Int,
    repository: TruckerRepository,
    onBack: () -> Unit,
    onUploadPayment: (Int) -> Unit,
    onViewQr: (Int) -> Unit,
) {
    var schedule by remember { mutableStateOf<ScheduleDto?>(null) }
    var preAdvice by remember { mutableStateOf<PreAdviceDto?>(null) }
    var payment by remember { mutableStateOf<PaymentDto?>(null) }
    var qr by remember { mutableStateOf<QrBookingDto?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun load() {
        scope.launch {
            loading = true
            runCatching {
                schedule = repository.getSchedule(scheduleId)
                val s = schedule!!
                val preAdviceDeferred = async { repository.getPreAdvice(s.preAdviceId) }
                val paymentDeferred = async { repository.getPaymentBySchedule(scheduleId) }
                val qrDeferred = async { runCatching { repository.getQrBySchedule(scheduleId) }.getOrNull() }
                preAdvice = preAdviceDeferred.await()
                payment = paymentDeferred.await()
                qr = qrDeferred.await()
            }.onFailure { error = it.message }
            loading = false
        }
    }
    LaunchedEffect(scheduleId) { load() }

    IcsScreenScaffold(
        title = stringResource(R.string.return_detail_title),
        onBack = onBack,
        refreshing = loading,
        onRefresh = { load() },
    ) { padding ->
        when {
            loading -> LoadingBox(Modifier.padding(padding))
            error != null && schedule == null -> ErrorMessage(error!!, { load() }, Modifier.padding(padding))
            schedule != null -> {
                val s = schedule!!
                IcsDetailScaffoldContent(Modifier.padding(padding)) {
                    item {
                        IcsDetailHeader(referenceNo = s.referenceNo, status = s.status)
                    }
                    item {
                        IcsSectionCard(title = stringResource(R.string.section_schedule)) {
                            IcsInfoTileGrid(
                                tiles = listOf(
                                    stringResource(R.string.field_depot) to s.depotName,
                                    stringResource(R.string.field_date) to s.date,
                                    stringResource(R.string.field_time) to s.time,
                                    stringResource(R.string.field_slot) to s.slotNo.toString(),
                                ),
                            )
                        }
                    }
                    preAdvice?.let { p ->
                        item {
                            IcsSectionCard(title = stringResource(R.string.section_preforecast)) {
                                IcsInfoTileGrid(
                                    tiles = buildList {
                                        add(stringResource(R.string.field_reference) to p.referenceNo)
                                        add(stringResource(R.string.field_container) to p.containerNo)
                                        add(stringResource(R.string.field_size_type) to "${p.containerSize} / ${p.containerType}")
                                        add(stringResource(R.string.field_shipping_line) to p.shippingLineName)
                                        add(stringResource(R.string.field_status) to p.status)
                                        p.demurrageValidUntil?.let { add(stringResource(R.string.field_demurrage_valid_until) to it) }
                                    },
                                )
                            }
                        }
                    }
                    item {
                        IcsSectionCard(title = stringResource(R.string.section_payment)) {
                            if (payment != null) {
                                IcsInfoTileGrid(
                                    tiles = listOf(
                                        stringResource(R.string.field_status) to payment!!.status,
                                        stringResource(R.string.field_amount) to "\u20B1${payment!!.amount}",
                                    ),
                                )
                            } else {
                                Text(
                                    stringResource(R.string.payment_not_uploaded_yet),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = IcsColors.TextSecondary,
                                )
                            }
                            if (payment == null || payment!!.status.equals("Pending", true) ||
                                payment!!.status.equals("Rejected", true)
                            ) {
                                Spacer(Modifier.height(12.dp))
                                IcsPrimaryButton(
                                    text = stringResource(R.string.payment_upload_title),
                                    onClick = { onUploadPayment(scheduleId) },
                                )
                            }
                        }
                    }
                    qr?.let { q ->
                        item {
                            IcsSectionCard(title = stringResource(R.string.section_qr_booking)) {
                                IcsInfoTileGrid(
                                    tiles = listOf(
                                        stringResource(R.string.field_qr_code) to q.qrCode,
                                        stringResource(R.string.field_logicteck) to q.logicteckStatus,
                                    ),
                                )
                                Spacer(Modifier.height(12.dp))
                                OutlinedButton(
                                    onClick = { onViewQr(q.id) },
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Text(stringResource(R.string.action_view_qr_pass))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
