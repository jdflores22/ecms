package com.ecms.trucker.ui.screens

import android.graphics.Bitmap
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.ecms.trucker.EcmsTruckerApp
import com.ecms.trucker.R
import com.ecms.trucker.data.local.AuthState
import com.ecms.trucker.data.model.*
import com.ecms.trucker.data.repository.TruckerRepository
import com.ecms.trucker.ui.components.*
import com.ecms.trucker.ui.theme.IcsColors
import com.ecms.trucker.ui.util.FileShareHelper
import com.ecms.trucker.ui.util.isWaitingSchedule
import com.ecms.trucker.ui.util.scheduleListSubtitle
import com.ecms.trucker.ui.util.rememberScreenLoadState
import com.ecms.trucker.util.QrCodeGenerator
import com.ecms.trucker.util.containerHeadline
import com.ecms.trucker.util.containerListSubtitle
import com.ecms.trucker.util.preAdviceContainerById
import kotlinx.coroutines.launch

private data class ReturnsListCacheEntry(
    val items: List<ScheduleDto>,
    val containerByPreAdviceId: Map<Int, String>,
    val updatedAtMs: Long,
)

private const val RETURNS_LIST_CACHE_TTL_MS = 60_000L
private var ReturnsListCache: ReturnsListCacheEntry? = null

