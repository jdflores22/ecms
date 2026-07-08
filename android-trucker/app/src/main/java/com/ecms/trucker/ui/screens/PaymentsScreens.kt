package com.ecms.trucker.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
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
import coil.request.ImageRequest
import com.ecms.trucker.BuildConfig
import com.ecms.trucker.EcmsTruckerApp
import com.ecms.trucker.R
import com.ecms.trucker.data.local.AuthState
import com.ecms.trucker.data.model.PaymentDto
import com.ecms.trucker.data.model.ScheduleDto
import com.ecms.trucker.data.repository.TruckerRepository
import com.ecms.trucker.ui.components.*
import com.ecms.trucker.ui.theme.IcsColors
import com.ecms.trucker.ui.util.rememberScreenLoadState
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

private fun paymentFor(payments: List<PaymentDto>, scheduleId: Int): PaymentDto? =
    payments.find { it.scheduleId == scheduleId }

private fun scheduleFor(schedules: List<ScheduleDto>, scheduleId: Int): ScheduleDto? =
    schedules.find { it.id == scheduleId }

private fun isActiveReturnSchedule(schedule: ScheduleDto): Boolean =
    schedule.status.equals("Scheduled", true) || schedule.status.equals("Confirmed", true)

private fun needsPaymentUpload(schedule: ScheduleDto, payment: PaymentDto?): Boolean {
    if (!isActiveReturnSchedule(schedule)) return false
    return payment == null ||
        payment.status.equals("Pending", true) ||
        payment.status.equals("Rejected", true)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentsListScreen(
    repository: TruckerRepository,
    onOpenNotifications: () -> Unit,
    notificationUnreadCount: Int = 0,
    onOpenPayment: (Int) -> Unit,
) {
    val cached = PaymentsCache
        ?.takeIf { System.currentTimeMillis() - it.updatedAtMs <= PAYMENTS_CACHE_TTL_MS }
    val loadState = rememberScreenLoadState(initiallyLoading = cached == null)
    var payments by remember { mutableStateOf(cached?.payments ?: emptyList()) }
    var schedules by remember { mutableStateOf(cached?.schedules ?: emptyList()) }
    var fee by remember { mutableStateOf(cached?.fee ?: 0.0) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val currencySymbol = "\u20B1"

    fun load(force: Boolean = false) {
        scope.launch {
            loadState.begin(payments.isNotEmpty() || schedules.isNotEmpty())
            if (!force) {
                PaymentsCache
                    ?.takeIf { System.currentTimeMillis() - it.updatedAtMs <= PAYMENTS_CACHE_TTL_MS }
                    ?.let { entry ->
                        payments = entry.payments
                        schedules = entry.schedules
                        fee = entry.fee
                        loadState.end()
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
            loadState.end()
        }
    }
    LaunchedEffect(Unit) { load(force = cached == null) }

    val activeSchedules = schedules.filter(::isActiveReturnSchedule)
    val needsUpload = activeSchedules.filter { needsPaymentUpload(it, paymentFor(payments, it.id)) }
    val underReview = activeSchedules.filter {
        paymentFor(payments, it.id)?.status.equals("ForVerification", true)
    }
    val paidPayments = payments
        .filter { it.status.equals("Paid", true) }
        .sortedByDescending { it.paidAt ?: it.id.toString() }

    IcsScreenScaffold(
        title = stringResource(R.string.payments_title),
        branded = true,
        onNotificationClick = onOpenNotifications,
        notificationUnreadCount = notificationUnreadCount,
        refreshing = loadState.refreshing,
        onRefresh = { load(force = true) },
    ) { padding ->
        when {
            loadState.loading -> LoadingBox(Modifier.padding(padding))
            error != null -> ErrorMessage(error!!, { load() }, Modifier.padding(padding))
            else -> LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                contentPadding = PaddingValues(vertical = 16.dp),
            ) {
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        IcsOverviewPanel {
                            Row(
                                Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 8.dp, vertical = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column {
                                    Text(
                                        stringResource(R.string.payments_fee_title),
                                        style = MaterialTheme.typography.labelMedium,
                                        color = IcsColors.TextSecondary,
                                    )
                                    Text(
                                        stringResource(R.string.payments_return_fee, "$currencySymbol$fee"),
                                        style = MaterialTheme.typography.headlineSmall,
                                        color = IcsColors.Primary,
                                        fontWeight = FontWeight.Bold,
                                    )
                                }
                            }
                        }
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            IcsStatCard(
                                label = stringResource(R.string.payments_stat_due),
                                value = needsUpload.size.toString(),
                                description = stringResource(R.string.payments_upload_hint),
                                color = IcsColors.Warning,
                                highlighted = needsUpload.isNotEmpty(),
                                modifier = Modifier.weight(1f),
                            )
                            IcsStatCard(
                                label = stringResource(R.string.payments_stat_review),
                                value = underReview.size.toString(),
                                description = stringResource(R.string.payment_review_message),
                                color = IcsColors.Primary,
                                highlighted = underReview.isNotEmpty(),
                                modifier = Modifier.weight(1f),
                            )
                            IcsStatCard(
                                label = stringResource(R.string.payments_stat_paid),
                                value = paidPayments.size.toString(),
                                description = stringResource(R.string.payments_history_title),
                                color = IcsColors.Success,
                                highlighted = false,
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }
                }

                if (needsUpload.isEmpty() && underReview.isEmpty() && paidPayments.isEmpty()) {
                    item {
                        EmptyState(
                            stringResource(R.string.payments_no_actions),
                            modifier = Modifier.fillMaxWidth().heightIn(min = 120.dp),
                        )
                    }
                }

                if (needsUpload.isNotEmpty()) {
                    item {
                        IcsSectionCard(title = stringResource(R.string.payments_due_title)) {
                            needsUpload.forEachIndexed { index, schedule ->
                                if (index > 0) HorizontalDivider(color = IcsColors.Divider)
                                val payment = paymentFor(payments, schedule.id)
                                val isRejected = payment?.status.equals("Rejected", true)
                                IcsPaymentListRow(
                                    title = schedule.referenceNo,
                                    subtitle = "${schedule.depotName} · ${schedule.date}",
                                    amount = stringResource(
                                        R.string.payments_return_fee,
                                        "$currencySymbol${payment?.amount ?: fee}",
                                    ),
                                    status = payment?.status ?: "Pending",
                                    actionLabel = if (isRejected) {
                                        stringResource(R.string.payments_reupload_hint)
                                    } else {
                                        stringResource(R.string.payments_upload_hint)
                                    },
                                    onClick = { onOpenPayment(schedule.id) },
                                    emphasized = true,
                                )
                            }
                        }
                    }
                }

                if (underReview.isNotEmpty()) {
                    item {
                        IcsSectionCard(title = stringResource(R.string.payments_under_review_title)) {
                            underReview.forEachIndexed { index, schedule ->
                                if (index > 0) HorizontalDivider(color = IcsColors.Divider)
                                val payment = paymentFor(payments, schedule.id)!!
                                IcsPaymentListRow(
                                    title = schedule.referenceNo,
                                    subtitle = "${schedule.depotName} · ${schedule.date}",
                                    amount = stringResource(R.string.payments_return_fee, "$currencySymbol${payment.amount}"),
                                    status = payment.status,
                                    actionLabel = stringResource(R.string.payments_view_details),
                                    onClick = { onOpenPayment(schedule.id) },
                                )
                            }
                        }
                    }
                }

                if (paidPayments.isNotEmpty()) {
                    item {
                        IcsSectionCard(title = stringResource(R.string.payments_history_title)) {
                            paidPayments.forEachIndexed { index, payment ->
                                if (index > 0) HorizontalDivider(color = IcsColors.Divider)
                                val schedule = scheduleFor(schedules, payment.scheduleId)
                                IcsPaymentListRow(
                                    title = schedule?.referenceNo
                                        ?: stringResource(R.string.payments_schedule_number, payment.scheduleId),
                                    subtitle = schedule?.let { "${it.depotName} · ${it.date}" }
                                        ?: payment.truckerName,
                                    amount = stringResource(R.string.payments_return_fee, "$currencySymbol${payment.amount}"),
                                    status = payment.status,
                                    actionLabel = stringResource(R.string.payments_view_details),
                                    onClick = { onOpenPayment(payment.scheduleId) },
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
fun PaymentUploadScreen(
    scheduleId: Int,
    repository: TruckerRepository,
    onBack: () -> Unit,
    onUploaded: () -> Unit,
) {
    val context = LocalContext.current
    val app = context.applicationContext as EcmsTruckerApp
    val authState by app.container.tokenStore.authState.collectAsState(initial = AuthState())
    val accessToken = authState.accessToken

    val loadState = rememberScreenLoadState(initiallyLoading = true)
    var schedule by remember { mutableStateOf<ScheduleDto?>(null) }
    var payment by remember { mutableStateOf<PaymentDto?>(null) }
    var fee by remember { mutableStateOf(0.0) }
    var error by remember { mutableStateOf<String?>(null) }

    var referenceNo by remember { mutableStateOf("") }
    var transactionAt by remember { mutableStateOf("") }
    var selectedUri by remember { mutableStateOf<Uri?>(null) }
    var uploading by remember { mutableStateOf(false) }
    var refreshing by remember { mutableStateOf(false) }
    var uploadError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }
    val refreshMessage = stringResource(R.string.refresh_feedback_payment_form_reset)
    val currencySymbol = "\u20B1"

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        selectedUri = uri
    }

    fun load() {
        scope.launch {
            loadState.begin(schedule != null)
            error = null
            runCatching {
                val scheduleDeferred = async { repository.getSchedule(scheduleId) }
                val paymentDeferred = async { repository.getPaymentBySchedule(scheduleId) }
                val settingsDeferred = async { repository.getPaymentSettings() }
                schedule = scheduleDeferred.await()
                payment = paymentDeferred.await()
                fee = settingsDeferred.await().returnFeeAmount
            }.onFailure { error = it.message }
            loadState.end()
        }
    }

    LaunchedEffect(scheduleId) { load() }

    val currentSchedule = schedule
    val currentPayment = payment
    val uploadNeeded = currentSchedule != null && needsPaymentUpload(currentSchedule, currentPayment)
    val displayAmount = currentPayment?.amount ?: fee
    val screenTitle = if (uploadNeeded) {
        stringResource(R.string.payment_upload_title)
    } else {
        stringResource(R.string.payment_detail_title)
    }

    fun resetUploadForm() {
        refreshing = true
        selectedUri = null
        referenceNo = ""
        transactionAt = ""
        uploadError = null
        refreshing = false
        scope.launch { snackbarHostState.showSnackbar(refreshMessage) }
    }

    IcsScreenScaffold(
        title = screenTitle,
        onBack = onBack,
        refreshing = refreshing || loadState.refreshing,
        onRefresh = {
            if (uploadNeeded) resetUploadForm() else load()
        },
        showRefreshFeedback = false,
        snackbarHost = { _ -> SnackbarHost(hostState = snackbarHostState) },
    ) { padding ->
        when {
            loadState.loading && currentSchedule == null -> LoadingBox(Modifier.padding(padding))
            error != null && currentSchedule == null -> ErrorMessage(error!!, { load() }, Modifier.padding(padding))
            currentSchedule == null -> ErrorMessage(
                error ?: "Schedule not found",
                { load() },
                Modifier.padding(padding),
            )
            else -> {
                val s = currentSchedule!!
                val status = currentPayment?.status ?: "Pending"
                val statusMessage = when {
                    status.equals("Paid", true) -> stringResource(R.string.payment_verified_message)
                    status.equals("ForVerification", true) -> stringResource(R.string.payment_review_message)
                    status.equals("Rejected", true) -> stringResource(R.string.payment_rejected_message)
                    else -> null
                }

                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    contentPadding = PaddingValues(vertical = 16.dp),
                ) {
                    item {
                        IcsSectionCard(title = stringResource(R.string.payment_schedule_context)) {
                            Column(Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                                IcsDetailHeader(referenceNo = s.referenceNo, status = status)
                                Spacer(Modifier.height(12.dp))
                                IcsInfoTileGrid(
                                    tiles = listOf(
                                        stringResource(R.string.field_depot) to s.depotName,
                                        stringResource(R.string.field_date) to s.date,
                                        stringResource(R.string.field_time) to s.time,
                                        stringResource(R.string.field_status) to s.status,
                                    ),
                                )
                            }
                        }
                    }

                    statusMessage?.let { message ->
                        item {
                            Surface(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                color = when {
                                    status.equals("Paid", true) -> IcsColors.Success.copy(alpha = 0.12f)
                                    status.equals("Rejected", true) -> IcsColors.Error.copy(alpha = 0.12f)
                                    else -> IcsColors.Primary.copy(alpha = 0.1f)
                                },
                            ) {
                                Text(
                                    message,
                                    modifier = Modifier.padding(14.dp),
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = when {
                                        status.equals("Paid", true) -> IcsColors.Success
                                        status.equals("Rejected", true) -> IcsColors.Error
                                        else -> IcsColors.Primary
                                    },
                                )
                            }
                        }
                    }

                    item {
                        IcsSectionCard(title = stringResource(R.string.payment_summary_title)) {
                            IcsInfoTileGrid(
                                tiles = buildList {
                                    add(stringResource(R.string.field_amount) to "$currencySymbol$displayAmount")
                                    add(stringResource(R.string.field_status) to status)
                                    currentPayment?.proofPaymentId?.takeIf { it.isNotBlank() }?.let {
                                        add(stringResource(R.string.payment_proof_payment_id) to it)
                                    }
                                    currentPayment?.proofReferenceNo?.takeIf { it.isNotBlank() }?.let {
                                        add(stringResource(R.string.payment_proof_reference) to it)
                                    }
                                    currentPayment?.proofTransactionAt?.takeIf { it.isNotBlank() }?.let {
                                        add(stringResource(R.string.payment_transaction_at) to it)
                                    }
                                    currentPayment?.paidAt?.takeIf { it.isNotBlank() }?.let {
                                        add(stringResource(R.string.payment_paid_at) to it)
                                    }
                                },
                            )
                        }
                    }

                    val hasProof = !currentPayment?.proofFile.isNullOrBlank()

                    if (hasProof || !uploadNeeded) {
                        item {
                            IcsSectionCard(title = stringResource(R.string.payment_upload_proof_section)) {
                                Column(
                                    Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    val proofPath = currentPayment?.proofFile
                                    when {
                                        proofPath.isNullOrBlank() -> {
                                            Text(
                                                stringResource(R.string.payment_proof_missing),
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = IcsColors.TextSecondary,
                                            )
                                        }
                                        isImageProof(proofPath) -> {
                                            AsyncImage(
                                                model = remember(proofPath, accessToken) {
                                                    buildAuthedImageRequest(context, proofPath, accessToken)
                                                },
                                                contentDescription = stringResource(R.string.payment_proof_on_file),
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .heightIn(min = 180.dp, max = 320.dp)
                                                    .clip(RoundedCornerShape(10.dp)),
                                                contentScale = ContentScale.Fit,
                                            )
                                            Text(
                                                stringResource(R.string.payment_proof_on_file),
                                                style = MaterialTheme.typography.labelMedium,
                                                color = IcsColors.Success,
                                            )
                                        }
                                        else -> {
                                            Text(
                                                stringResource(R.string.payment_proof_pdf),
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = IcsColors.TextSecondary,
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (uploadNeeded) {
                        item {
                            IcsSectionCard(
                                title = if (hasProof) {
                                    stringResource(R.string.action_reupload_proof)
                                } else {
                                    stringResource(R.string.payment_upload_proof_section)
                                },
                            ) {
                                Column(
                                    Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    IcsSecondaryButton(
                                        text = selectedUri?.lastPathSegment
                                            ?: stringResource(R.string.payment_upload_select_file),
                                        onClick = { picker.launch("*/*") },
                                        icon = Icons.Outlined.UploadFile,
                                    )
                                    if (selectedUri != null) {
                                        Text(
                                            stringResource(R.string.payment_upload_file_selected),
                                            style = MaterialTheme.typography.bodySmall,
                                            color = IcsColors.Success,
                                        )
                                    }
                                }
                            }
                        }

                        item {
                            IcsSectionCard(title = stringResource(R.string.payment_upload_details_section)) {
                                Column(
                                    Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    IcsOutlinedField(
                                        value = referenceNo,
                                        onValueChange = { referenceNo = it },
                                        label = stringResource(R.string.payment_upload_reference_optional),
                                    )
                                    IcsOutlinedField(
                                        value = transactionAt,
                                        onValueChange = { transactionAt = it },
                                        label = stringResource(R.string.payment_upload_transaction_date_optional),
                                    )
                                }
                            }
                        }

                        uploadError?.let { message ->
                            item {
                                Text(message, color = IcsColors.Error, style = MaterialTheme.typography.bodyMedium)
                            }
                        }

                        item {
                            IcsPrimaryButton(
                                text = if (status.equals("Rejected", true)) {
                                    stringResource(R.string.action_reupload_proof)
                                } else {
                                    stringResource(R.string.action_upload)
                                },
                                onClick = {
                                    val uri = selectedUri ?: return@IcsPrimaryButton
                                    uploading = true
                                    scope.launch {
                                        runCatching {
                                            repository.uploadPaymentProof(
                                                scheduleId,
                                                uri,
                                                referenceNo.ifBlank { null },
                                                transactionAt.ifBlank { null },
                                            )
                                        }.onSuccess {
                                            PaymentsCache = null
                                            onUploaded()
                                        }.onFailure {
                                            uploadError = it.message
                                            uploading = false
                                        }
                                    }
                                },
                                enabled = selectedUri != null,
                                loading = uploading,
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun isImageProof(path: String): Boolean {
    val lower = path.lowercase()
    return lower.endsWith(".jpg") ||
        lower.endsWith(".jpeg") ||
        lower.endsWith(".png") ||
        lower.endsWith(".webp") ||
        lower.endsWith(".gif")
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
