package com.ecms.trucker.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.UploadFile
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.ecms.trucker.EcmsTruckerApp
import com.ecms.trucker.R
import com.ecms.trucker.data.local.AuthState
import com.ecms.trucker.data.model.DemurrageBillingDto
import com.ecms.trucker.data.model.NotificationDto
import com.ecms.trucker.data.repository.TruckerRepository
import com.ecms.trucker.ui.components.*
import com.ecms.trucker.ui.theme.IcsColors
import com.ecms.trucker.ui.theme.icsHexAlpha
import com.ecms.trucker.ui.util.buildAuthedImageRequest
import com.ecms.trucker.ui.util.formatRelativeTime
import com.ecms.trucker.ui.util.isImageProof
import com.ecms.trucker.ui.util.rememberScreenLoadState
import kotlinx.coroutines.launch

private val DEMURRAGE_TABS = listOf("Pending", "ForVerification", "Paid", "Rejected")

private fun demurrageTabLabel(tab: String): String = when (tab) {
    "Pending" -> "Payment due"
    "ForVerification" -> "Under review"
    else -> tab
}

private fun demurrageTabEmptyMessage(tab: String): String = when (tab) {
    "Pending" -> "No demurrage charges due right now."
    "ForVerification" -> "No payment proofs are under review."
    "Paid" -> "No settled demurrage billings yet."
    "Rejected" -> "No rejected payments."
    else -> "No billings in this view."
}

@Composable
private fun DemurrageSummaryRow(
    pendingCount: Int,
    rejectedCount: Int,
    reviewCount: Int,
    paidCount: Int,
    outstandingTotal: Double,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        DemurrageSummaryChip("Due", pendingCount + rejectedCount, "\u20B1$outstandingTotal", IcsColors.Warning, Modifier.weight(1f))
        DemurrageSummaryChip("Review", reviewCount, null, IcsColors.Primary, Modifier.weight(1f))
        DemurrageSummaryChip("Paid", paidCount, null, IcsColors.Success, Modifier.weight(1f))
    }
}

