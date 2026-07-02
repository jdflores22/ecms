package com.ecms.trucker.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.material3.MenuAnchorType
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.ecms.trucker.R
import com.ecms.trucker.data.model.*
import com.ecms.trucker.data.repository.TruckerRepository
import com.ecms.trucker.ui.components.*
import com.ecms.trucker.ui.theme.IcsColors
import com.ecms.trucker.util.QrCodeGenerator
import kotlinx.coroutines.launch
import java.time.LocalDate

private data class WithdrawalsListCacheEntry(
    val items: List<WithdrawalDto>,
    val updatedAtMs: Long,
)

private const val WITHDRAWALS_LIST_CACHE_TTL_MS = 60_000L
private var WithdrawalsListCache: WithdrawalsListCacheEntry? = null

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WithdrawalsListScreen(
    repository: TruckerRepository,
    onOpenNotifications: () -> Unit,
    onItemClick: (Int) -> Unit,
    onNewClick: () -> Unit,
) {
    val cachedItems = WithdrawalsListCache
        ?.takeIf { System.currentTimeMillis() - it.updatedAtMs <= WITHDRAWALS_LIST_CACHE_TTL_MS }
        ?.items
        ?: emptyList()
    var items by remember { mutableStateOf(cachedItems) }
    var loading by remember { mutableStateOf(cachedItems.isEmpty()) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun load(force: Boolean = false) {
        scope.launch {
            if (items.isEmpty()) loading = true
            if (!force) {
                WithdrawalsListCache
                    ?.takeIf { System.currentTimeMillis() - it.updatedAtMs <= WITHDRAWALS_LIST_CACHE_TTL_MS }
                    ?.let { entry ->
                        items = entry.items
                        loading = false
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
            loading = false
        }
    }
    LaunchedEffect(Unit) { load(force = cachedItems.isEmpty()) }

    IcsScreenScaffold(
        title = stringResource(R.string.withdrawals_title),
        branded = true,
        onNotificationClick = onOpenNotifications,
        refreshing = loading,
        onRefresh = { load(force = true) },
        floatingActionButton = {
            IcsFab(onClick = onNewClick) {
                Icon(Icons.Default.Add, contentDescription = stringResource(R.string.content_desc_new_withdrawal))
            }
        },
    ) { padding ->
        when {
            loading -> LoadingBox(Modifier.padding(padding))
            error != null -> ErrorMessage(error!!, { load() }, Modifier.padding(padding))
            items.isEmpty() -> EmptyState(stringResource(R.string.withdrawal_empty), Modifier.padding(padding))
            else -> LazyColumn(Modifier.padding(padding), contentPadding = PaddingValues(vertical = 8.dp)) {
                items(items) { w ->
                    IcsListItemCard(
                        title = w.referenceNo,
                        subtitle = "${w.atwNumber} · ${w.containerSummary}",
                        status = w.status,
                        onClick = { onItemClick(w.id) },
                    )
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
    onBack: () -> Unit,
) {
    var withdrawal by remember { mutableStateOf<WithdrawalDto?>(null) }
    var gatePass by remember { mutableStateOf<WithdrawalGatePassDto?>(null) }
    var loading by remember { mutableStateOf(true) }
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
            loading = true
            runCatching {
                withdrawal = repository.getWithdrawal(id)
                if (withdrawal!!.status.equals("Approved", true) ||
                    withdrawal!!.status.equals("Released", true) ||
                    withdrawal!!.status.equals("Completed", true)
                ) {
                    gatePass = runCatching { repository.getWithdrawalGatePass(id) }.getOrNull()
                }
            }.onFailure { error = it.message }
            loading = false
        }
    }
    LaunchedEffect(id) { load() }

    IcsScreenScaffold(
        title = stringResource(R.string.withdrawal_detail_title),
        onBack = onBack,
        refreshing = loading,
        onRefresh = { load() },
    ) { padding ->
        when {
            loading -> LoadingBox(Modifier.padding(padding))
            error != null && withdrawal == null -> ErrorMessage(error!!, { load() }, Modifier.padding(padding))
            withdrawal != null -> {
                val w = withdrawal!!
                val isDraft = w.status.equals("Draft", true)
                val isIssued = w.status.equals("Issued", true)
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
                    if (isDraft || isIssued) {
                        item {
                            IcsSectionCard(title = stringResource(R.string.section_actions)) {
                                if (!w.hasAtwDocument) {
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
                                    enabled = !actionLoading && (w.hasAtwDocument || isIssued),
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

@Composable
fun WithdrawalNewScreen(
    repository: TruckerRepository,
    onCreated: (Int) -> Unit,
    onBack: () -> Unit,
) {
    var config by remember { mutableStateOf<WithdrawalFormConfigDto?>(null) }
    var atwNumber by remember { mutableStateOf("") }
    var shippingLineId by remember { mutableIntStateOf(0) }
    var depotId by remember { mutableIntStateOf(0) }
    var destination by remember { mutableStateOf("") }
    var containerNo by remember { mutableStateOf("") }
    var sizeId by remember { mutableIntStateOf(0) }
    var typeId by remember { mutableIntStateOf(0) }
    var remarks by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(true) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }
    val refreshMessage = stringResource(R.string.refresh_feedback_withdrawal_form)
    val today = LocalDate.now().toString()
    val expiry = LocalDate.now().plusDays(7).toString()

    fun loadFormConfig() {
        scope.launch {
            loading = true
            runCatching { config = repository.getWithdrawalFormConfig() }
                .onFailure { error = it.message }
            loading = false
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
        refreshing = loading,
        onRefresh = { refreshFormConfig() },
        showRefreshFeedback = false,
        snackbarHost = { _ -> SnackbarHost(hostState = snackbarHostState) },
    ) { padding ->
        if (loading) {
            LoadingBox(Modifier.padding(padding))
        } else {
            Column(Modifier.padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
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
