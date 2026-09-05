package com.ecms.trucker.ui.screens

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.platform.LocalContext
import com.ecms.trucker.EcmsTruckerApp
import com.ecms.trucker.R
import com.ecms.trucker.data.local.AuthState
import com.ecms.trucker.ui.util.FileShareHelper
import com.ecms.trucker.data.model.QrBookingDto
import com.ecms.trucker.data.model.ScheduleDto
import com.ecms.trucker.data.repository.TruckerRepository
import com.ecms.trucker.ui.components.*
import com.ecms.trucker.ui.util.rememberScreenLoadState
import com.ecms.trucker.util.primaryContainerLabel
import com.ecms.trucker.util.referenceWithMeta
import com.ecms.trucker.util.QrCodeGenerator
import kotlinx.coroutines.async
import kotlinx.coroutines.launch

private data class QrListCacheEntry(
    val schedules: List<ScheduleDto>,
    val qrMap: Map<Int, QrBookingDto>,
    val updatedAtMs: Long,
)

private const val QR_LIST_CACHE_TTL_MS = 60_000L
private var QrListCache: QrListCacheEntry? = null

internal fun clearQrScreenCache() {
    QrListCache = null
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QrListScreen(
    repository: TruckerRepository,
    onItemClick: (Int) -> Unit,
    onBack: (() -> Unit)? = null,
) {
    val cached = QrListCache
        ?.takeIf { System.currentTimeMillis() - it.updatedAtMs <= QR_LIST_CACHE_TTL_MS }
    val loadState = rememberScreenLoadState(initiallyLoading = cached == null)
    var schedules by remember { mutableStateOf(cached?.schedules ?: emptyList()) }
    var qrMap by remember { mutableStateOf(cached?.qrMap ?: emptyMap()) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun load(force: Boolean = false) {
        scope.launch {
            loadState.begin(schedules.isNotEmpty())
            if (!force) {
                QrListCache
                    ?.takeIf { System.currentTimeMillis() - it.updatedAtMs <= QR_LIST_CACHE_TTL_MS }
                    ?.let { entry ->
                        schedules = entry.schedules
                        qrMap = entry.qrMap
                        loadState.end()
                    }
            }
            runCatching {
                val filtered = repository.listSchedules().filter {
                    it.status.equals("Confirmed", true) || it.status.equals("Completed", true)
                }
                schedules = filtered
                qrMap = filtered.map { s ->
                    async {
                        runCatching { repository.getQrBySchedule(s.id) }.getOrNull()?.let { s.id to it }
                    }
                }.mapNotNull { it.await() }.toMap()
                QrListCache = QrListCacheEntry(
                    schedules = schedules,
                    qrMap = qrMap,
                    updatedAtMs = System.currentTimeMillis(),
                )
            }.onFailure { error = it.message }
            loadState.end()
        }
    }
    LaunchedEffect(Unit) { load(force = cached == null) }

    IcsScreenScaffold(
        title = stringResource(R.string.qr_passes_title),
        onBack = onBack,
        refreshing = loadState.refreshing,
        onRefresh = { load(force = true) },
    ) { padding ->
        when {
            loadState.loading -> LoadingBox(Modifier.padding(padding))
            error != null -> ErrorMessage(error!!, { load() }, Modifier.padding(padding))
            schedules.isEmpty() -> EmptyState(stringResource(R.string.qr_empty), Modifier.padding(padding))
            else -> LazyColumn(Modifier.padding(padding), contentPadding = PaddingValues(vertical = 8.dp)) {
                item {
                    IcsScreenTip(stringResource(R.string.ui_tip_qr_list))
                }
                items(schedules) { s ->
                    val qr = qrMap[s.id]
                    IcsListItemCard(
                        title = primaryContainerLabel(qr?.payload?.containerNo, s.referenceNo),
                        subtitle = if (qr != null) {
                            referenceWithMeta(s.referenceNo, qr.qrCode)
                        } else {
                            stringResource(R.string.qr_awaiting_payment_verification)
                        },
                        status = s.status,
                        onClick = { qr?.let { onItemClick(it.id) } },
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QrDetailScreen(
    bookingId: Int,
    repository: TruckerRepository,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val app = context.applicationContext as EcmsTruckerApp
    val authState by app.container.tokenStore.authState.collectAsState(initial = AuthState())
    val accessToken = authState.accessToken

    val loadState = rememberScreenLoadState(initiallyLoading = true)
    var qr by remember { mutableStateOf<QrBookingDto?>(null) }
    var bitmap by remember { mutableStateOf<Bitmap?>(null) }
    var booking by remember { mutableStateOf(false) }
    var downloading by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun downloadQr(share: Boolean) {
        val q = qr ?: return
        scope.launch {
            downloading = true
            runCatching {
                val file = FileShareHelper.downloadQrImage(context, q.id, q.qrCode, accessToken)
                if (share) {
                    FileShareHelper.shareFile(context, file, "image/png", context.getString(R.string.qr_action_share_image))
                } else {
                    FileShareHelper.openFile(context, file, "image/png")
                }
            }.onFailure { error = it.message }
            downloading = false
        }
    }

    fun downloadPdf(share: Boolean) {
        val q = qr ?: return
        scope.launch {
            downloading = true
            runCatching {
                val file = FileShareHelper.downloadConfirmationPdf(context, q.id, q.qrCode, accessToken)
                if (share) {
                    FileShareHelper.shareFile(context, file, "application/pdf", context.getString(R.string.qr_action_share_pdf))
                } else {
                    FileShareHelper.openFile(context, file, "application/pdf")
                }
            }.onFailure { error = it.message }
            downloading = false
        }
    }

    fun load() {
        scope.launch {
            loadState.begin(qr != null)
            runCatching {
                qr = repository.getQrBooking(bookingId)
                bitmap = QrCodeGenerator.generate(qr!!.qrCode, 512)
            }.onFailure { error = it.message }
            loadState.end()
        }
    }
    LaunchedEffect(bookingId) { load() }

    IcsScreenScaffold(
        title = stringResource(R.string.qr_pass_title),
        onBack = onBack,
        refreshing = loadState.refreshing,
        onRefresh = { load() },
    ) { padding ->
        when {
            loadState.loading && qr == null -> LoadingBox(Modifier.padding(padding))
            error != null -> ErrorMessage(error!!, modifier = Modifier.padding(padding))
            qr != null -> {
                val q = qr!!
                Column(
                    Modifier
                        .padding(padding)
                        .padding(16.dp)
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState()),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    bitmap?.let { Image(it.asImageBitmap(), contentDescription = stringResource(R.string.qr_image_desc), modifier = Modifier.size(240.dp)) }
                    Text(q.qrCode, style = MaterialTheme.typography.titleMedium)
                    DetailRow(stringResource(R.string.field_container), q.payload.containerNo)
                    DetailRow(stringResource(R.string.field_depot), q.payload.depot)
                    DetailRow(stringResource(R.string.field_schedule), "${q.payload.scheduleDate} ${q.payload.scheduleTime}")
                    DetailRow(stringResource(R.string.field_logicteck), q.logicteckStatus)
                    message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
                    QrDownloadActions(
                        downloading = downloading,
                        onDownloadQr = { downloadQr(share = false) },
                        onDownloadPdf = { downloadPdf(share = false) },
                        onShareQr = { downloadQr(share = true) },
                        onSharePdf = { downloadPdf(share = true) },
                        showLogicteck = !q.logicteckStatus.equals("Booked", true),
                        logicteckBooking = booking,
                        onBookLogicteck = {
                            booking = true
                            scope.launch {
                                runCatching { repository.bookLogicteck(bookingId) }
                                    .onSuccess { message = it.message; qr = it.booking ?: qr; bitmap = qr?.let { QrCodeGenerator.generate(it.qrCode, 512) } }
                                    .onFailure { error = it.message }
                                booking = false
                            }
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.labelMedium)
        Text(value, style = MaterialTheme.typography.bodyMedium)
    }
}