@Composable
private fun DemurrageSummaryChip(
    label: String,
    count: Int,
    subValue: String?,
    color: androidx.compose.ui.graphics.Color,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        color = icsHexAlpha(color, 0.08f),
        border = androidx.compose.foundation.BorderStroke(1.dp, icsHexAlpha(color, 0.2f)),
    ) {
        Column(Modifier.padding(10.dp)) {
            Text(label, style = MaterialTheme.typography.labelSmall, color = IcsColors.TextSecondary)
            Text("$count", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = color)
            subValue?.let {
                Text(it, style = MaterialTheme.typography.labelSmall, color = IcsColors.TextSecondary)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DemurrageListScreen(
    repository: TruckerRepository,
    onItemClick: (Int) -> Unit,
    onBack: (() -> Unit)? = null,
) {
    val loadState = rememberScreenLoadState(initiallyLoading = true)
    var items by remember { mutableStateOf<List<DemurrageBillingDto>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    var success by remember { mutableStateOf<String?>(null) }
    var uploadError by remember { mutableStateOf<String?>(null) }
    var activeTab by remember { mutableIntStateOf(0) }
    var uploadingId by remember { mutableIntStateOf(-1) }
    val scope = rememberCoroutineScope()
    val uploadSuccessMessage = stringResource(R.string.demurrage_upload_success)

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        val billingId = uploadingId
        if (uri == null || billingId < 0) return@rememberLauncherForActivityResult
        scope.launch {
            runCatching { repository.uploadDemurrageProof(billingId, uri, null, null) }
                .onSuccess {
                    success = uploadSuccessMessage
                    activeTab = 1
                    runCatching { items = repository.listDemurrageBillings() }
                }
                .onFailure { uploadError = it.message }
            uploadingId = -1
        }
    }

    fun load() {
        scope.launch {
            loadState.begin(items.isNotEmpty())
            runCatching { repository.listDemurrageBillings() }
                .onSuccess { items = it }
                .onFailure { error = it.message }
            loadState.end()
        }
    }
    LaunchedEffect(Unit) { load() }

    val tab = DEMURRAGE_TABS[activeTab]
    val filtered = items.filter { it.status.equals(tab, ignoreCase = true) }
        .sortedByDescending { it.totalAmount }
    val pendingCount = items.count { it.status.equals("Pending", true) }
    val rejectedCount = items.count { it.status.equals("Rejected", true) }
    val reviewCount = items.count { it.status.equals("ForVerification", true) }
    val paidCount = items.count { it.status.equals("Paid", true) }
    val outstandingTotal = items
        .filter { it.status.equals("Pending", true) || it.status.equals("Rejected", true) }
        .sumOf { it.totalAmount }

    IcsScreenScaffold(
        title = stringResource(R.string.demurrage_title),
        onBack = onBack,
        refreshing = loadState.refreshing,
        onRefresh = { load() },
    ) { padding ->
        when {
            loadState.loading -> LoadingBox(Modifier.padding(padding))
            error != null && items.isEmpty() -> ErrorMessage(error!!, { load() }, Modifier.padding(padding))
            else -> Column(Modifier.padding(padding)) {
                IcsScreenTip(
                    stringResource(R.string.ui_tip_demurrage_list),
                    modifier = Modifier.padding(bottom = 4.dp),
                )
                if (!loadState.loading) {
                    DemurrageSummaryRow(pendingCount, rejectedCount, reviewCount, paidCount, outstandingTotal)
                }
                if (pendingCount > 0 || rejectedCount > 0) {
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        shape = RoundedCornerShape(12.dp),
                        color = IcsColors.Warning.copy(alpha = 0.1f),
                    ) {
                        Column(Modifier.padding(12.dp)) {
                            Text(
                                stringResource(R.string.demurrage_block_title),
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold,
                                color = IcsColors.Warning,
                            )
                            Text(
                                stringResource(R.string.demurrage_block_message),
                                style = MaterialTheme.typography.bodySmall,
                                color = IcsColors.TextSecondary,
                            )
                        }
                    }
                }
                success?.let {
                    Text(
                        it,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                        color = IcsColors.Success,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
                uploadError?.let {
                    Text(
                        it,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                        color = IcsColors.Error,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
                ScrollableTabRow(selectedTabIndex = activeTab, edgePadding = 8.dp) {
                    DEMURRAGE_TABS.forEachIndexed { index, key ->
                        Tab(
                            selected = activeTab == index,
                            onClick = { activeTab = index },
                            text = { Text(demurrageTabLabel(key)) },
                        )
                    }
                }
                if (filtered.isEmpty()) {
                    EmptyState(demurrageTabEmptyMessage(tab), Modifier.weight(1f))
                } else {
                    LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(vertical = 8.dp)) {
                        items(filtered, key = { it.id }) { b ->
                            val canUpload = b.status.equals("Pending", true) || b.status.equals("Rejected", true)
                            IcsListItemCard(
                                title = b.containerNo,
                                subtitle = stringResource(
                                    R.string.demurrage_item_subtitle,
                                    b.referenceNo,
                                    "\u20B1",
                                    b.totalAmount.toString(),
                                    b.daysOverdue,
                                ),
                                status = demurrageTabLabel(b.status),
                                onClick = { onItemClick(b.id) },
                            )
                            if (canUpload) {
                                IcsSecondaryButton(
                                    text = stringResource(R.string.demurrage_upload_proof),
                                    onClick = {
                                        uploadingId = b.id
                                        picker.launch("*/*")
                                    },
                                    icon = Icons.Outlined.UploadFile,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 16.dp)
                                        .padding(bottom = 4.dp),
                                )
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
fun DemurrageDetailScreen(
    id: Int,
    repository: TruckerRepository,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val app = context.applicationContext as EcmsTruckerApp
    val authState by app.container.tokenStore.authState.collectAsState(initial = AuthState())
    val accessToken = authState.accessToken

    val loadState = rememberScreenLoadState(initiallyLoading = true)
    var billing by remember { mutableStateOf<DemurrageBillingDto?>(null) }
    var uploading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var success by remember { mutableStateOf<String?>(null) }
    var selectedUri by remember { mutableStateOf<Uri?>(null) }
    var proofReferenceNo by remember { mutableStateOf("") }
    var proofTransactionAt by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()
    val uploadSuccessMessage = stringResource(R.string.demurrage_upload_success)

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { selectedUri = it }

    fun load() {
        scope.launch {
            loadState.begin(billing != null)
            runCatching { billing = repository.getDemurrageBilling(id) }
                .onFailure { error = it.message }
            loadState.end()
        }
    }
    LaunchedEffect(id) { load() }

    IcsScreenScaffold(
        title = stringResource(R.string.demurrage_detail_title),
        onBack = onBack,
        refreshing = loadState.refreshing,
        onRefresh = { load() },
    ) { padding ->
        when {
            loadState.loading && billing == null -> LoadingBox(Modifier.padding(padding))
            error != null && billing == null -> ErrorMessage(error!!, { load() }, Modifier.padding(padding))
            billing != null -> {
                val b = billing!!
                val canUpload = b.status.equals("Pending", true) || b.status.equals("Rejected", true)
                Column(
                    Modifier
                        .padding(padding)
                        .padding(16.dp)
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    IcsDetailHeader(
                        referenceNo = b.referenceNo,
                        containerNo = b.containerNo,
                        status = demurrageTabLabel(b.status),
                    )

                    success?.let {
                        Text(it, color = IcsColors.Success, style = MaterialTheme.typography.bodySmall)
                    }

                    IcsSectionCard(title = stringResource(R.string.demurrage_detail_title)) {
                        IcsInfoTileGrid(
                            tiles = buildList {
                                add(stringResource(R.string.field_container) to b.containerNo)
                                add(stringResource(R.string.section_preforecast) to b.preAdviceReferenceNo)
                                add(stringResource(R.string.field_total) to "\u20B1${b.totalAmount}")
                                add(stringResource(R.string.field_days_overdue) to "${b.daysOverdue}")
                                b.appliedRateLabel?.takeIf { it.isNotBlank() }?.let {
                                    add(stringResource(R.string.demurrage_rate_label) to it)
                                }
                            },
                        )
                    }

                    if (b.feeLines.isNotEmpty()) {
                        IcsSectionCard(title = stringResource(R.string.demurrage_charges_title)) {
                            Column(Modifier.padding(horizontal = 12.dp, vertical = 4.dp)) {
                                b.feeLines.forEachIndexed { index, line ->
                                    if (index > 0) HorizontalDivider(Modifier.padding(vertical = 8.dp), color = IcsColors.Divider)
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text(
                                            line.description,
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = IcsColors.TextSecondary,
                                        )
                                        Text(
                                            "\u20B1${line.amount}",
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.SemiBold,
                                        )
                                    }
                                }
                            }
                        }
                    }

                    if (!b.proofFile.isNullOrBlank()) {
                        IcsSectionCard(title = stringResource(R.string.payment_upload_proof_section)) {
                            Column(
                                Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                val proofPath = b.proofFile
                                if (isImageProof(proofPath!!)) {
                                    AsyncImage(
                                        model = remember(proofPath, accessToken) {
                                            buildAuthedImageRequest(context, proofPath, accessToken)
                                        },
                                        contentDescription = stringResource(R.string.payment_proof_on_file),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .heightIn(min = 160.dp, max = 280.dp)
                                            .clip(RoundedCornerShape(10.dp)),
                                        contentScale = ContentScale.Fit,
                                    )
                                } else {
                                    Text(
                                        stringResource(R.string.payment_proof_pdf),
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = IcsColors.TextSecondary,
                                    )
                                }
                            }
                        }
                    }

                    if (canUpload) {
                        IcsSectionCard(title = stringResource(R.string.demurrage_upload_proof)) {
                            Column(
                                Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                IcsSecondaryButton(
                                    text = selectedUri?.lastPathSegment
                                        ?: stringResource(R.string.demurrage_select_payment_proof),
                                    onClick = { picker.launch("*/*") },
                                    icon = Icons.Outlined.UploadFile,
                                    modifier = Modifier.fillMaxWidth(),
                                )
                                IcsOutlinedField(
                                    proofReferenceNo,
                                    { proofReferenceNo = it },
                                    stringResource(R.string.payment_proof_reference),
                                )
                                IcsOutlinedField(
                                    proofTransactionAt,
                                    { proofTransactionAt = it },
                                    stringResource(R.string.payment_transaction_at),
                                )
                                IcsPrimaryButton(
                                    text = stringResource(R.string.demurrage_upload_proof),
                                    onClick = {
                                        val uri = selectedUri ?: return@IcsPrimaryButton
                                        uploading = true
                                        error = null
                                        scope.launch {
                                            runCatching {
                                                repository.uploadDemurrageProof(
                                                    id,
                                                    uri,
                                                    proofReferenceNo.trim().takeIf { it.isNotBlank() },
                                                    proofTransactionAt.trim().takeIf { it.isNotBlank() },
                                                )
                                            }
                                                .onSuccess {
                                                    success = uploadSuccessMessage
                                                    selectedUri = null
                                                    load()
                                                }
                                                .onFailure { error = it.message }
                                            uploading = false
                                        }
                                    },
                                    enabled = !uploading && selectedUri != null,
                                    loading = uploading,
                                )
                            }
                        }
                    }
                    error?.let { Text(it, color = IcsColors.Error, style = MaterialTheme.typography.bodySmall) }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportsScreen(
    repository: TruckerRepository,
    onBack: (() -> Unit)? = null,
) {
    val context = LocalContext.current
    val loadState = rememberScreenLoadState(initiallyLoading = false)
    var tab by remember { mutableIntStateOf(0) }
    var fromDate by remember { mutableStateOf("") }
    var toDate by remember { mutableStateOf("") }
    var year by remember { mutableStateOf(java.time.LocalDate.now().year.toString()) }
    var daily by remember { mutableStateOf<com.ecms.trucker.data.model.DailyReturnReportDto?>(null) }
    var monthly by remember { mutableStateOf<com.ecms.trucker.data.model.MonthlyReturnReportDto?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun loadReport() {
        scope.launch {
            loadState.begin(daily != null || monthly != null)
            error = null
            if (tab == 0) {
                runCatching {
                    repository.getDailyReturnsReport(fromDate.ifBlank { null }, toDate.ifBlank { null })
                }.onSuccess { daily = it; monthly = null }
                    .onFailure { error = it.message }
            } else {
                runCatching {
                    repository.getMonthlyReturnsReport(year.toIntOrNull())
                }.onSuccess { monthly = it; daily = null }
                    .onFailure { error = it.message }
            }
            loadState.end()
        }
    }
    LaunchedEffect(tab) { loadReport() }

    fun shareCsv() {
        val csv = buildString {
            append("Period,Scheduled,Confirmed,Completed,Cancelled\n")
            if (tab == 0) {
                daily?.rows?.forEach { row ->
                    append("${row.date},${row.scheduled},${row.confirmed},${row.completed},${row.cancelled}\n")
                }
            } else {
                monthly?.rows?.forEach { row ->
                    append("${row.label},${row.scheduled},${row.confirmed},${row.completed},${row.cancelled}\n")
                }
            }
        }
        val file = java.io.File(context.cacheDir, "returns-report-${System.currentTimeMillis()}.csv")
        file.writeText(csv)
        com.ecms.trucker.ui.util.FileShareHelper.shareFile(context, file, "text/csv", context.getString(R.string.reports_export_csv))
    }

    IcsScreenScaffold(
        title = stringResource(R.string.reports_title),
        onBack = onBack,
        refreshing = loadState.refreshing,
        onRefresh = { loadReport() },
    ) { padding ->
        Column(
            Modifier
                .padding(padding)
                .padding(16.dp)
                .fillMaxSize()
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            TabRow(selectedTabIndex = tab) {
                Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text(stringResource(R.string.reports_daily_tab)) })
                Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text(stringResource(R.string.reports_monthly_tab)) })
            }
            if (tab == 0) {
                OutlinedTextField(fromDate, { fromDate = it }, label = { Text(stringResource(R.string.reports_from_date)) }, modifier = Modifier.fillMaxWidth(), placeholder = { Text("YYYY-MM-DD") })
                OutlinedTextField(toDate, { toDate = it }, label = { Text(stringResource(R.string.reports_to_date)) }, modifier = Modifier.fillMaxWidth(), placeholder = { Text("YYYY-MM-DD") })
            } else {
                OutlinedTextField(year, { year = it }, label = { Text(stringResource(R.string.reports_year)) }, modifier = Modifier.fillMaxWidth())
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = { loadReport() }, modifier = Modifier.weight(1f)) { Text("Apply") }
                OutlinedButton(onClick = { shareCsv() }, modifier = Modifier.weight(1f), enabled = (daily?.rows?.isNotEmpty() == true) || (monthly?.rows?.isNotEmpty() == true)) {
                    Text(stringResource(R.string.reports_export_csv))
                }
            }
            if (loadState.loading) {
                CircularProgressIndicator()
            } else if (error != null) {
                Text(error!!, color = IcsColors.Error)
            } else {
                val rows = if (tab == 0) daily?.rows.orEmpty() else monthly?.rows.orEmpty().map {
                    com.ecms.trucker.data.model.DailyReturnReportRowDto(it.label, it.scheduled, it.confirmed, it.completed, it.cancelled)
                }
                if (rows.isEmpty()) {
                    Text(stringResource(R.string.reports_no_data), color = IcsColors.TextSecondary)
                } else {
                    IcsSectionCard(title = stringResource(R.string.reports_title)) {
                        Column(Modifier.padding(8.dp)) {
                            Row(Modifier.fillMaxWidth()) {
                                Text(stringResource(R.string.reports_col_label), Modifier.weight(1.2f), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                                Text(stringResource(R.string.reports_col_scheduled), Modifier.weight(1f), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                                Text(stringResource(R.string.reports_col_confirmed), Modifier.weight(1f), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                                Text(stringResource(R.string.reports_col_completed), Modifier.weight(1f), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                                Text(stringResource(R.string.reports_col_cancelled), Modifier.weight(1f), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                            }
                            rows.forEach { row ->
                                Row(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                                    Text(row.date, Modifier.weight(1.2f), style = MaterialTheme.typography.bodySmall)
                                    Text("${row.scheduled}", Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                                    Text("${row.confirmed}", Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                                    Text("${row.completed}", Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                                    Text("${row.cancelled}", Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                                }
                            }
                        }
                    }
                    val summary = if (tab == 0) daily else null
                    summary?.let {
                        Text(stringResource(R.string.reports_summary, it.totalScheduled, it.totalCompleted), color = IcsColors.TextSecondary)
                    }
                    monthly?.let {
                        Text(stringResource(R.string.reports_summary, it.totalScheduled, it.totalCompleted), color = IcsColors.TextSecondary)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    repository: TruckerRepository,
    authRepository: com.ecms.trucker.data.repository.AuthRepository,
    onBack: (() -> Unit)? = null,
    onLogout: () -> Unit,
) {
    val context = LocalContext.current
    val app = context.applicationContext as EcmsTruckerApp
    val authState by app.container.tokenStore.authState.collectAsState(initial = AuthState())
    val accessToken = authState.accessToken
    val loadState = rememberScreenLoadState(initiallyLoading = true)
    var profile by remember { mutableStateOf<com.ecms.trucker.data.model.ProfileDto?>(null) }
    var fullName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var currentPassword by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var message by remember { mutableStateOf<String?>(null) }
    val profileUpdatedMessage = stringResource(R.string.profile_updated)
    val passwordChangedMessage = stringResource(R.string.profile_password_changed)
    val photoUpdatedMessage = stringResource(R.string.profile_photo_updated)
    val photoRemovedMessage = stringResource(R.string.profile_photo_removed)
    val scope = rememberCoroutineScope()

    val photoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri ?: return@rememberLauncherForActivityResult
        scope.launch {
            runCatching { repository.uploadProfilePhoto(uri) }
                .onSuccess {
                    runCatching { repository.getProfile() }
                        .onSuccess { profile = it; fullName = it.fullName; email = it.email }
                    message = photoUpdatedMessage
                }
                .onFailure { message = it.message }
        }
    }

    fun loadProfile() {
        scope.launch {
            loadState.begin(profile != null)
            runCatching { repository.getProfile() }
                .onSuccess { profile = it; fullName = it.fullName; email = it.email }
            loadState.end()
        }
    }
    LaunchedEffect(Unit) { loadProfile() }

    IcsScreenScaffold(
        title = stringResource(R.string.profile_title),
        onBack = onBack,
        refreshing = loadState.refreshing,
        onRefresh = { loadProfile() },
    ) { padding ->
        if (loadState.loading) LoadingBox(Modifier.padding(padding)) else {
            Column(
                Modifier
                    .padding(padding)
                    .padding(16.dp)
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                ProfileHeaderCard(
                    fullName = fullName.ifBlank { profile?.fullName ?: "" },
                    username = profile?.username ?: "",
                    email = email.ifBlank { profile?.email ?: "" },
                )

                IcsSectionCard(title = stringResource(R.string.profile_photo_title)) {
                    Column(
                        Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        val photoPath = profile?.profilePhoto
                        if (!photoPath.isNullOrBlank()) {
                            AsyncImage(
                                model = remember(photoPath, accessToken) {
                                    buildAuthedImageRequest(context, photoPath, accessToken)
                                },
                                contentDescription = stringResource(R.string.profile_photo_title),
                                modifier = Modifier
                                    .size(96.dp)
                                    .clip(CircleShape),
                                contentScale = ContentScale.Crop,
                            )
                        }
                        IcsSecondaryButton(
                            text = stringResource(R.string.profile_photo_upload),
                            onClick = { photoPicker.launch("image/*") },
                            icon = Icons.Outlined.UploadFile,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        if (!photoPath.isNullOrBlank()) {
                            OutlinedButton(
                                onClick = {
                                    scope.launch {
                                        runCatching { repository.removeProfilePhoto() }
                                            .onSuccess {
                                                runCatching { repository.getProfile() }
                                                    .onSuccess { profile = it; fullName = it.fullName; email = it.email }
                                                message = photoRemovedMessage
                                            }
                                    }
                                },
                                modifier = Modifier.fillMaxWidth(),
                            ) { Text(stringResource(R.string.profile_photo_remove)) }
                        }
                    }
                }

                IcsSectionCard(title = stringResource(R.string.profile_title)) {
                    Column(
                        Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        IcsOutlinedField(fullName, { fullName = it }, stringResource(R.string.auth_full_name))
                        IcsOutlinedField(email, { email = it }, stringResource(R.string.auth_email))
                        IcsPrimaryButton(
                            text = stringResource(R.string.profile_save),
                            onClick = {
                                scope.launch {
                                    runCatching { repository.updateProfile(email, fullName) }
                                        .onSuccess { message = profileUpdatedMessage }
                                }
                            },
                        )
                    }
                }

                IcsSectionCard(title = stringResource(R.string.profile_change_password)) {
                    Column(
                        Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        IcsOutlinedField(currentPassword, { currentPassword = it }, stringResource(R.string.profile_current_password), password = true)
                        IcsOutlinedField(newPassword, { newPassword = it }, stringResource(R.string.profile_new_password), password = true)
                        IcsSecondaryButton(
                            text = stringResource(R.string.profile_change_password),
                            onClick = {
                                scope.launch {
                                    runCatching { repository.changePassword(currentPassword, newPassword) }
                                        .onSuccess { message = passwordChangedMessage; currentPassword = ""; newPassword = "" }
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }

                message?.let {
                    Text(it, color = IcsColors.Success, style = MaterialTheme.typography.bodyMedium)
                }

                OutlinedButton(
                    onClick = { scope.launch { authRepository.logout(); onLogout() } },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = IcsColors.Error),
                ) { Text(stringResource(R.string.action_sign_out)) }
            }
        }
    }
}

@Composable
private fun ProfileHeaderCard(
    fullName: String,
    username: String,
    email: String,
) {
    val initials = remember(fullName, username) {
        val source = fullName.ifBlank { username }
        source.trim()
            .split(Regex("\\s+"))
            .filter { it.isNotBlank() }
            .take(2)
            .joinToString("") { it.first().uppercase() }
            .ifBlank { "?" }
    }
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        color = icsHexAlpha(IcsColors.Primary, 0.06f),
        border = androidx.compose.foundation.BorderStroke(1.dp, icsHexAlpha(IcsColors.Primary, 0.15f)),
    ) {
        Row(
            Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(CircleShape)
                    .background(IcsColors.Primary),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    initials,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = androidx.compose.ui.graphics.Color.White,
                )
            }
            Column(Modifier.weight(1f)) {
                Text(
                    fullName.ifBlank { username },
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = IcsColors.OnSurface,
                )
                if (username.isNotBlank()) {
                    Text(
                        "@$username",
                        style = MaterialTheme.typography.bodySmall,
                        color = IcsColors.Primary,
                    )
                }
                if (email.isNotBlank()) {
                    Text(
                        email,
                        style = MaterialTheme.typography.bodySmall,
                        color = IcsColors.TextSecondary,
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(
    repository: TruckerRepository,
    onBack: () -> Unit,
    onUnreadCountChanged: (Int) -> Unit = {},
    onNavigate: (linkPath: String?, category: String) -> Unit = { _, _ -> },
) {
    val loadState = rememberScreenLoadState(initiallyLoading = true)
    var items by remember { mutableStateOf<List<NotificationDto>>(emptyList()) }
    val scope = rememberCoroutineScope()

    fun loadNotifications() {
        scope.launch {
            loadState.begin(items.isNotEmpty())
            runCatching {
                val page = repository.getNotifications(page = 1, pageSize = 50)
                items = page.items
                onUnreadCountChanged(page.unreadCount)
            }
            loadState.end()
        }
    }

    fun markRead(id: Int) {
        scope.launch {
            runCatching { repository.markNotificationRead(id) }
            items = items.map { if (it.id == id) it.copy(isRead = true) else it }
            onUnreadCountChanged(items.count { !it.isRead })
        }
    }

    fun markAllRead() {
        scope.launch {
            runCatching { repository.markAllNotificationsRead() }
            items = items.map { it.copy(isRead = true) }
            onUnreadCountChanged(0)
        }
    }

    LaunchedEffect(Unit) { loadNotifications() }

    val hasUnread = items.any { !it.isRead }

    IcsScreenScaffold(
        title = stringResource(R.string.notifications_title),
        onBack = onBack,
        refreshing = loadState.refreshing,
        onRefresh = { loadNotifications() },
        actions = {
            if (hasUnread) {
                TextButton(onClick = { markAllRead() }) {
                    Text(stringResource(R.string.notifications_mark_all_read))
                }
            }
        },
    ) { padding ->
        when {
            loadState.loading -> LoadingBox(Modifier.padding(padding))
            items.isEmpty() -> EmptyState(stringResource(R.string.notifications_empty), Modifier.padding(padding))
            else -> LazyColumn(
                Modifier.padding(padding),
                contentPadding = PaddingValues(vertical = 8.dp),
            ) {
                items(items, key = { it.id }) { n ->
                    val bg = if (n.isRead) {
                        MaterialTheme.colorScheme.surface
                    } else {
                        icsHexAlpha(IcsColors.Primary, 0.04f)
                    }
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(bg)
                            .clickable {
                                if (!n.isRead) markRead(n.id)
                                onNavigate(n.linkPath, n.category)
                            }
                            .padding(horizontal = 16.dp, vertical = 14.dp),
                    ) {
                        Text(
                            n.title,
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                        )
                        Spacer(Modifier.height(6.dp))
                        Text(
                            n.message,
                            style = MaterialTheme.typography.bodyMedium,
                            color = IcsColors.TextSecondary,
                        )
                        Spacer(Modifier.height(6.dp))
                        Text(
                            formatRelativeTime(n.createdAt),
                            style = MaterialTheme.typography.labelSmall,
                            color = IcsColors.TextSecondary.copy(alpha = 0.75f),
                        )
                    }
                    HorizontalDivider(color = IcsColors.Divider)
                }
            }
        }
    }
}
