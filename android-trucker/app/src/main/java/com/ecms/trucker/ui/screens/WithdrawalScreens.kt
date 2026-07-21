package com.ecms.trucker.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material3.*
import androidx.compose.material3.MenuAnchorType
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.ecms.trucker.R
import com.ecms.trucker.data.local.TokenStore
import com.ecms.trucker.data.model.*
import com.ecms.trucker.data.repository.TruckerRepository
import com.ecms.trucker.ui.components.*
import com.ecms.trucker.ui.theme.IcsColors
import com.ecms.trucker.ui.theme.icsHexAlpha
import com.ecms.trucker.ui.util.formatScheduleDate
import com.ecms.trucker.ui.util.formatScheduleTime
import com.ecms.trucker.ui.util.rememberScreenLoadState
import com.ecms.trucker.util.QrCodeGenerator
import kotlinx.coroutines.launch
import java.time.LocalDate

private data class WithdrawalsListCacheEntry(
    val items: List<WithdrawalDto>,
    val updatedAtMs: Long,
)

private const val WITHDRAWALS_LIST_CACHE_TTL_MS = 60_000L
private var WithdrawalsListCache: WithdrawalsListCacheEntry? = null

internal fun clearWithdrawalsScreenCache() {
    WithdrawalsListCache = null
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WithdrawalsListScreen(
    repository: TruckerRepository,
    onOpenNotifications: () -> Unit,
    notificationUnreadCount: Int = 0,
    onItemClick: (Int) -> Unit,
    onNewClick: () -> Unit,
    onScheduleClick: () -> Unit,
) {
    val cachedItems = WithdrawalsListCache
        ?.takeIf { System.currentTimeMillis() - it.updatedAtMs <= WITHDRAWALS_LIST_CACHE_TTL_MS }
        ?.items
        ?: emptyList()
    val loadState = rememberScreenLoadState(initiallyLoading = cachedItems.isEmpty())
    var items by remember { mutableStateOf(cachedItems) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun load(force: Boolean = false) {
        scope.launch {
            loadState.begin(items.isNotEmpty())
            if (!force) {
                WithdrawalsListCache
                    ?.takeIf { System.currentTimeMillis() - it.updatedAtMs <= WITHDRAWALS_LIST_CACHE_TTL_MS }
                    ?.let { entry ->
                        items = entry.items
                        loadState.end()
                        return@launch
                    }
            }
            runCatching { repository.listWithdrawals() }
                .onSuccess {
                    items = it
                    WithdrawalsListCache = WithdrawalsListCacheEntry(
                        items = it,
                        updatedAtMs = System.currentTimeMillis(),
                    )
                }
                .onFailure { error = it.message }
            loadState.end()
        }
    }
    LaunchedEffect(Unit) { load(force = cachedItems.isEmpty()) }

    val summary = remember(items) {
        WithdrawalListSummary(
            total = items.size,
            awaiting = items.count { it.status.equals("Booked", true) || it.status.equals("CyAssigned", true) },
            scheduled = items.count { it.status.equals("Scheduled", true) },
            approved = items.count {
                it.status.equals("Approved", true) ||
                    it.status.equals("Released", true) ||
                    it.status.equals("Completed", true)
            },
        )
    }

    IcsScreenScaffold(
        title = stringResource(R.string.withdrawals_title),
        branded = true,
        onNotificationClick = onOpenNotifications,
        notificationUnreadCount = notificationUnreadCount,
        refreshing = loadState.refreshing,
        onRefresh = { load(force = true) },
        actions = {
            IconButton(onClick = onScheduleClick) {
                Icon(
                    Icons.Outlined.CalendarMonth,
                    contentDescription = stringResource(R.string.withdrawal_pickup_schedule_btn),
                )
            }
        },
        floatingActionButton = {
            IcsFab(onClick = onNewClick) {
                Icon(Icons.Default.Add, contentDescription = stringResource(R.string.content_desc_new_withdrawal))
            }
        },
    ) { padding ->
        when {
            loadState.loading -> LoadingBox(Modifier.padding(padding))
            error != null -> ErrorMessage(error!!, { load() }, Modifier.padding(padding))
            items.isEmpty() -> EmptyState(stringResource(R.string.withdrawal_empty), Modifier.padding(padding))
            else -> LazyColumn(Modifier.padding(padding), contentPadding = PaddingValues(vertical = 8.dp)) {
                item {
                    WithdrawalSummaryGrid(summary, Modifier.padding(horizontal = 16.dp, vertical = 8.dp))
                }
                items(items) { w ->
                    WithdrawalListCard(w = w, onClick = { onItemClick(w.id) })
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WithdrawalDetailScreen(
    id: Int,
    repository: TruckerRepository,
    tokenStore: TokenStore,
    onBack: () -> Unit,
) {
    val loadState = rememberScreenLoadState(initiallyLoading = true)
    var withdrawal by remember { mutableStateOf<WithdrawalDto?>(null) }
    var documents by remember { mutableStateOf<List<WithdrawalDocumentDto>>(emptyList()) }
    var gatePass by remember { mutableStateOf<WithdrawalGatePassDto?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var actionLoading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val docPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        uri ?: return@rememberLauncherForActivityResult
        scope.launch {
            actionLoading = true
            runCatching { repository.uploadWithdrawalDocument(id, uri) }
                .onSuccess { withdrawal = repository.getWithdrawal(id) }
                .onFailure { error = it.message }
            actionLoading = false
        }
    }

    fun load() {
        scope.launch {
            loadState.begin(withdrawal != null)
            runCatching {
                withdrawal = repository.getWithdrawal(id)
                documents = runCatching { repository.getWithdrawalDocuments(id) }.getOrDefault(emptyList())
                if (withdrawal!!.status.equals("Approved", true) ||
                    withdrawal!!.status.equals("Released", true) ||
                    withdrawal!!.status.equals("Completed", true)
                ) {
                    gatePass = runCatching { repository.getWithdrawalGatePass(id) }.getOrNull()
                } else {
                    gatePass = null
                }
            }.onFailure { error = it.message }
            loadState.end()
        }
    }
    LaunchedEffect(id) { load() }

    IcsScreenScaffold(
        title = stringResource(R.string.withdrawal_detail_title),
        onBack = onBack,
        refreshing = loadState.refreshing,
        onRefresh = { load() },
    ) { padding ->
        when {
            loadState.loading && withdrawal == null -> LoadingBox(Modifier.padding(padding))
            error != null && withdrawal == null -> ErrorMessage(error!!, { load() }, Modifier.padding(padding))
            withdrawal != null -> {
                val w = withdrawal!!
                val isDraft = w.status.equals("Draft", true)
                val isIssued = w.status.equals("Issued", true)
                val isIssueFirstCyAssigned = w.status.equals("CyAssigned", true) && w.bookedAt.isNullOrBlank()
                val showSubmitActions = isDraft || isIssued || isIssueFirstCyAssigned
                val showGatePass = w.status.equals("Approved", true) ||
                    w.status.equals("Released", true) ||
                    w.status.equals("Completed", true)

                IcsDetailScaffoldContent(Modifier.padding(padding)) {
                    item {
                        IcsDetailHeader(
                            referenceNo = w.referenceNo,
                            status = w.status,
                            belowStatus = {
                                WithdrawalStatusTimeline(status = w.status)
                            },
                        )
                    }
                    w.pickupSchedule?.let { schedule ->
                        item {
                            val slotSuffix = if (schedule.slotNo > 0) {
                                stringResource(R.string.withdrawal_pickup_slot, schedule.slotNo)
                            } else {
                                ""
                            }
                            Surface(
                                color = icsHexAlpha(IcsColors.Primary, 0.08f),
                                shape = MaterialTheme.shapes.medium,
                            ) {
                                Text(
                                    stringResource(
                                        R.string.withdrawal_pickup_scheduled,
                                        formatScheduleDate(schedule.date),
                                        formatScheduleTime(schedule.time),
                                        slotSuffix,
                                        schedule.depotName,
                                    ),
                                    modifier = Modifier.padding(12.dp),
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = IcsColors.Primary,
                                )
                            }
                        }
                    }
                    item {
                        IcsSectionCard(title = stringResource(R.string.withdrawal_summary_title)) {
                            IcsInfoTileGrid(
                                tiles = buildList {
                                    add(stringResource(R.string.field_atw_number) to w.atwNumber)
                                    add(stringResource(R.string.field_shipping_line) to w.shippingLineName)
                                    add(stringResource(R.string.field_current_cy) to w.currentDepotName)
                                    add(stringResource(R.string.field_destination) to w.destination)
                                    add(stringResource(R.string.field_purpose) to w.purpose.ifBlank { stringResource(R.string.withdrawal_default_purpose) })
                                    add(stringResource(R.string.field_issue_date) to w.issueDate)
                                    add(stringResource(R.string.field_expiration_date) to w.expirationDate)
                                    w.submittedAt?.let { add(stringResource(R.string.field_submitted) to it) }
                                },
                            )
                            w.remarks?.takeIf { it.isNotBlank() }?.let { remarks ->
                                Spacer(Modifier.height(8.dp))
                                IcsInfoTile(stringResource(R.string.field_remarks), remarks)
                            }
                            w.reviewRemarks?.takeIf { it.isNotBlank() }?.let { remarks ->
                                Spacer(Modifier.height(8.dp))
                                IcsInfoTile(stringResource(R.string.field_cy_review_remarks), remarks)
                            }
                        }
                    }
                    if (showSubmitActions) {
                        item {
                            IcsSectionCard(title = stringResource(R.string.section_actions)) {
                                if (!w.hasAtwDocument && (isDraft || isIssued)) {
                                    OutlinedButton(
                                        onClick = { docPicker.launch("*/*") },
                                        modifier = Modifier.fillMaxWidth(),
                                        enabled = !actionLoading,
                                    ) { Text(stringResource(R.string.withdrawal_upload_atw_certificate)) }
                                    Spacer(Modifier.height(8.dp))
                                } else {
                                    Text(
                                        stringResource(R.string.withdrawal_atw_certificate_uploaded),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = IcsColors.Success,
                                        modifier = Modifier.padding(bottom = 8.dp),
                                    )
                                }
                                IcsPrimaryButton(
                                    text = stringResource(R.string.withdrawal_submit_to_cy),
                                    onClick = {
                                        scope.launch {
                                            actionLoading = true
                                            runCatching { repository.submitWithdrawal(id) }.onSuccess { load() }
                                                .onFailure { error = it.message }
                                            actionLoading = false
                                        }
                                    },
                                    enabled = !actionLoading && (w.hasAtwDocument || isIssued || isIssueFirstCyAssigned),
                                    loading = actionLoading,
                                )
                            }
                        }
                    }
                    if (showGatePass && gatePass != null) {
                        val gp = gatePass!!
                        item {
                            IcsSectionCard(title = stringResource(R.string.withdrawal_gate_pass_title)) {
                                IcsInfoTileGrid(
                                    tiles = listOf(
                                        stringResource(R.string.field_gate_code) to gp.gateCode,
                                        stringResource(R.string.field_valid_until) to gp.expiresOn,
                                    ),
                                )
                                Spacer(Modifier.height(12.dp))
                                val bmp = remember(gp.qrPayload) { QrCodeGenerator.generate(gp.qrPayload, 256) }
                                Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                                    Image(
                                        bmp.asImageBitmap(),
                                        contentDescription = stringResource(R.string.content_desc_gate_pass_qr),
                                        modifier = Modifier.size(200.dp),
                                    )
                                }
                            }
                        }
                    }
                    if (documents.isNotEmpty()) {
                        item {
                            WithdrawalReleaseCertificates(
                                documents = documents,
                                tokenStore = tokenStore,
                                modifier = Modifier.padding(horizontal = 4.dp),
                            )
                        }
                    }
                    item {
                        IcsContainerLinesSection(lines = w.lines, summary = w.containerSummary)
                    }
                    error?.let { msg ->
                        item {
                            Text(msg, color = IcsColors.Error, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        }
    }
}

private data class WithdrawalListSummary(
    val total: Int,
    val awaiting: Int,
    val scheduled: Int,
    val approved: Int,
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun WithdrawalListCard(w: WithdrawalDto, onClick: () -> Unit) {
    val maxVisible = 5
    val totalContainers = maxOf(w.containerCount, w.lines.size)
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 5.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        color = IcsColors.Surface,
        shadowElevation = 1.dp,
        border = BorderStroke(1.dp, IcsColors.Divider),
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.Top,
            ) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(
                        w.referenceNo,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        w.atwNumber,
                        style = MaterialTheme.typography.bodySmall,
                        color = IcsColors.TextSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                StatusChip(w.status)
            }

            if (w.lines.isNotEmpty()) {
                val visible = w.lines.take(maxVisible)
                val remaining = w.lines.size - visible.size
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    visible.forEach { line ->
                        WithdrawalContainerChip(text = line.containerNo)
                    }
                    if (remaining > 0) {
                        WithdrawalContainerChip(text = "+$remaining more", emphasized = true)
                    }
                }
            } else if (w.containerSummary.isNotBlank() && w.containerSummary != "—") {
                Text(
                    w.containerSummary,
                    style = MaterialTheme.typography.bodySmall,
                    color = IcsColors.TextSecondary,
                )
            }

            if (totalContainers > 0) {
                Text(
                    text = if (totalContainers == 1) "1 container" else "$totalContainers containers",
                    style = MaterialTheme.typography.labelSmall,
                    color = IcsColors.TextSecondary,
                )
            }
        }
    }
}

@Composable
private fun WithdrawalContainerChip(text: String, emphasized: Boolean = false) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = if (emphasized) icsHexAlpha(IcsColors.Primary, 0.12f) else IcsColors.SurfaceMuted,
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelMedium,
            fontWeight = if (emphasized) FontWeight.SemiBold else FontWeight.Medium,
            color = if (emphasized) IcsColors.Primary else IcsColors.OnSurface,
        )
    }
}

@Composable
private fun WithdrawalSummaryGrid(summary: WithdrawalListSummary, modifier: Modifier = Modifier) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            WithdrawalSummaryCard(
                label = stringResource(R.string.withdrawal_summary_total),
                value = summary.total,
                color = IcsColors.Primary,
                modifier = Modifier.weight(1f),
            )
            WithdrawalSummaryCard(
                label = stringResource(R.string.withdrawal_summary_awaiting),
                value = summary.awaiting,
                color = IcsColors.Warning,
                modifier = Modifier.weight(1f),
            )
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            WithdrawalSummaryCard(
                label = stringResource(R.string.withdrawal_summary_scheduled),
                value = summary.scheduled,
                color = IcsColors.Primary,
                modifier = Modifier.weight(1f),
            )
            WithdrawalSummaryCard(
                label = stringResource(R.string.withdrawal_summary_approved),
                value = summary.approved,
                color = IcsColors.Success,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun WithdrawalSummaryCard(
    label: String,
    value: Int,
    color: androidx.compose.ui.graphics.Color,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier,
        shape = MaterialTheme.shapes.medium,
        border = ButtonDefaults.outlinedButtonBorder(enabled = true),
        color = MaterialTheme.colorScheme.surface,
    ) {
        Column(Modifier.padding(12.dp)) {
            Text(label, style = MaterialTheme.typography.labelSmall, color = IcsColors.TextSecondary)
            Text(
                "$value",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = color,
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WithdrawalScheduleScreen(
    repository: TruckerRepository,
    onBack: () -> Unit,
    onItemClick: (Int) -> Unit,
) {
    val loadState = rememberScreenLoadState(initiallyLoading = true)
    var items by remember { mutableStateOf<List<WithdrawalScheduleDto>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun load() {
        scope.launch {
            loadState.begin(items.isNotEmpty())
            runCatching { items = repository.getMyWithdrawalSchedules() }
                .onFailure { error = it.message }
            loadState.end()
        }
    }
    LaunchedEffect(Unit) { load() }

    val upcomingCount = items.count { it.status.equals("Scheduled", true) }

    IcsScreenScaffold(
        title = stringResource(R.string.withdrawal_schedule_title),
        subtitle = stringResource(R.string.withdrawal_schedule_subtitle),
        onBack = onBack,
        refreshing = loadState.refreshing,
        onRefresh = { load() },
    ) { padding ->
        when {
            loadState.loading -> LoadingBox(Modifier.padding(padding))
            error != null -> ErrorMessage(error!!, { load() }, Modifier.padding(padding))
            items.isEmpty() -> EmptyState(stringResource(R.string.withdrawal_schedule_empty), Modifier.padding(padding))
            else -> LazyColumn(
                Modifier.padding(padding),
                contentPadding = PaddingValues(vertical = 8.dp),
            ) {
                item {
                    Text(
                        stringResource(R.string.withdrawal_schedule_upcoming, upcomingCount),
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    )
                }
                items(items) { row ->
                    IcsListItemCard(
                        title = row.referenceNo,
                        subtitle = buildString {
                            append(formatScheduleDate(row.date))
                            append(" · ")
                            append(formatScheduleTime(row.time))
                            if (row.slotNo > 0) append(" · Slot ${row.slotNo}")
                            append("\n")
                            append(row.depotName)
                            append(" · ")
                            append(row.containerSummary)
                        },
                        status = row.status,
                        onClick = { onItemClick(row.withdrawalRequestId) },
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                    )
                }
            }
        }
    }
}

@Composable
fun WithdrawalNewScreen(
    repository: TruckerRepository,
    onCreated: (Int) -> Unit,
    onBack: () -> Unit,
) {
    val loadState = rememberScreenLoadState(initiallyLoading = true)
    var config by remember { mutableStateOf<WithdrawalFormConfigDto?>(null) }
    var atwNumber by remember { mutableStateOf("") }
    var shippingLineId by remember { mutableIntStateOf(0) }
    var depotId by remember { mutableIntStateOf(0) }
    var destination by remember { mutableStateOf("") }
    var containerNo by remember { mutableStateOf("") }
    var sizeId by remember { mutableIntStateOf(0) }
    var typeId by remember { mutableIntStateOf(0) }
    var remarks by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }
    val refreshMessage = stringResource(R.string.refresh_feedback_withdrawal_form)
    val today = LocalDate.now().toString()
    val expiry = LocalDate.now().plusDays(7).toString()

    fun loadFormConfig() {
        scope.launch {
            loadState.begin(config != null)
            runCatching { config = repository.getWithdrawalFormConfig() }
                .onFailure { error = it.message }
            loadState.end()
        }
    }

    fun refreshFormConfig() {
        loadFormConfig()
        scope.launch { snackbarHostState.showSnackbar(refreshMessage) }
    }
    LaunchedEffect(Unit) { loadFormConfig() }

    IcsScreenScaffold(
        title = stringResource(R.string.withdrawal_new_title),
        onBack = onBack,
        refreshing = loadState.refreshing,
        onRefresh = { refreshFormConfig() },
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
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedTextField(
                    atwNumber,
                    { atwNumber = it },
                    label = { Text(stringResource(R.string.field_atw_number)) },
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    containerNo,
                    { containerNo = it.uppercase() },
                    label = { Text(stringResource(R.string.field_container_number)) },
                    modifier = Modifier.fillMaxWidth(),
                )
                config?.let { c ->
                    WDropdown(stringResource(R.string.field_shipping_line), c.shippingLines.map { it.id to it.name }, shippingLineId) { shippingLineId = it }
                    WDropdown(stringResource(R.string.field_depot), c.depots.map { it.id to it.name }, depotId) { depotId = it }
                    WDropdown(stringResource(R.string.field_size), c.containerSizes.map { it.id to it.label }, sizeId) { sizeId = it }
                    WDropdown(stringResource(R.string.field_type), c.containerTypes.map { it.id to it.label }, typeId) { typeId = it }
                    WDropdown(stringResource(R.string.field_destination), c.destinations.map { 0 to it.label }.distinctBy { it.second }, 0) { idx ->
                        destination = c.destinations.getOrNull(idx)?.label ?: destination
                    }
                    if (destination.isBlank() && c.destinations.isNotEmpty()) destination = c.destinations.first().label
                }
                OutlinedTextField(
                    remarks,
                    { remarks = it },
                    label = { Text(stringResource(R.string.field_remarks)) },
                    modifier = Modifier.fillMaxWidth(),
                )
                error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                Button(
                    onClick = {
                        saving = true
                        scope.launch {
                            runCatching {
                                repository.createWithdrawal(
                                    CreateWithdrawalRequest(
                                        atwNumber = atwNumber.trim(),
                                        shippingLineId = shippingLineId,
                                        lines = listOf(WithdrawalLineInput(containerNo.trim(), sizeId, typeId)),
                                        currentDepotId = depotId,
                                        destination = destination,
                                        issueDate = today,
                                        expirationDate = expiry,
                                        remarks = remarks.ifBlank { null },
                                    ),
                                )
                            }.onSuccess { onCreated(it.id) }
                                .onFailure { error = it.message; saving = false }
                        }
                    },
                    enabled = !saving && atwNumber.isNotBlank() && containerNo.isNotBlank() && shippingLineId > 0 && depotId > 0,
                    modifier = Modifier.fillMaxWidth(),
                ) { Text(stringResource(R.string.action_create_draft)) }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun WDropdown(
    label: String,
    options: List<Pair<Int, String>>,
    selected: Int,
    onSelect: (Int) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedLabel = options.find { it.first == selected }?.second
        ?: stringResource(R.string.field_select_label, label)
    val isDestination = label == stringResource(R.string.field_destination)
    val displayValue = if (isDestination) options.firstOrNull()?.second ?: selectedLabel else selectedLabel

    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
        OutlinedTextField(
            value = displayValue,
            onValueChange = {},
            readOnly = true,
            label = { Text(label) },
            modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable, true).fillMaxWidth(),
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEachIndexed { index, (_, name) ->
                DropdownMenuItem(
                    text = { Text(name) },
                    onClick = {
                        if (isDestination) onSelect(index) else onSelect(options[index].first)
                        expanded = false
                    },
                )
            }
        }
    }
}
