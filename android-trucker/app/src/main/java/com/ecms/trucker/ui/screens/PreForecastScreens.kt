package com.ecms.trucker.ui.screens

import android.graphics.Bitmap
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.transformable
import androidx.compose.foundation.gestures.rememberTransformableState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.ReportProblem
import androidx.compose.material.icons.filled.ZoomIn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.ecms.trucker.BuildConfig
import com.ecms.trucker.EcmsTruckerApp
import com.ecms.trucker.R
import com.ecms.trucker.data.local.AuthState
import com.ecms.trucker.data.model.*
import com.ecms.trucker.data.repository.TruckerRepository
import com.ecms.trucker.ui.components.*
import com.ecms.trucker.ui.theme.IcsColors
import com.ecms.trucker.ui.util.FileShareHelper
import com.ecms.trucker.ui.util.rememberScreenLoadState
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.ecms.trucker.ui.components.buildPreForecastProgressSteps
import com.ecms.trucker.ui.components.PreForecastProgressStrip
import com.ecms.trucker.util.getPreAdviceListStatus
import com.ecms.trucker.util.isScheduleForPayment
import com.ecms.trucker.util.logicteckStatusFromPreAdvice
import com.ecms.trucker.util.matchesPreForecastDateFilter
import com.ecms.trucker.util.preAdviceStatusGuidance
import com.ecms.trucker.util.isCroFreeTimeExpired
import com.ecms.trucker.util.listSubtitle
import com.ecms.trucker.util.listTitle
import com.ecms.trucker.util.QrCodeGenerator
import com.ecms.trucker.util.mapCroLineToForm
import com.ecms.trucker.util.croFreeTimeExpiredMessage
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun PreForecastListScreen(
    repository: TruckerRepository,
    onItemClick: (Int) -> Unit,
    onNewClick: () -> Unit,
    onBack: (() -> Unit)? = null,
    onViewQr: ((Int) -> Unit)? = null,
) {
    val cachedItems = PreForecastListCache
        ?.takeIf { System.currentTimeMillis() - it.updatedAtMs <= PREFORECAST_LIST_CACHE_TTL_MS }
        ?.items
        ?: emptyList()
    val loadState = rememberScreenLoadState(initiallyLoading = cachedItems.isEmpty())
    var items by remember { mutableStateOf(cachedItems) }
    var lookups by remember { mutableStateOf<PreAdviceLookupsDto?>(null) }
    var photoProgressById by remember { mutableStateOf<Map<Int, Int>>(emptyMap()) }
    var error by remember { mutableStateOf<String?>(null) }
    var statusFilter by remember { mutableStateOf("All") }
    var shippingLineFilter by remember { mutableIntStateOf(0) }
    var dateFrom by remember { mutableStateOf("") }
    var dateTo by remember { mutableStateOf("") }
    var showFilters by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val filteredItems = remember(items, statusFilter, shippingLineFilter, dateFrom, dateTo) {
        items.filter { item ->
            if (statusFilter != "All" && !item.status.equals(statusFilter, ignoreCase = true)) return@filter false
            if (shippingLineFilter > 0 && item.shippingLineId != shippingLineFilter) return@filter false
            if (!matchesPreForecastDateFilter(item.createdAt, dateFrom, dateTo)) return@filter false
            true
        }
    }
    val hasFilters = statusFilter != "All" || shippingLineFilter > 0 || dateFrom.isNotBlank() || dateTo.isNotBlank()
    val summary = remember(items) {
        PreForecastListSummary(
            total = items.size,
            draft = items.count { it.status.equals("Draft", true) },
            pending = items.count {
                it.status.equals("Submitted", true) ||
                    it.status.equals("UnderEvaluation", true) ||
                    it.status.equals("ForCompliance", true)
            },
            approved = items.count { it.status.equals("Approved", true) },
        )
    }

    fun load(force: Boolean = false) {
        scope.launch {
            loadState.begin(items.isNotEmpty())
            if (!force) {
                PreForecastListCache
                    ?.takeIf { System.currentTimeMillis() - it.updatedAtMs <= PREFORECAST_LIST_CACHE_TTL_MS }
                    ?.let { entry ->
                        items = entry.items
                        loadState.end()
                        return@launch
                    }
            }
            runCatching {
                val list = repository.listPreAdvices()
                items = list
                lookups = runCatching { repository.getPreAdviceLookups() }.getOrNull()
                PreForecastListCache = PreForecastListCacheEntry(
                    items = list,
                    updatedAtMs = System.currentTimeMillis(),
                )
                val now = System.currentTimeMillis()
                val cached = list.mapNotNull { item ->
                    PreForecastPhotoProgressCache[item.id]
                        ?.takeIf { now - it.updatedAtMs <= PHOTO_PROGRESS_CACHE_TTL_MS }
                        ?.let { entry -> item.id to entry.uploadedRequired }
                }.toMap()
                photoProgressById = cached
                list.forEach { preAdvice ->
                    if (cached.containsKey(preAdvice.id)) return@forEach
                    launch {
                        runCatching { repository.getPreAdviceDocuments(preAdvice.id) }
                            .onSuccess { docs ->
                                val uploadedRequired = REQUIRED_PHOTO_CATEGORY_VALUES.count { key ->
                                    docs.any { it.category == key }
                                }
                                PreForecastPhotoProgressCache[preAdvice.id] = PhotoProgressCacheEntry(
                                    uploadedRequired = uploadedRequired,
                                    updatedAtMs = System.currentTimeMillis(),
                                )
                                photoProgressById = photoProgressById + (preAdvice.id to uploadedRequired)
                            }
                    }
                }
            }.onFailure { error = it.message }
            loadState.end()
        }
    }
    LaunchedEffect(Unit) { load(force = cachedItems.isEmpty()) }

    IcsScreenScaffold(
        title = stringResource(R.string.home_preforecast),
        onBack = onBack,
        refreshing = loadState.refreshing,
        onRefresh = { load(force = true) },
        floatingActionButton = {
            IcsFab(onClick = onNewClick) {
                Icon(Icons.Default.Add, contentDescription = stringResource(R.string.content_desc_new))
            }
        },
    ) { padding ->
        when {
            loadState.loading -> LoadingBox(Modifier.padding(padding))
            error != null -> ErrorMessage(error!!, { load() }, Modifier.padding(padding))
            items.isEmpty() -> Column(
                Modifier.padding(padding).fillMaxSize(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                EmptyState(stringResource(R.string.preforecast_empty), Modifier.padding(16.dp))
                Button(onClick = onNewClick, modifier = Modifier.padding(16.dp)) {
                    Text(stringResource(R.string.home_new_preforecast))
                }
            }
            else -> LazyColumn(Modifier.padding(padding), contentPadding = PaddingValues(vertical = 8.dp)) {
                item {
                    IcsScreenTip(stringResource(R.string.ui_tip_preforecast_list))
                }
                item {
                    PreForecastSummaryRow(summary)
                }
                item {
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            if (hasFilters) {
                                stringResource(R.string.preforecast_filter_showing, filteredItems.size, items.size)
                            } else {
                                stringResource(R.string.preforecast_filter_total, items.size)
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = IcsColors.TextSecondary,
                        )
                        TextButton(onClick = { showFilters = !showFilters }) {
                            Text(if (showFilters) stringResource(R.string.action_hide_filters) else stringResource(R.string.action_show_filters))
                        }
                    }
                }
                if (showFilters) {
                    item {
                        PreForecastFilterPanel(
                            lookups = lookups,
                            statusFilter = statusFilter,
                            onStatusFilterChange = { statusFilter = it },
                            shippingLineFilter = shippingLineFilter,
                            onShippingLineFilterChange = { shippingLineFilter = it },
                            dateFrom = dateFrom,
                            onDateFromChange = { dateFrom = it },
                            dateTo = dateTo,
                            onDateToChange = { dateTo = it },
                            onClear = {
                                statusFilter = "All"
                                shippingLineFilter = 0
                                dateFrom = ""
                                dateTo = ""
                            },
                        )
                    }
                }
                if (filteredItems.isEmpty()) {
                    item {
                        EmptyState(stringResource(R.string.preforecast_filter_no_results), Modifier.padding(16.dp))
                    }
                } else {
                    items(filteredItems, key = { it.id }) { item ->
                        val uploaded = photoProgressById[item.id]
                        val statusStyle = getPreAdviceListStatus(item)
                        val logicteck = logicteckStatusFromPreAdvice(item)
                        PreForecastListRowCard(
                            title = item.listTitle(),
                            subtitle = item.listSubtitle(),
                            statusLabel = statusStyle.label,
                            statusColor = statusStyle.color,
                            statusBackground = statusStyle.background,
                            qrCode = if (item.hasQrBooking) item.qrCode else null,
                            logicteckLabel = logicteck?.label,
                            uploaded = uploaded,
                            total = REQUIRED_PHOTO_CATEGORY_VALUES.size,
                            onClick = { onItemClick(item.id) },
                            onViewQr = if (item.hasQrBooking && onViewQr != null) {
                                { onViewQr(item.id) }
                            } else {
                                null
                            },
                        )
                    }
                }
            }
        }
    }
}