internal fun clearReturnsScreenCache() {
    ReturnsListCache = null
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReturnsListScreen(
    repository: TruckerRepository,
    onOpenNotifications: () -> Unit,
    notificationUnreadCount: Int = 0,
    onItemClick: (Int) -> Unit,
) {
    val cachedSchedules = ReturnsListCache
        ?.takeIf { System.currentTimeMillis() - it.updatedAtMs <= RETURNS_LIST_CACHE_TTL_MS }
        ?.items
        ?: emptyList()
    val loadState = rememberScreenLoadState(initiallyLoading = cachedSchedules.isEmpty())
    var schedules by remember { mutableStateOf(cachedSchedules) }
    var containerByPreAdviceId by remember {
        mutableStateOf(
            ReturnsListCache
                ?.takeIf { System.currentTimeMillis() - it.updatedAtMs <= RETURNS_LIST_CACHE_TTL_MS }
                ?.containerByPreAdviceId
                ?: emptyMap(),
        )
    }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun load(force: Boolean = false) {
        scope.launch {
            loadState.begin(schedules.isNotEmpty())
            if (!force) {
                ReturnsListCache
                    ?.takeIf { System.currentTimeMillis() - it.updatedAtMs <= RETURNS_LIST_CACHE_TTL_MS }
                    ?.let { entry ->
                        schedules = entry.items
                        containerByPreAdviceId = entry.containerByPreAdviceId
                        loadState.end()
                        return@launch
                    }
            }
            runCatching {
                val list = repository.listSchedules()
                val containers = repository.preAdviceContainerById()
                schedules = list
                containerByPreAdviceId = containers
                ReturnsListCache = ReturnsListCacheEntry(
                    items = list,
                    containerByPreAdviceId = containers,
                    updatedAtMs = System.currentTimeMillis(),
                )
            }
                .onFailure { error = it.message }
            loadState.end()
        }
    }
    LaunchedEffect(Unit) { load(force = cachedSchedules.isEmpty()) }

    IcsScreenScaffold(
        title = stringResource(R.string.returns_title),
        branded = true,
        onNotificationClick = onOpenNotifications,
        notificationUnreadCount = notificationUnreadCount,
        refreshing = loadState.refreshing,
        onRefresh = { load(force = true) },
    ) { padding ->
        when {
            loadState.loading -> LoadingBox(Modifier.padding(padding))
            error != null -> ErrorMessage(error!!, { load() }, Modifier.padding(padding))
            schedules.isEmpty() -> EmptyState(stringResource(R.string.returns_empty), Modifier.padding(padding))
            else -> LazyColumn(Modifier.padding(padding), contentPadding = PaddingValues(vertical = 8.dp)) {
                item {
                    IcsScreenTip(stringResource(R.string.ui_tip_returns_list))
                }
                items(schedules, key = { it.id }) { s ->
                    val meta = scheduleListSubtitle(s.depotName, s.date, s.time, s.slotNo, s.status)
                    IcsListItemCard(
                        title = s.containerHeadline(containerByPreAdviceId),
                        subtitle = s.containerListSubtitle(containerByPreAdviceId, meta),
                        status = s.status,
                        onClick = { onItemClick(s.id) },
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun ReturnDetailScreen(
    scheduleId: Int,
    repository: TruckerRepository,
    onBack: () -> Unit,
    onUploadPayment: (Int) -> Unit,
    onViewQr: (Int) -> Unit,
) {
    val context = LocalContext.current
    val app = context.applicationContext as EcmsTruckerApp
    val authState by app.container.tokenStore.authState.collectAsState(initial = AuthState())
    val accessToken = authState.accessToken

    val loadState = rememberScreenLoadState(initiallyLoading = true)
    var schedule by remember { mutableStateOf<ScheduleDto?>(null) }
    var preAdvice by remember { mutableStateOf<PreAdviceDto?>(null) }
    var payment by remember { mutableStateOf<PaymentDto?>(null) }
    var qr by remember { mutableStateOf<QrBookingDto?>(null) }
    var documents by remember { mutableStateOf<List<PreAdviceDocumentDto>>(emptyList()) }
    var qrBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var qrLoading by remember { mutableStateOf(false) }
    var downloading by remember { mutableStateOf(false) }
    var logicteckBooking by remember { mutableStateOf(false) }
    var logicteckMessage by remember { mutableStateOf<String?>(null) }
    var selectedTab by remember { mutableStateOf(ReturnDetailTab.Details) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    val requiredPhotoCategories = remember {
        listOf("Flooring", "RightSideIn", "LeftSideIn", "Back", "Backdoor", "Front", "LeftSideOut", "RightSideOut")
    }
    val uploadedRequired = documents.count { doc ->
        requiredPhotoCategories.any { it.equals(doc.category, true) }
    }
    val photosTotal = requiredPhotoCategories.size

    fun loadQr() {
        scope.launch {
            qrLoading = true
            qr = runCatching { repository.getQrBySchedule(scheduleId) }.getOrNull()
            qrBitmap = qr?.let { QrCodeGenerator.generate(it.qrCode, 512) }
            qrLoading = false
        }
    }

    fun load() {
        scope.launch {
            loadState.begin(schedule != null)
            error = null
            preAdvice = null
            payment = null
            qr = null
            documents = emptyList()

            val loadedSchedule = runCatching { repository.getSchedule(scheduleId) }
                .onFailure { error = it.message }
                .getOrNull()

            schedule = loadedSchedule
            if (loadedSchedule == null) {
                loadState.end()
                return@launch
            }

            preAdvice = repository.getPreAdviceOrNull(loadedSchedule.preAdviceId)
            payment = repository.getPaymentBySchedule(scheduleId)
            preAdvice?.let { p ->
                documents = runCatching { repository.getPreAdviceDocuments(p.id) }.getOrDefault(emptyList())
            }
            loadQr()
            loadState.end()
        }
    }
    LaunchedEffect(scheduleId) { load() }

    val tabs = listOf(ReturnDetailTab.Details, ReturnDetailTab.Photos, ReturnDetailTab.Payment, ReturnDetailTab.Qr)
    val activeTab = selectedTab

    fun downloadAndShareQr(share: Boolean) {
        val booking = qr ?: return
        scope.launch {
            downloading = true
            runCatching {
                val file = FileShareHelper.downloadQrImage(context, booking.id, booking.qrCode, accessToken)
                if (share) {
                    FileShareHelper.shareFile(context, file, "image/png", context.getString(R.string.qr_action_share_image))
                } else {
                    FileShareHelper.openFile(context, file, "image/png")
                }
            }.onFailure { error = it.message }
            downloading = false
        }
    }

    fun downloadAndSharePdf(share: Boolean) {
        val booking = qr ?: return
        scope.launch {
            downloading = true
            runCatching {
                val file = FileShareHelper.downloadConfirmationPdf(context, booking.id, booking.qrCode, accessToken)
                if (share) {
                    FileShareHelper.shareFile(context, file, "application/pdf", context.getString(R.string.qr_action_share_pdf))
                } else {
                    FileShareHelper.openFile(context, file, "application/pdf")
                }
            }.onFailure { error = it.message }
            downloading = false
        }
    }

    IcsScreenScaffold(
        title = stringResource(R.string.return_detail_title),
        onBack = onBack,
        refreshing = loadState.refreshing,
        onRefresh = { load() },
    ) { padding ->
        when {
            loadState.loading && schedule == null -> LoadingBox(Modifier.padding(padding))
            error != null && schedule == null -> ErrorMessage(error!!, { load() }, Modifier.padding(padding))
            schedule != null -> {
                val s = schedule!!
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentPadding = PaddingValues(bottom = 24.dp),
                ) {
                    item(key = "header") {
                        IcsDetailHeader(
                            referenceNo = s.referenceNo,
                            containerNo = preAdvice?.containerNo,
                            status = s.status,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                            belowStatus = {
                                PhotoProgressChip(uploaded = uploadedRequired, total = photosTotal)
                            },
                        )
                    }
                    stickyHeader {
                        Surface(color = IcsColors.Background) {
                            ScrollableTabRow(
                                selectedTabIndex = tabs.indexOf(activeTab).coerceAtLeast(0),
                                edgePadding = 8.dp,
                            ) {
                                tabs.forEach { tab ->
                                    Tab(
                                        selected = activeTab == tab,
                                        onClick = { selectedTab = tab },
                                        text = {
                                            Text(
                                                returnDetailTabLabel(
                                                    tab,
                                                    if (tab == ReturnDetailTab.Photos) uploadedRequired else null,
                                                    if (tab == ReturnDetailTab.Photos) photosTotal else null,
                                                ),
                                            )
                                        },
                                    )
                                }
                            }
                        }
                    }
                    item(key = "tab-${activeTab.name}") {
                        when (activeTab) {
                            ReturnDetailTab.Details -> ReturnDetailsTabContent(schedule = s, preAdvice = preAdvice)
                            ReturnDetailTab.Photos -> ReturnPhotosTabContent(
                                documents = documents,
                                uploadedRequired = uploadedRequired,
                                photosTotal = photosTotal,
                                accessToken = accessToken,
                            )
                            ReturnDetailTab.Payment -> ReturnPaymentTabContent(
                                schedule = s,
                                payment = payment,
                                onUploadPayment = { onUploadPayment(scheduleId) },
                            )
                            ReturnDetailTab.Qr -> ReturnQrTabContent(
                                schedule = s,
                                payment = payment,
                                qr = qr,
                                bitmap = qrBitmap,
                                qrLoading = qrLoading,
                                downloading = downloading,
                                logicteckBooking = logicteckBooking,
                                logicteckMessage = logicteckMessage,
                                accessToken = accessToken,
                                onDownloadQr = { downloadAndShareQr(share = false) },
                                onDownloadPdf = { downloadAndSharePdf(share = false) },
                                onShareQr = { downloadAndShareQr(share = true) },
                                onSharePdf = { downloadAndSharePdf(share = true) },
                                onBookLogicteck = {
                                    val bookingId = qr?.id ?: return@ReturnQrTabContent
                                    scope.launch {
                                        logicteckBooking = true
                                        runCatching { repository.bookLogicteck(bookingId) }
                                            .onSuccess {
                                                logicteckMessage = it.message
                                                qr = it.booking ?: qr
                                                qrBitmap = qr?.let { current -> QrCodeGenerator.generate(current.qrCode, 512) }
                                            }
                                            .onFailure { error = it.message }
                                        logicteckBooking = false
                                    }
                                },
                                onViewQrPass = { qr?.id?.let(onViewQr) },
                            )
                        }
                    }
                }
            }
        }
    }
}