private data class PreForecastListSummary(
    val total: Int,
    val draft: Int,
    val pending: Int,
    val approved: Int,
)

@Composable
private fun PreForecastSummaryRow(summary: PreForecastListSummary) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        PreForecastSummaryChip(stringResource(R.string.preforecast_summary_total), summary.total, Modifier.weight(1f))
        PreForecastSummaryChip(stringResource(R.string.preforecast_summary_draft), summary.draft, Modifier.weight(1f))
        PreForecastSummaryChip(stringResource(R.string.preforecast_summary_pending), summary.pending, Modifier.weight(1f))
        PreForecastSummaryChip(stringResource(R.string.preforecast_summary_approved), summary.approved, Modifier.weight(1f))
    }
}

@Composable
private fun PreForecastSummaryChip(label: String, value: Int, modifier: Modifier = Modifier) {
    IcsSectionCard(title = label, modifier = modifier) {
        Text(
            value.toString(),
            style = MaterialTheme.typography.titleLarge,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PreForecastFilterPanel(
    lookups: PreAdviceLookupsDto?,
    statusFilter: String,
    onStatusFilterChange: (String) -> Unit,
    shippingLineFilter: Int,
    onShippingLineFilterChange: (Int) -> Unit,
    dateFrom: String,
    onDateFromChange: (String) -> Unit,
    dateTo: String,
    onDateToChange: (String) -> Unit,
    onClear: () -> Unit,
) {
    val statusOptions = listOf(
        "All",
        "Draft",
        "Submitted",
        "UnderEvaluation",
        "Approved",
        "Rejected",
        "ForCompliance",
        "Cancelled",
    )
    Column(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        PreForecastFilterDropdown(
            label = stringResource(R.string.field_status),
            options = statusOptions.map { it to preForecastStatusLabel(it) },
            selected = statusFilter,
            onSelect = onStatusFilterChange,
        )
        lookups?.let { l ->
            PreForecastFilterDropdown(
                label = stringResource(R.string.field_shipping_line),
                options = listOf(0 to stringResource(R.string.filter_all)) + l.shippingLines.map { it.id to it.name },
                selected = shippingLineFilter,
                onSelect = onShippingLineFilterChange,
            )
        }
        OutlinedTextField(
            dateFrom,
            onDateFromChange,
            label = { Text(stringResource(R.string.filter_date_from)) },
            placeholder = { Text("YYYY-MM-DD") },
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            dateTo,
            onDateToChange,
            label = { Text(stringResource(R.string.filter_date_to)) },
            placeholder = { Text("YYYY-MM-DD") },
            modifier = Modifier.fillMaxWidth(),
        )
        TextButton(onClick = onClear) { Text(stringResource(R.string.action_clear_filters)) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun <T> PreForecastFilterDropdown(
    label: String,
    options: List<Pair<T, String>>,
    selected: T,
    onSelect: (T) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedLabel = options.find { it.first == selected }?.second ?: label
    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
        OutlinedTextField(
            value = selectedLabel,
            onValueChange = {},
            readOnly = true,
            label = { Text(label) },
            modifier = Modifier
                .menuAnchor(MenuAnchorType.PrimaryNotEditable, true)
                .fillMaxWidth(),
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { (value, name) ->
                DropdownMenuItem(
                    text = { Text(name) },
                    onClick = {
                        onSelect(value)
                        expanded = false
                    },
                )
            }
        }
    }
}

@Composable
private fun preForecastStatusLabel(status: String): String = when (status) {
    "All" -> stringResource(R.string.filter_all)
    "UnderEvaluation" -> stringResource(R.string.status_under_evaluation)
    "ForCompliance" -> stringResource(R.string.status_for_compliance)
    else -> status
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun PreForecastDetailScreen(
    id: Int,
    repository: TruckerRepository,
    onBack: () -> Unit,
    onDeleted: () -> Unit = onBack,
    onUploadPayment: (Int) -> Unit = {},
    onPayDemurrage: (Int) -> Unit = {},
                                                                       initialTab: PreForecastDetailTab? = null,
) {
    val context = LocalContext.current
    val app = context.applicationContext as EcmsTruckerApp
    val authState by app.container.tokenStore.authState.collectAsState(initial = AuthState())
    val accessToken = authState.accessToken
    val loadState = rememberScreenLoadState(initiallyLoading = true)
    var item by remember { mutableStateOf<PreAdviceDto?>(null) }
    var docs by remember { mutableStateOf<List<PreAdviceDocumentDto>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    var actionLoading by remember { mutableStateOf(false) }
    var uploadCategory by remember { mutableStateOf<ContainerPhotoCategory?>(null) }
    var damageTarget by remember { mutableStateOf<ContainerPhotoCategory?>(null) }
    var damageDescription by remember { mutableStateOf("") }
    var damageImageUri by remember { mutableStateOf<Uri?>(null) }
    var preview by remember { mutableStateOf<PreAdviceDocumentDto?>(null) }
    var deleteConfirm by remember { mutableStateOf<PreAdviceDocumentDto?>(null) }
    var linkedDemurrage by remember { mutableStateOf<DemurrageBillingDto?>(null) }
    var selectedTab by remember { mutableStateOf(PreForecastDetailTab.Overview) }
    var schedule by remember { mutableStateOf<ScheduleDto?>(null) }
    var qr by remember { mutableStateOf<QrBookingDto?>(null) }
    var qrBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var scheduleLoading by remember { mutableStateOf(false) }
    var scheduleError by remember { mutableStateOf<String?>(null) }
    var qrError by remember { mutableStateOf<String?>(null) }
    var logicteckBooking by remember { mutableStateOf(false) }
    var logicteckMessage by remember { mutableStateOf<String?>(null) }
    var qrDownloading by remember { mutableStateOf(false) }
    var lookups by remember { mutableStateOf<PreAdviceLookupsDto?>(null) }
    var editing by remember { mutableStateOf(false) }
    var deleteRequestOpen by remember { mutableStateOf(false) }
    var cancelRequestOpen by remember { mutableStateOf(false) }
    var cancelReason by remember { mutableStateOf("") }
    var submitConfirmOpen by remember { mutableStateOf(false) }
    var tabInitialized by remember(id) { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    fun downloadQrAsset(share: Boolean) {
        val booking = qr ?: return
        scope.launch {
            qrDownloading = true
            runCatching {
                val file = FileShareHelper.downloadQrImage(context, booking.id, booking.qrCode, accessToken)
                if (share) {
                    FileShareHelper.shareFile(context, file, "image/png", context.getString(R.string.qr_action_share_image))
                } else {
                    FileShareHelper.openFile(context, file, "image/png")
                }
            }.onFailure { qrError = it.message }
            qrDownloading = false
        }
    }

    fun downloadQrPdf(share: Boolean) {
        val booking = qr ?: return
        scope.launch {
            qrDownloading = true
            runCatching {
                val file = FileShareHelper.downloadConfirmationPdf(context, booking.id, booking.qrCode, accessToken)
                if (share) {
                    FileShareHelper.shareFile(context, file, "application/pdf", context.getString(R.string.qr_action_share_pdf))
                } else {
                    FileShareHelper.openFile(context, file, "application/pdf")
                }
            }.onFailure { qrError = it.message }
            qrDownloading = false
        }
    }

    val photoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri == null) {
            Toast.makeText(context, "Image selection cancelled", Toast.LENGTH_SHORT).show()
            return@rememberLauncherForActivityResult
        }
        val category = uploadCategory ?: return@rememberLauncherForActivityResult
        Toast.makeText(context, "Uploading photo...", Toast.LENGTH_SHORT).show()
        scope.launch {
            actionLoading = true
            runCatching { repository.uploadPreAdviceDocument(id, uri, category.value, null) }
                .onSuccess {
                    docs = repository.getPreAdviceDocuments(id)
                    snackbarHostState.showSnackbar("Photo uploaded")
                    Toast.makeText(context, "Photo uploaded", Toast.LENGTH_SHORT).show()
                }
                .onFailure {
                    error = it.message
                    snackbarHostState.showSnackbar(it.message ?: "Failed to upload photo")
                    Toast.makeText(context, it.message ?: "Failed to upload photo", Toast.LENGTH_LONG).show()
                }
            actionLoading = false
            uploadCategory = null
        }
    }

    val damagePhotoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        damageImageUri = uri
        if (uri != null) {
            Toast.makeText(context, "Damage image selected", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(context, "Image selection cancelled", Toast.LENGTH_SHORT).show()
        }
    }

    fun load() {
        scope.launch {
            loadState.begin(item != null)
            runCatching {
                item = repository.getPreAdvice(id)
                docs = repository.getPreAdviceDocuments(id)
            }.onFailure { error = it.message }
            loadState.end()
        }
    }
    LaunchedEffect(id) { load() }

    val freeTimeExpired = item?.demurrageValidUntil?.let { isCroFreeTimeExpired(it) } == true
    val demurrageSettled = linkedDemurrage?.status.equals("Paid", true)

    LaunchedEffect(item?.id, item?.status, freeTimeExpired) {
        val current = item
        if (current == null || !freeTimeExpired) {
            linkedDemurrage = null
            return@LaunchedEffect
        }
        runCatching {
            var match = repository.listDemurrageBillings().find { it.preAdviceId == current.id }
            if (match == null && (current.status.equals("Draft", true) || current.status.equals("ForCompliance", true))) {
                match = runCatching { repository.ensureExpiredDemurrageFreeTime(current.id) }.getOrNull()
            }
            linkedDemurrage = match
        }.onFailure {
            linkedDemurrage = null
        }
    }

    fun loadScheduleAndMaybeQr(forQr: Boolean) {
        scope.launch {
            scheduleLoading = true
            scheduleError = null
            qrError = null
            val loadedSchedule = repository.getScheduleByPreAdvice(id)
            schedule = loadedSchedule
            scheduleLoading = false
            if (loadedSchedule == null) {
                qr = null
                qrBitmap = null
                return@launch
            }
            if (
                forQr &&
                (loadedSchedule.status.equals("Confirmed", true) || loadedSchedule.status.equals("Completed", true))
            ) {
                runCatching {
                    val loadedQr = repository.getQrBySchedule(loadedSchedule.id)
                    qr = loadedQr
                    qrBitmap = QrCodeGenerator.generate(loadedQr.qrCode, 512)
                }.onFailure {
                    qrError = it.message
                    qr = null
                    qrBitmap = null
                }
            }
        }
    }

    IcsScreenScaffold(
        title = stringResource(R.string.preforecast_detail_title),
        onBack = onBack,
        refreshing = loadState.refreshing,
        onRefresh = { load() },
        snackbarHost = { _ -> SnackbarHost(hostState = snackbarHostState) },
    ) { padding ->
        when {
            loadState.loading && item == null -> LoadingBox(Modifier.padding(padding))
            error != null && item == null -> ErrorMessage(error!!, { load() }, Modifier.padding(padding))
            item != null -> {
                val p = item!!
                val isDraft = p.status.equals("Draft", true)
                val isForCompliance = p.status.equals("ForCompliance", true)
                val isSubmitted = p.status.equals("Submitted", true)
                val canManagePhotos = isDraft || isForCompliance || isSubmitted
                val canSubmit = (isDraft || isForCompliance) && (!freeTimeExpired || demurrageSettled)
                val docsByCategory = docs.associateBy { it.category.orEmpty() }
                val damageByView = docs
                    .filter { it.category == DAMAGE_PHOTO_CATEGORY }
                    .mapNotNull { doc -> parseDamageView(doc.comment)?.let { it to doc } }
                    .toMap()
                val requiredCategories = CONTAINER_PHOTO_GRID_CATEGORIES.filter { it.required }
                val uploadedRequired = requiredCategories.count { docsByCategory[it.value] != null }
                val photosTotal = requiredCategories.size
                val photosComplete = uploadedRequired == photosTotal
                val missing = requiredCategories.filter { docsByCategory[it.value] == null }
                var missingPhotoLabels = ""
                for (i in missing.indices) {
                    if (i > 0) missingPhotoLabels += ", "
                    missingPhotoLabels += containerPhotoLabel(missing[i].value)
                }
                val isApproved = p.status.equals("Approved", true)
                val isUnderEvaluation = p.status.equals("UnderEvaluation", true)
                val canEdit = isDraft || isForCompliance
                val canDelete = isDraft
                val canCancel = isSubmitted || isUnderEvaluation
                val canSubmitEnabled = (isDraft || isForCompliance) && photosComplete && canSubmit
                val submitLabel = if (isForCompliance) {
                    stringResource(R.string.preforecast_resubmit_for_evaluation)
                } else {
                    stringResource(R.string.preforecast_submit_for_evaluation)
                }
                val showPayDemurrage = freeTimeExpired && !demurrageSettled && linkedDemurrage != null
                val tabs = buildList {
                    add(PreForecastDetailTab.Overview)
                    add(PreForecastDetailTab.Details)
                    add(PreForecastDetailTab.Photos)
                    if (isApproved) {
                        add(PreForecastDetailTab.Schedule)
                        add(PreForecastDetailTab.Qr)
                    }
                    add(PreForecastDetailTab.Activity)
                }
                val activeTab = if (selectedTab in tabs) selectedTab else PreForecastDetailTab.Overview
                val guidance = preAdviceStatusGuidance(
                    item = p,
                    schedule = schedule,
                    photosComplete = photosComplete,
                    uploadedRequired = uploadedRequired,
                    photosTotal = photosTotal,
                    missingPhotoLabels = missingPhotoLabels,
                    freeTimeExpired = freeTimeExpired,
                    demurrageSettled = demurrageSettled,
                    linkedDemurrageReference = linkedDemurrage?.referenceNo,
                    linkedDemurrageAmount = linkedDemurrage?.totalAmount,
                    linkedDemurrageStatus = linkedDemurrage?.status,
                )
                val progressSteps = buildPreForecastProgressSteps(
                    item = p,
                    schedule = schedule,
                    scheduleLoading = scheduleLoading,
                    qr = qr,
                    qrLoading = scheduleLoading && activeTab == PreForecastDetailTab.Qr,
                    onManagePhotos = { selectedTab = PreForecastDetailTab.Photos },
                    onOpenSchedule = { selectedTab = PreForecastDetailTab.Schedule },
                    onViewQr = { selectedTab = PreForecastDetailTab.Qr },
                )

                LaunchedEffect(p.id, p.status, initialTab) {
                    if (tabInitialized) return@LaunchedEffect
                    selectedTab = when {
                        initialTab != null && initialTab in tabs -> initialTab
                        isDraft || isForCompliance -> PreForecastDetailTab.Photos
                        else -> PreForecastDetailTab.Overview
                    }
                    tabInitialized = true
                }

                LaunchedEffect(isApproved) {
                    if (isApproved && lookups == null) {
                        lookups = runCatching { repository.getPreAdviceLookups() }.getOrNull()
                    }
                }

                LaunchedEffect(p.id, p.status, activeTab, isApproved) {
                    if (!isApproved) return@LaunchedEffect
                    when (activeTab) {
                        PreForecastDetailTab.Schedule,
                        PreForecastDetailTab.Overview,
                        -> loadScheduleAndMaybeQr(forQr = false)
                        PreForecastDetailTab.Qr -> loadScheduleAndMaybeQr(forQr = true)
                        else -> Unit
                    }
                }

                PreForecastPhotoProgressCache[p.id] = PhotoProgressCacheEntry(
                    uploadedRequired = uploadedRequired,
                    updatedAtMs = System.currentTimeMillis(),
                )
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentPadding = PaddingValues(bottom = 24.dp),
                ) {
                    item(key = "header") {
                        IcsDetailHeader(
                            referenceNo = p.referenceNo,
                            containerNo = p.containerNo,
                            status = p.status,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                            belowStatus = {
                                PhotoProgressChip(
                                    uploaded = uploadedRequired,
                                    total = photosTotal,
                                )
                            },
                        )
                    }
                    item(key = "guidance") {
                        PreForecastGuidanceBanner(guidance)
                    }
                    if (schedule != null && isScheduleForPayment(schedule!!.status)) {
                        item(key = "payment-cta") {
                            Button(
                                onClick = { onUploadPayment(schedule!!.id) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp),
                            ) { Text(stringResource(R.string.preforecast_go_to_payment)) }
                        }
                    }
                    item(key = "progress") {
                        PreForecastProgressStrip(
                            steps = progressSteps,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                        )
                    }
                    item(key = "hero") {
                        PreForecastHeroActions(
                            canEdit = canEdit && !editing,
                            canDelete = canDelete,
                            canCancel = canCancel,
                            canSubmit = canSubmitEnabled,
                            submitLabel = submitLabel,
                            showPayDemurrage = showPayDemurrage,
                            loading = actionLoading,
                            onEdit = {
                                scope.launch {
                                    if (lookups == null) {
                                        lookups = runCatching { repository.getPreAdviceLookups() }.getOrNull()
                                    }
                                    editing = lookups != null
                                }
                            },
                            onDelete = { deleteRequestOpen = true },
                            onCancel = { cancelRequestOpen = true },
                            onSubmit = { submitConfirmOpen = true },
                            onPayDemurrage = { linkedDemurrage?.id?.let(onPayDemurrage) },
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
                                                preForecastDetailTabLabel(
                                                    tab,
                                                    if (tab == PreForecastDetailTab.Photos) uploadedRequired else null,
                                                    if (tab == PreForecastDetailTab.Photos) photosTotal else null,
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
                            PreForecastDetailTab.Overview -> PreForecastOverviewTab(
                                item = p,
                                schedule = schedule,
                                qr = qr,
                                onOpenSchedule = { selectedTab = PreForecastDetailTab.Schedule },
                                onOpenQr = { selectedTab = PreForecastDetailTab.Qr },
                            )
                            PreForecastDetailTab.Details -> PreForecastDetailsTab(item = p)
                            PreForecastDetailTab.Photos -> PreForecastPhotosTabContent(
                                canManagePhotos = canManagePhotos,
                                docsByCategory = docsByCategory,
                                damageByView = damageByView,
                                damageDocs = CONTAINER_PHOTO_GRID_CATEGORIES.mapNotNull { c ->
                                    damageByView[c.value]?.let { c to it }
                                },
                                actionLoading = actionLoading,
                                accessToken = accessToken,
                                onUpload = { category ->
                                    uploadCategory = category
                                    photoPicker.launch("image/*")
                                },
                                onDamage = { category ->
                                    damageTarget = category
                                    damageDescription = parseDamageDescription(damageByView[category.value]?.comment)
                                    damageImageUri = null
                                },
                                onView = { preview = it },
                                onDelete = { deleteConfirm = it },
                                onDamageUpdate = { category, doc ->
                                    damageTarget = category
                                    damageDescription = parseDamageDescription(doc.comment)
                                    damageImageUri = null
                                },
                            )
                            PreForecastDetailTab.Schedule -> PreForecastScheduleTab(
                                schedule = schedule,
                                loading = scheduleLoading,
                                error = scheduleError,
                                onUploadPayment = onUploadPayment,
                                onRetry = { loadScheduleAndMaybeQr(forQr = false) },
                            )
                            PreForecastDetailTab.Qr -> PreForecastQrTab(
                                schedule = schedule,
                                qr = qr,
                                bitmap = qrBitmap,
                                loading = scheduleLoading,
                                booking = logicteckBooking,
                                message = logicteckMessage,
                                error = qrError,
                                downloading = qrDownloading,
                                onDownloadQr = { downloadQrAsset(share = false) },
                                onDownloadPdf = { downloadQrPdf(share = false) },
                                onShareQr = { downloadQrAsset(share = true) },
                                onSharePdf = { downloadQrPdf(share = true) },
                                onBookLogicteck = {
                                    val bookingId = qr?.id ?: return@PreForecastQrTab
                                    scope.launch {
                                        logicteckBooking = true
                                        runCatching { repository.bookLogicteck(bookingId) }
                                            .onSuccess {
                                                logicteckMessage = it.message
                                                qr = it.booking ?: qr
                                                qrBitmap = qr?.let { current -> QrCodeGenerator.generate(current.qrCode, 512) }
                                            }
                                            .onFailure { qrError = it.message }
                                        logicteckBooking = false
                                    }
                                },
                                onRetry = { loadScheduleAndMaybeQr(forQr = true) },
                                onUploadPayment = onUploadPayment,
                            )
                            PreForecastDetailTab.Activity -> PreForecastActivityTab(
                                preAdviceId = id,
                                repository = repository,
                                active = true,
                            )
                        }
                    }
                }
            }
        }
    }

    if (deleteRequestOpen && item != null) {
        AlertDialog(
            onDismissRequest = { deleteRequestOpen = false },
            title = { Text(stringResource(R.string.preforecast_delete_title)) },
            text = { Text(stringResource(R.string.preforecast_delete_message)) },
            confirmButton = {
                TextButton(
                    enabled = !actionLoading,
                    onClick = {
                        scope.launch {
                            actionLoading = true
                            runCatching { repository.deletePreAdvice(id) }
                                .onSuccess {
                                    deleteRequestOpen = false
                                    clearPreForecastScreenCache()
                                    onDeleted()
                                }
                                .onFailure { error = it.message }
                            actionLoading = false
                        }
                    },
                ) { Text(stringResource(R.string.action_delete)) }
            },
            dismissButton = {
                TextButton(onClick = { deleteRequestOpen = false }) { Text(stringResource(R.string.action_cancel)) }
            },
        )
    }

    if (submitConfirmOpen && item != null) {
        val p = item!!
        val isForComplianceSubmit = p.status.equals("ForCompliance", true)
        AlertDialog(
            onDismissRequest = { submitConfirmOpen = false },
            title = {
                Text(
                    stringResource(
                        if (isForComplianceSubmit) {
                            R.string.preforecast_submit_confirm_resubmit_title
                        } else {
                            R.string.preforecast_submit_confirm_title
                        },
                    ),
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("${p.referenceNo}\n${p.containerNo} · ${p.shippingLineName}")
                    if (isForComplianceSubmit && !p.complianceRemarks.isNullOrBlank()) {
                        Text(
                            stringResource(R.string.field_compliance_remarks) + ": " + p.complianceRemarks,
                            color = IcsColors.Warning,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                    Text(
                        stringResource(
                            if (isForComplianceSubmit) {
                                R.string.preforecast_submit_confirm_resubmit_body
                            } else {
                                R.string.preforecast_submit_confirm_body
                            },
                        ),
                        style = MaterialTheme.typography.bodySmall,
                        color = IcsColors.TextSecondary,
                    )
                    if (freeTimeExpired) {
                        Text(
                            stringResource(
                                if (demurrageSettled) {
                                    R.string.preforecast_demurrage_settled_submit_ok
                                } else {
                                    R.string.preforecast_demurrage_submit_blocked_generic
                                },
                                p.demurrageValidUntil.orEmpty(),
                            ),
                            color = if (demurrageSettled) IcsColors.Success else MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                    Text(
                        stringResource(R.string.preforecast_submit_confirm_photos_ready),
                        color = IcsColors.Success,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            },
            confirmButton = {
                TextButton(
                    enabled = !actionLoading,
                    onClick = {
                        scope.launch {
                            actionLoading = true
                            runCatching { repository.submitPreAdvice(id) }
                                .onSuccess {
                                    submitConfirmOpen = false
                                    load()
                                }
                                .onFailure { error = it.message }
                            actionLoading = false
                        }
                    },
                ) {
                    Text(
                        if (isForComplianceSubmit) {
                            stringResource(R.string.preforecast_resubmit_for_evaluation)
                        } else {
                            stringResource(R.string.preforecast_submit_for_evaluation)
                        },
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = { submitConfirmOpen = false }) {
                    Text(stringResource(R.string.action_cancel))
                }
            },
        )
    }

    if (cancelRequestOpen) {
        AlertDialog(
            onDismissRequest = { cancelRequestOpen = false },
            title = { Text(stringResource(R.string.preforecast_cancel_title)) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(stringResource(R.string.preforecast_cancel_message))
                    OutlinedTextField(
                        cancelReason,
                        { cancelReason = it },
                        label = { Text(stringResource(R.string.field_reason_optional)) },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            },
            confirmButton = {
                TextButton(
                    enabled = !actionLoading,
                    onClick = {
                        scope.launch {
                            actionLoading = true
                            runCatching { repository.cancelPreAdvice(id, cancelReason.ifBlank { null }) }
                                .onSuccess {
                                    cancelRequestOpen = false
                                    cancelReason = ""
                                    load()
                                }
                                .onFailure { error = it.message }
                            actionLoading = false
                        }
                    },
                ) { Text(stringResource(R.string.preforecast_cancel_request)) }
            },
            dismissButton = {
                TextButton(onClick = { cancelRequestOpen = false }) { Text(stringResource(R.string.action_cancel)) }
            },
        )
    }

    if (editing && item != null && lookups != null) {
        PreForecastEditDialog(
            repository = repository,
            lookups = lookups!!,
            item = item!!,
            saving = actionLoading,
            onDismiss = { editing = false },
            onSave = { shippingLineId, containerNo, sizeId, typeId, remarks ->
                scope.launch {
                    actionLoading = true
                    runCatching {
                        repository.updatePreAdvice(
                            id,
                            CreatePreAdviceRequest(
                                shippingLineId = shippingLineId,
                                containerNo = containerNo,
                                containerSizeId = sizeId,
                                containerTypeId = typeId,
                                remarks = remarks,
                            ),
                        )
                    }.onSuccess {
                        editing = false
                        load()
                    }.onFailure { error = it.message }
                    actionLoading = false
                }
            },
        )
    }

    if (deleteConfirm != null) {
        AlertDialog(
            onDismissRequest = { deleteConfirm = null },
            title = { Text(stringResource(R.string.dialog_remove_photo_title)) },
            text = {
                Text(stringResource(R.string.dialog_remove_photo_message))
            },
            confirmButton = {
                TextButton(
                    enabled = !actionLoading,
                    onClick = {
                        val doc = deleteConfirm ?: return@TextButton
                        scope.launch {
                            actionLoading = true
                            runCatching { repository.deletePreAdviceDocument(id, doc.id) }
                                .onSuccess {
                                    docs = repository.getPreAdviceDocuments(id)
                                    deleteConfirm = null
                                }
                                .onFailure { error = it.message }
                            actionLoading = false
                        }
                    },
                ) { Text(stringResource(R.string.action_remove)) }
            },
            dismissButton = {
                TextButton(onClick = { deleteConfirm = null }) { Text(stringResource(R.string.action_cancel)) }
            },
        )
    }

    if (preview != null) {
        val doc = preview!!
        Dialog(
            onDismissRequest = { preview = null },
            properties = DialogProperties(usePlatformDefaultWidth = false),
        ) {
            ZoomableImageViewer(
                title = doc.categoryLabel ?: containerPhotoLabel(doc.category),
                imageRequest = remember(doc.filePath, accessToken) {
                    buildAuthedImageRequest(context, doc.filePath, accessToken)
                },
                contentDescription = doc.fileName,
                onClose = { preview = null },
            )
        }
    }

    if (damageTarget != null) {
        AlertDialog(
            onDismissRequest = { damageTarget = null },
            title = {
                Text(
                    stringResource(
                        R.string.preforecast_damage_photo_title,
                        damageTarget?.let { containerPhotoLabel(it.value) } ?: "",
                    ),
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        modifier = Modifier.fillMaxWidth(),
                        onClick = { damagePhotoPicker.launch("image/*") },
                    ) {
                        Text(
                            if (damageImageUri != null) {
                                stringResource(R.string.preforecast_change_image)
                            } else {
                                stringResource(R.string.preforecast_choose_image)
                            },
                        )
                    }
                    TextField(
                        value = damageDescription,
                        onValueChange = { damageDescription = it },
                        label = { Text(stringResource(R.string.preforecast_damage_description)) },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2,
                    )
                    Text(
                        stringResource(R.string.preforecast_damage_description_hint),
                        style = MaterialTheme.typography.bodySmall,
                        color = IcsColors.TextSecondary,
                    )
                }
            },
            confirmButton = {
                TextButton(
                    enabled = !actionLoading && damageTarget != null && damageImageUri != null && damageDescription.isNotBlank(),
                    onClick = {
                        val target = damageTarget ?: return@TextButton
                        val uri = damageImageUri ?: return@TextButton
                        scope.launch {
                            actionLoading = true
                            runCatching {
                                repository.uploadPreAdviceDocument(
                                    id,
                                    uri,
                                    DAMAGE_PHOTO_CATEGORY,
                                    formatDamageComment(target.value, damageDescription.trim()),
                                )
                            }
                                .onSuccess {
                                    docs = repository.getPreAdviceDocuments(id)
                                    damageTarget = null
                                    damageImageUri = null
                                    damageDescription = ""
                                    Toast.makeText(context, "Damage photo uploaded", Toast.LENGTH_SHORT).show()
                                }
                                .onFailure {
                                    error = it.message
                                    Toast.makeText(context, it.message ?: "Failed to upload damage photo", Toast.LENGTH_LONG).show()
                                }
                            actionLoading = false
                        }
                    },
                ) { Text(stringResource(R.string.action_upload)) }
            },
            dismissButton = {
                TextButton(onClick = { damageTarget = null }) { Text(stringResource(R.string.action_cancel)) }
            },
        )
    }
}

@Composable
private fun ZoomableImageViewer(
    title: String,
    imageRequest: ImageRequest,
    contentDescription: String,
    onClose: () -> Unit,
) {
    var scale by remember { mutableFloatStateOf(1f) }
    var offsetX by remember { mutableFloatStateOf(0f) }
    var offsetY by remember { mutableFloatStateOf(0f) }
    val transformableState = rememberTransformableState { zoomChange, panChange, _ ->
        scale = (scale * zoomChange).coerceIn(1f, 5f)
        if (scale > 1f) {
            offsetX += panChange.x
            offsetY += panChange.y
        } else {
            offsetX = 0f
            offsetY = 0f
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
    ) {
        AsyncImage(
            model = imageRequest,
            contentDescription = contentDescription,
            modifier = Modifier
                .fillMaxSize()
                .graphicsLayer(
                    scaleX = scale,
                    scaleY = scale,
                    translationX = offsetX,
                    translationY = offsetY,
                )
                .transformable(transformableState),
            contentScale = ContentScale.Fit,
        )

        Row(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 8.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = title,
                color = Color.White,
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.weight(1f),
                maxLines = 1,
            )
            IconButton(onClick = onClose) {
                Icon(Icons.Default.Close, contentDescription = stringResource(R.string.action_close), tint = Color.White)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PreForecastNewScreen(
    repository: TruckerRepository,
    onCreated: (Int) -> Unit,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val loadState = rememberScreenLoadState(initiallyLoading = true)
    var lookups by remember { mutableStateOf<PreAdviceLookupsDto?>(null) }
    var entryMode by remember { mutableStateOf(PreForecastEntryMode.IcsCro) }
    var containerNo by remember { mutableStateOf("") }
    var shippingLineId by remember { mutableIntStateOf(0) }
    var sizeId by remember { mutableIntStateOf(0) }
    var typeId by remember { mutableIntStateOf(0) }
    var remarks by remember { mutableStateOf("") }
    var croLink by remember { mutableStateOf<CroEdoAttachSuccess?>(null) }
    var legacyCroUri by remember { mutableStateOf<Uri?>(null) }
    var legacyCroFileName by remember { mutableStateOf("") }
    var demurrageBlock by remember { mutableStateOf<String?>(null) }
    var duplicateWarning by remember { mutableStateOf<String?>(null) }
    var checkingBlock by remember { mutableStateOf(false) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }
    val refreshMessage = stringResource(R.string.refresh_feedback_preforecast_form)

    val formComplete =
        shippingLineId > 0 &&
            sizeId > 0 &&
            typeId > 0 &&
            containerNo.isNotBlank()
    val croLinked = entryMode == PreForecastEntryMode.IcsCro &&
        croLink != null &&
        formComplete
    val legacyReady = entryMode == PreForecastEntryMode.LegacyManual &&
        legacyCroUri != null &&
        formComplete
    val freeTimeExpired = croLink?.line?.demurrageValidUntil?.let { isCroFreeTimeExpired(it) } == true

    fun resetFormFields() {
        containerNo = ""
        shippingLineId = 0
        sizeId = 0
        typeId = 0
        remarks = ""
    }

    fun onCroLinked(payload: CroEdoAttachSuccess) {
        val l = lookups ?: return
        mapCroLineToForm(l, payload.result.shippingLineId, payload.result.shippingLineName, payload.line)
            .onSuccess { mapped ->
                error = null
                croLink = payload
                shippingLineId = mapped.shippingLineId
                containerNo = mapped.containerNo
                sizeId = mapped.containerSizeId
                typeId = mapped.containerTypeId
            }
            .onFailure {
                error = it.message
                croLink = null
                resetFormFields()
            }
    }

    fun onCroCleared() {
        croLink = null
        resetFormFields()
    }

    fun clearLegacyUpload() {
        legacyCroUri = null
        legacyCroFileName = ""
    }

    fun switchEntryMode(mode: PreForecastEntryMode) {
        if (entryMode == mode) return
        entryMode = mode
        error = null
        onCroCleared()
        clearLegacyUpload()
    }

    fun loadLookups() {
        scope.launch {
            loadState.begin(lookups != null)
            runCatching { lookups = repository.getPreAdviceLookups() }
                .onFailure { error = it.message }
            loadState.end()
        }
    }

    fun refreshLookups() {
        loadLookups()
        scope.launch { snackbarHostState.showSnackbar(refreshMessage) }
    }

    LaunchedEffect(Unit) { loadLookups() }

    LaunchedEffect(shippingLineId, containerNo, sizeId, typeId) {
        if (shippingLineId <= 0 || sizeId <= 0 || typeId <= 0 || containerNo.isBlank()) {
            demurrageBlock = null
            checkingBlock = false
            return@LaunchedEffect
        }
        checkingBlock = true
        delay(400)
        runCatching {
            repository.checkDemurrageBlock(containerNo.trim(), shippingLineId, sizeId, typeId)
        }.onSuccess { check ->
            demurrageBlock = if (check.isBlocked) {
                check.message ?: "Outstanding demurrage must be settled first."
            } else {
                null
            }
        }.onFailure {
            demurrageBlock = null
        }
        checkingBlock = false
    }

    LaunchedEffect(containerNo, sizeId, typeId) {
        if (containerNo.isBlank() || sizeId <= 0 || typeId <= 0) {
            duplicateWarning = null
            return@LaunchedEffect
        }
        runCatching {
            repository.checkPreAdviceDuplicate(containerNo.trim(), sizeId, typeId)
        }.onSuccess { check ->
            duplicateWarning = if (check.isDuplicate) {
                context.getString(
                    R.string.preforecast_duplicate_warning,
                    check.referenceNo.orEmpty(),
                    check.status.orEmpty(),
                )
            } else {
                null
            }
        }.onFailure {
            duplicateWarning = null
        }
    }

    val canCreate = !saving &&
        (croLinked || legacyReady) &&
        demurrageBlock == null &&
        duplicateWarning == null &&
        !checkingBlock &&
        formComplete

    IcsScreenScaffold(
        title = stringResource(R.string.preforecast_new_title),
        onBack = onBack,
        refreshing = loadState.refreshing,
        onRefresh = { refreshLookups() },
        showRefreshFeedback = false,
        snackbarHost = { _ -> SnackbarHost(hostState = snackbarHostState) },
    ) { padding ->
        if (loadState.loading) {
            LoadingBox(Modifier.padding(padding))
        } else {
            Column(
                Modifier
                    .padding(padding)
                    .padding(16.dp)
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                IcsSectionCard(title = stringResource(R.string.preforecast_entry_mode_title)) {
                    Row(
                        modifier = Modifier
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                            .fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        FilterChip(
                            selected = entryMode == PreForecastEntryMode.IcsCro,
                            onClick = { switchEntryMode(PreForecastEntryMode.IcsCro) },
                            label = { Text(stringResource(R.string.preforecast_entry_mode_ics)) },
                            enabled = !saving,
                            modifier = Modifier.weight(1f),
                        )
                        FilterChip(
                            selected = entryMode == PreForecastEntryMode.LegacyManual,
                            onClick = { switchEntryMode(PreForecastEntryMode.LegacyManual) },
                            label = { Text(stringResource(R.string.preforecast_entry_mode_legacy)) },
                            enabled = !saving,
                            modifier = Modifier.weight(1f),
                        )
                    }
                }

                when (entryMode) {
                    PreForecastEntryMode.IcsCro -> {
                        CroEdoAttachSection(
                            repository = repository,
                            disabled = saving,
                            onLinked = ::onCroLinked,
                            onCleared = ::onCroCleared,
                        )

                        if (!croLinked) {
                            IcsGuidanceBanner(
                                message = stringResource(R.string.cro_edo_required_warning),
                                kind = IcsGuidanceKind.Warning,
                            )
                        }
                    }

                    PreForecastEntryMode.LegacyManual -> {
                        IcsGuidanceBanner(
                            message = stringResource(R.string.preforecast_entry_mode_legacy_hint),
                            kind = IcsGuidanceKind.Info,
                        )
                        CroEdoLegacyUploadSection(
                            fileName = legacyCroFileName,
                            disabled = saving,
                            onFileSelected = { uri, name ->
                                legacyCroUri = uri
                                legacyCroFileName = name
                                error = null
                            },
                            onCleared = ::clearLegacyUpload,
                        )
                        if (legacyCroUri == null) {
                            IcsGuidanceBanner(
                                message = stringResource(R.string.preforecast_legacy_doc_required),
                                kind = IcsGuidanceKind.Warning,
                            )
                        }
                    }
                }

                lookups?.let { l ->
                    val showCatalogFields = when (entryMode) {
                        PreForecastEntryMode.IcsCro -> croLinked
                        PreForecastEntryMode.LegacyManual -> true
                    }
                    if (showCatalogFields) {
                        val sectionTitle = when (entryMode) {
                            PreForecastEntryMode.IcsCro -> stringResource(R.string.preforecast_step2_title)
                            PreForecastEntryMode.LegacyManual -> stringResource(R.string.preforecast_legacy_step2_title)
                        }
                        val sectionHint = when (entryMode) {
                            PreForecastEntryMode.IcsCro -> stringResource(R.string.preforecast_step2_hint)
                            PreForecastEntryMode.LegacyManual -> stringResource(R.string.preforecast_legacy_step2_hint)
                        }
                        IcsSectionCard(title = sectionTitle) {
                            Column(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                IcsGuidanceBanner(
                                    message = sectionHint,
                                    kind = if (entryMode == PreForecastEntryMode.IcsCro) {
                                        IcsGuidanceKind.Success
                                    } else {
                                        IcsGuidanceKind.Info
                                    },
                                )
                                if (entryMode == PreForecastEntryMode.IcsCro) {
                                    val shippingLineLabel = l.shippingLines.find { it.id == shippingLineId }?.name.orEmpty()
                                    val sizeLabel = l.containerSizes.find { it.id == sizeId }?.label.orEmpty()
                                    val typeLabel = l.containerTypes.find { it.id == typeId }?.label.orEmpty()
                                    IcsInfoTileGrid(
                                        tiles = listOf(
                                            stringResource(R.string.field_container_number) to containerNo,
                                            stringResource(R.string.field_shipping_line) to shippingLineLabel,
                                            stringResource(R.string.field_size_type) to "$sizeLabel / $typeLabel",
                                        ),
                                    )
                                } else {
                                    PreForecastCatalogFields(
                                        lookups = l,
                                        containerNo = containerNo,
                                        onContainerNoChange = { containerNo = it },
                                        shippingLineId = shippingLineId,
                                        onShippingLineIdChange = { shippingLineId = it },
                                        sizeId = sizeId,
                                        onSizeIdChange = { sizeId = it },
                                        typeId = typeId,
                                        onTypeIdChange = { typeId = it },
                                    )
                                }
                            }
                        }

                        OutlinedTextField(
                            remarks,
                            { remarks = it },
                            label = { Text(stringResource(R.string.field_remarks)) },
                            modifier = Modifier.fillMaxWidth(),
                            placeholder = { Text(stringResource(R.string.field_remarks_optional_hint)) },
                        )
                    }
                }

                if (freeTimeExpired && croLinked) {
                    IcsGuidanceBanner(
                        message = croFreeTimeExpiredMessage(croLink?.line?.demurrageValidUntil),
                        kind = IcsGuidanceKind.Warning,
                    )
                }

                demurrageBlock?.let {
                    IcsGuidanceBanner(
                        message = "$it ${stringResource(R.string.cro_edo_demurrage_block_hint)}",
                        kind = IcsGuidanceKind.Error,
                    )
                }

                duplicateWarning?.let {
                    IcsGuidanceBanner(message = it, kind = IcsGuidanceKind.Warning)
                }

                if (croLinked || legacyReady) {
                    val workflowSteps = when (entryMode) {
                        PreForecastEntryMode.IcsCro -> listOf(
                            stringResource(R.string.preforecast_workflow_step_1),
                            stringResource(R.string.preforecast_workflow_step_2),
                            stringResource(R.string.preforecast_workflow_step_3),
                        )
                        PreForecastEntryMode.LegacyManual -> listOf(
                            stringResource(R.string.preforecast_workflow_legacy_step_1),
                            stringResource(R.string.preforecast_workflow_legacy_step_2),
                            stringResource(R.string.preforecast_workflow_legacy_step_3),
                        )
                    }
                    IcsSectionCard(title = stringResource(R.string.preforecast_workflow_title)) {
                        Column(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            workflowSteps.forEachIndexed { index, step ->
                                IcsInfoTile(label = "${index + 1}", value = step)
                            }
                        }
                    }
                }

                error?.let {
                    IcsGuidanceBanner(message = it, kind = IcsGuidanceKind.Error)
                }
                IcsPrimaryButton(
                    text = stringResource(R.string.action_create_draft),
                    onClick = {
                        saving = true
                        scope.launch {
                            runCatching {
                                val currentLink = croLink
                                val created = repository.createPreAdvice(
                                    CreatePreAdviceRequest(
                                        shippingLineId = shippingLineId,
                                        containerNo = containerNo.trim(),
                                        containerSizeId = sizeId,
                                        containerTypeId = typeId,
                                        remarks = remarks.ifBlank { null },
                                        croVerificationToken = currentLink?.token,
                                        croLineNo = currentLink?.line?.lineNo,
                                    ),
                                )
                                when (entryMode) {
                                    PreForecastEntryMode.IcsCro -> {
                                        currentLink?.fileUri?.let { uri ->
                                            runCatching {
                                                repository.uploadPreAdviceDocument(created.id, uri, "CroEdo", null)
                                            }
                                        }
                                    }
                                    PreForecastEntryMode.LegacyManual -> {
                                        legacyCroUri?.let { uri ->
                                            repository.uploadPreAdviceDocument(created.id, uri, "CroEdo", null)
                                        }
                                    }
                                }
                                created
                            }.onSuccess { created -> onCreated(created.id) }
                                .onFailure { err ->
                                    error = err.message
                                    saving = false
                                }
                        }
                    },
                    enabled = canCreate,
                    loading = saving,
                )
            }
        }
    }
}

private enum class PreForecastEntryMode {
    IcsCro,
    LegacyManual,
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DropdownField(
    label: String,
    options: List<Pair<Int, String>>,
    selected: Int,
    onSelect: (Int) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedLabel = options.find { it.first == selected }?.second
        ?: stringResource(R.string.field_select_label, label)
    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
        OutlinedTextField(
            value = selectedLabel,
            onValueChange = {},
            readOnly = true,
            label = { Text(label) },
            modifier = Modifier.menuAnchor(androidx.compose.material3.MenuAnchorType.PrimaryNotEditable, true).fillMaxWidth(),
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { (id, name) ->
                DropdownMenuItem(
                    text = { Text(name) },
                    onClick = { onSelect(id); expanded = false },
                )
            }
        }
    }
}

private data class ContainerPhotoCategory(val value: String, val required: Boolean)

private val CONTAINER_PHOTO_GRID_CATEGORIES = listOf(
    ContainerPhotoCategory("Flooring", true),
    ContainerPhotoCategory("RightSideIn", true),
    ContainerPhotoCategory("LeftSideIn", true),
    ContainerPhotoCategory("Back", true),
    ContainerPhotoCategory("Backdoor", true),
    ContainerPhotoCategory("Front", true),
    ContainerPhotoCategory("LeftSideOut", true),
    ContainerPhotoCategory("RightSideOut", true),
    ContainerPhotoCategory("Others", false),
)
private const val DAMAGE_PHOTO_CATEGORY = "Damage"
private val REQUIRED_PHOTO_CATEGORY_VALUES = CONTAINER_PHOTO_GRID_CATEGORIES
    .filter { it.required }
    .map { it.value }
private data class PhotoProgressCacheEntry(
    val uploadedRequired: Int,
    val updatedAtMs: Long,
)

private data class PreForecastListCacheEntry(
    val items: List<PreAdviceDto>,
    val updatedAtMs: Long,
)

private const val PHOTO_PROGRESS_CACHE_TTL_MS = 60_000L
private const val PREFORECAST_LIST_CACHE_TTL_MS = 60_000L
private val PreForecastPhotoProgressCache = mutableMapOf<Int, PhotoProgressCacheEntry>()
private var PreForecastListCache: PreForecastListCacheEntry? = null

internal fun clearPreForecastScreenCache() {
    PreForecastListCache = null
    PreForecastPhotoProgressCache.clear()
}

@Composable
private fun PreForecastPhotosTabContent(
    canManagePhotos: Boolean,
    docsByCategory: Map<String, PreAdviceDocumentDto>,
    damageByView: Map<String, PreAdviceDocumentDto>,
    damageDocs: List<Pair<ContainerPhotoCategory, PreAdviceDocumentDto>>,
    actionLoading: Boolean,
    accessToken: String?,
    onUpload: (ContainerPhotoCategory) -> Unit,
    onDamage: (ContainerPhotoCategory) -> Unit,
    onView: (PreAdviceDocumentDto) -> Unit,
    onDelete: (PreAdviceDocumentDto) -> Unit,
    onDamageUpdate: (ContainerPhotoCategory, PreAdviceDocumentDto) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(stringResource(R.string.preforecast_container_photos_title), style = MaterialTheme.typography.titleMedium)
        if (canManagePhotos) {
            Text(
                stringResource(R.string.preforecast_container_photos_manage_hint),
                style = MaterialTheme.typography.bodySmall,
                color = IcsColors.TextSecondary,
            )
        }
        CONTAINER_PHOTO_GRID_CATEGORIES.chunked(2).forEach { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { category ->
                    val doc = docsByCategory[category.value]
                    ContainerPhotoCard(
                        category = category,
                        document = doc,
                        damageDocument = damageByView[category.value],
                        canManage = canManagePhotos,
                        loading = actionLoading,
                        accessToken = accessToken,
                        onUpload = { onUpload(category) },
                        onDamage = { onDamage(category) },
                        onView = { doc?.let(onView) },
                        onDelete = { doc?.let(onDelete) },
                        modifier = Modifier.weight(1f),
                    )
                }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
        if (damageDocs.isNotEmpty()) {
            Spacer(Modifier.height(8.dp))
            Text(
                stringResource(R.string.preforecast_damage_photos_title),
                style = MaterialTheme.typography.titleMedium,
                color = IcsColors.Error,
            )
            Text(
                stringResource(R.string.preforecast_damage_photos_hint),
                style = MaterialTheme.typography.bodySmall,
                color = IcsColors.TextSecondary,
            )
            damageDocs.chunked(2).forEach { row ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    row.forEach { (category, doc) ->
                        DamagePhotoCard(
                            category = category,
                            document = doc,
                            canManage = canManagePhotos,
                            loading = actionLoading,
                            accessToken = accessToken,
                            onUpdate = { onDamageUpdate(category, doc) },
                            onView = { onView(doc) },
                            onDelete = { onDelete(doc) },
                            modifier = Modifier.weight(1f),
                        )
                    }
                    if (row.size == 1) Spacer(Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun PreForecastListRowCard(
    title: String,
    subtitle: String,
    statusLabel: String,
    statusColor: Color,
    statusBackground: Color,
    qrCode: String?,
    logicteckLabel: String?,
    uploaded: Int?,
    total: Int,
    onClick: () -> Unit,
    onViewQr: (() -> Unit)?,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = IcsColors.Surface),
        border = androidx.compose.foundation.BorderStroke(1.dp, IcsColors.Divider),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Text(
                        title,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                    )
                    Text(subtitle, style = MaterialTheme.typography.bodySmall, color = IcsColors.TextSecondary)
                    if (uploaded != null) {
                        PhotoProgressChip(uploaded = uploaded, total = total)
                    } else {
                        Text(
                            stringResource(R.string.preforecast_checking_photos),
                            style = MaterialTheme.typography.labelSmall,
                            color = IcsColors.TextSecondary,
                        )
                    }
                }
                Surface(color = statusBackground, shape = MaterialTheme.shapes.small) {
                    Text(
                        statusLabel,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelMedium,
                        color = statusColor,
                    )
                }
            }
            if (qrCode != null || logicteckLabel != null) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    qrCode?.takeIf { it.isNotBlank() }?.let { code ->
                        Surface(
                            color = IcsColors.Divider.copy(alpha = 0.2f),
                            shape = MaterialTheme.shapes.small,
                            border = androidx.compose.foundation.BorderStroke(1.dp, IcsColors.Divider),
                        ) {
                            Text(
                                code,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                style = MaterialTheme.typography.labelSmall,
                            )
                        }
                    }
                    logicteckLabel?.let { label ->
                        Surface(color = IcsColors.Primary.copy(alpha = 0.12f), shape = MaterialTheme.shapes.small) {
                            Text(
                                "LOGICTECK · $label",
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                style = MaterialTheme.typography.labelSmall,
                                color = IcsColors.Primary,
                            )
                        }
                    }
                }
            }
            if (onViewQr != null) {
                OutlinedButton(onClick = onViewQr, modifier = Modifier.fillMaxWidth()) {
                    Text(stringResource(R.string.action_view_qr))
                }
            }
        }
    }
}

@Composable
private fun ContainerPhotoCard(
    category: ContainerPhotoCategory,
    document: PreAdviceDocumentDto?,
    damageDocument: PreAdviceDocumentDto?,
    canManage: Boolean,
    loading: Boolean,
    accessToken: String?,
    onUpload: () -> Unit,
    onDamage: () -> Unit,
    onView: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(enabled = canManage && !loading, onClick = onUpload),
        colors = CardDefaults.cardColors(containerColor = IcsColors.Surface),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (document != null) IcsColors.Primary.copy(alpha = 0.25f) else IcsColors.Divider,
        ),
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(containerPhotoLabel(category.value), style = MaterialTheme.typography.titleSmall)
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    if (damageDocument != null) {
                        Surface(
                            color = IcsColors.Error.copy(alpha = 0.12f),
                            shape = MaterialTheme.shapes.small,
                        ) {
                            Text(
                                stringResource(R.string.preforecast_damage_badge),
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                style = MaterialTheme.typography.labelSmall,
                                color = IcsColors.Error,
                            )
                        }
                    }
                    if (!category.required) {
                        Text(stringResource(R.string.label_optional), style = MaterialTheme.typography.labelSmall, color = IcsColors.TextSecondary)
                    }
                }
            }
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(150.dp)
                    .background(Color(0xFFF8FAFC)),
                contentAlignment = Alignment.Center,
            ) {
                if (document != null) {
                    AsyncImage(
                        model = remember(document.filePath, accessToken) {
                            buildAuthedImageRequest(context, document.filePath, accessToken)
                        },
                        contentDescription = containerPhotoLabel(category.value),
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop,
                    )
                } else {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.PhotoCamera, contentDescription = null, tint = IcsColors.TextSecondary)
                        Text(
                            if (canManage) stringResource(R.string.preforecast_tap_to_upload) else stringResource(R.string.preforecast_no_photo),
                            style = MaterialTheme.typography.bodySmall,
                            color = IcsColors.TextSecondary,
                        )
                    }
                }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                if (document != null) {
                    if (canManage) {
                        IconButton(enabled = !loading, onClick = onDamage) {
                            Icon(Icons.Default.ReportProblem, contentDescription = stringResource(R.string.content_desc_damage))
                        }
                    }
                    IconButton(onClick = onView) {
                        Icon(Icons.Default.ZoomIn, contentDescription = stringResource(R.string.content_desc_view))
                    }
                    if (canManage) {
                        IconButton(enabled = !loading, onClick = onDelete) {
                            Icon(Icons.Default.DeleteOutline, contentDescription = stringResource(R.string.content_desc_remove))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DamagePhotoCard(
    category: ContainerPhotoCategory,
    document: PreAdviceDocumentDto,
    canManage: Boolean,
    loading: Boolean,
    accessToken: String?,
    onUpdate: () -> Unit,
    onView: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = IcsColors.Surface),
        border = androidx.compose.foundation.BorderStroke(1.dp, IcsColors.Error.copy(alpha = 0.4f)),
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(containerPhotoLabel(category.value), style = MaterialTheme.typography.titleSmall, color = IcsColors.Error)
                Surface(color = IcsColors.Error.copy(alpha = 0.12f), shape = MaterialTheme.shapes.small) {
                    Text(
                        stringResource(R.string.preforecast_damage_badge),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = IcsColors.Error,
                    )
                }
            }
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(150.dp)
                    .background(Color(0xFFF8FAFC)),
                contentAlignment = Alignment.Center,
            ) {
                AsyncImage(
                    model = remember(document.filePath, accessToken) {
                        buildAuthedImageRequest(context, document.filePath, accessToken)
                    },
                    contentDescription = containerPhotoLabel(category.value),
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                )
            }
            Text(
                parseDamageDescription(document.comment).ifBlank { stringResource(R.string.preforecast_no_description) },
                style = MaterialTheme.typography.bodySmall,
                color = IcsColors.TextSecondary,
            )
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                if (canManage) {
                    IconButton(enabled = !loading, onClick = onUpdate) {
                        Icon(Icons.Default.ReportProblem, contentDescription = stringResource(R.string.content_desc_update_damage))
                    }
                }
                IconButton(onClick = onView) {
                    Icon(Icons.Default.ZoomIn, contentDescription = stringResource(R.string.content_desc_view))
                }
                if (canManage) {
                    IconButton(enabled = !loading, onClick = onDelete) {
                        Icon(Icons.Default.DeleteOutline, contentDescription = stringResource(R.string.content_desc_remove))
                    }
                }
            }
        }
    }
}

@Composable
private fun containerPhotoLabel(category: String?): String = when (category) {
    "Flooring" -> stringResource(R.string.container_photo_flooring)
    "RightSideIn" -> stringResource(R.string.container_photo_right_side_in)
    "LeftSideIn" -> stringResource(R.string.container_photo_left_side_in)
    "Back" -> stringResource(R.string.container_photo_back)
    "Backdoor" -> stringResource(R.string.container_photo_backdoor)
    "Front" -> stringResource(R.string.container_photo_front)
    "LeftSideOut" -> stringResource(R.string.container_photo_left_side_out)
    "RightSideOut" -> stringResource(R.string.container_photo_right_side_out)
    "Others" -> stringResource(R.string.container_photo_others)
    else -> category ?: stringResource(R.string.container_photo_generic)
}

private fun toAssetUrl(path: String): String {
    val normalizedPath = path.replace("\\", "/")
    if (normalizedPath.startsWith("http://") || normalizedPath.startsWith("https://")) return normalizedPath
    val base = BuildConfig.API_BASE_URL
        .trimEnd('/')
        .replace(Regex("/api$"), "")
    val normalized = if (normalizedPath.startsWith("/")) normalizedPath else "/$normalizedPath"
    return "$base$normalized"
}

private fun buildAuthedImageRequest(
    context: android.content.Context,
    filePath: String,
    accessToken: String?,
): ImageRequest {
    val url = toAssetUrl(filePath)
    return ImageRequest.Builder(context)
        .data(url)
        .apply {
            if (!accessToken.isNullOrBlank()) {
                addHeader("Authorization", "Bearer $accessToken")
            }
        }
        .crossfade(true)
        .build()
}

@Composable
private fun NewPreForecastPhotoCard(
    category: ContainerPhotoCategory,
    imageUri: Uri?,
    loading: Boolean,
    onSelect: () -> Unit,
    onRemove: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(enabled = !loading, onClick = onSelect),
        colors = CardDefaults.cardColors(containerColor = IcsColors.Surface),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (imageUri != null) IcsColors.Primary.copy(alpha = 0.25f) else IcsColors.Divider,
        ),
    ) {
        Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(containerPhotoLabel(category.value), style = MaterialTheme.typography.labelMedium)
                if (!category.required) {
                    Text(stringResource(R.string.label_optional), style = MaterialTheme.typography.labelSmall, color = IcsColors.TextSecondary)
                }
            }
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp)
                    .background(Color(0xFFF8FAFC)),
                contentAlignment = Alignment.Center,
            ) {
                if (imageUri != null) {
                    AsyncImage(
                        model = imageUri,
                        contentDescription = containerPhotoLabel(category.value),
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop,
                    )
                } else {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.PhotoCamera, contentDescription = null, tint = IcsColors.TextSecondary)
                        Text(stringResource(R.string.preforecast_tap_to_add), style = MaterialTheme.typography.labelSmall, color = IcsColors.TextSecondary)
                    }
                }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                if (imageUri != null) {
                    IconButton(enabled = !loading, onClick = onRemove) {
                        Icon(Icons.Default.DeleteOutline, contentDescription = stringResource(R.string.content_desc_remove))
                    }
                }
            }
        }
    }
}

private fun formatDamageComment(view: String, description: String): String {
    return "[$view] ${description.trim()}"
}

private fun parseDamageView(comment: String?): String? {
    if (comment.isNullOrBlank()) return null
    val match = Regex("^\\[([A-Za-z]+)]").find(comment)
    return match?.groupValues?.getOrNull(1)
}

private fun parseDamageDescription(comment: String?): String {
    if (comment.isNullOrBlank()) return ""
    return comment.replace(Regex("^\\[[A-Za-z]+]\\s*"), "").trim()
}

@Composable
internal fun PhotoProgressChip(uploaded: Int, total: Int) {
    val done = uploaded >= total
    val bg = if (done) IcsColors.Success.copy(alpha = 0.14f) else IcsColors.Primary.copy(alpha = 0.12f)
    val fg = if (done) IcsColors.Success else IcsColors.Primary
    Surface(color = bg, shape = MaterialTheme.shapes.small) {
        Text(
            text = "$uploaded/$total photos",
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelMedium,
            color = fg,
        )
    }
}
