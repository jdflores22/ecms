package com.ecms.trucker.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.UploadFile
import androidx.compose.material3.*
import androidx.compose.runtime.*
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
import com.ecms.trucker.data.model.StatementOfAccountDto
import com.ecms.trucker.data.repository.TruckerRepository
import com.ecms.trucker.ui.components.*
import com.ecms.trucker.ui.theme.IcsColors
import com.ecms.trucker.ui.util.buildAuthedImageRequest
import com.ecms.trucker.ui.util.isImageProof
import com.ecms.trucker.ui.util.rememberScreenLoadState
import kotlinx.coroutines.launch

private fun soaStatusLabel(status: String): String = when (status) {
    "ForVerification" -> "Under review"
    else -> status
}

private fun isSoaOpen(status: String): Boolean =
    status.equals("Issued", ignoreCase = true) || status.equals("ForVerification", ignoreCase = true)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SoaListScreen(
    repository: TruckerRepository,
    onItemClick: (Int) -> Unit,
    onBack: (() -> Unit)? = null,
) {
    val loadState = rememberScreenLoadState(initiallyLoading = true)
    var items by remember { mutableStateOf<List<StatementOfAccountDto>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun load() {
        scope.launch {
            loadState.begin(items.isNotEmpty())
            runCatching { repository.listStatementOfAccounts() }
                .onSuccess { items = it }
                .onFailure { error = it.message }
            loadState.end()
        }
    }
    LaunchedEffect(Unit) { load() }

    val openCount = items.count { isSoaOpen(it.status) }

    IcsScreenScaffold(
        title = stringResource(R.string.soa_title),
        onBack = onBack,
        refreshing = loadState.refreshing,
        onRefresh = { load() },
    ) { padding ->
        when {
            loadState.loading -> LoadingBox(Modifier.padding(padding))
            error != null -> ErrorMessage(error!!, { load() }, Modifier.padding(padding))
            items.isEmpty() -> EmptyState(stringResource(R.string.soa_empty), Modifier.padding(padding))
            else -> LazyColumn(Modifier.padding(padding), contentPadding = PaddingValues(vertical = 8.dp)) {
                if (openCount > 0) {
                    item {
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 4.dp),
                            shape = RoundedCornerShape(12.dp),
                            color = IcsColors.Warning.copy(alpha = 0.1f),
                        ) {
                            Text(
                                stringResource(R.string.soa_open_count, openCount),
                                modifier = Modifier.padding(12.dp),
                                style = MaterialTheme.typography.bodySmall,
                                color = IcsColors.Warning,
                            )
                        }
                    }
                }
                items(items, key = { it.id }) { soa ->
                    IcsListItemCard(
                        title = soa.referenceNo,
                        subtitle = stringResource(
                            R.string.soa_item_subtitle,
                            soa.shippingLineName,
                            "\u20B1",
                            soa.amountDue.toString(),
                        ),
                        status = soaStatusLabel(soa.status),
                        onClick = { onItemClick(soa.id) },
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SoaDetailScreen(
    id: Int,
    repository: TruckerRepository,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val app = context.applicationContext as EcmsTruckerApp
    val authState by app.container.tokenStore.authState.collectAsState(initial = AuthState())
    val accessToken = authState.accessToken

    val loadState = rememberScreenLoadState(initiallyLoading = true)
    var soa by remember { mutableStateOf<StatementOfAccountDto?>(null) }
    var uploading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var success by remember { mutableStateOf<String?>(null) }
    var selectedUri by remember { mutableStateOf<Uri?>(null) }
    var proofReferenceNo by remember { mutableStateOf("") }
    var proofTransactionAt by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()
    val uploadedMessage = stringResource(R.string.soa_proof_uploaded)

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { selectedUri = it }

    fun load() {
        scope.launch {
            loadState.begin(soa != null)
            runCatching { soa = repository.getStatementOfAccount(id) }
                .onFailure { error = it.message }
            loadState.end()
        }
    }
    LaunchedEffect(id) { load() }

    IcsScreenScaffold(
        title = stringResource(R.string.soa_detail_title),
        onBack = onBack,
        refreshing = loadState.refreshing,
        onRefresh = { load() },
    ) { padding ->
        when {
            loadState.loading && soa == null -> LoadingBox(Modifier.padding(padding))
            error != null && soa == null -> ErrorMessage(error!!, { load() }, Modifier.padding(padding))
            soa != null -> {
                val item = soa!!
                val canUpload = item.status.equals("Issued", ignoreCase = true) && item.amountDue > 0
                Column(
                    Modifier
                        .padding(padding)
                        .padding(16.dp)
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    IcsDetailHeader(referenceNo = item.referenceNo, status = soaStatusLabel(item.status))

                    success?.let {
                        Text(it, color = IcsColors.Success, style = MaterialTheme.typography.bodySmall)
                    }
                    error?.let {
                        Text(it, color = IcsColors.Error, style = MaterialTheme.typography.bodySmall)
                    }

                    IcsSectionCard(title = stringResource(R.string.soa_summary_title)) {
                        IcsInfoTileGrid(
                            tiles = listOf(
                                stringResource(R.string.field_shipping_line) to item.shippingLineName,
                                stringResource(R.string.field_total) to "\u20B1${item.totalAmount}",
                                stringResource(R.string.soa_amount_due) to "\u20B1${item.amountDue}",
                                stringResource(R.string.soa_credit_applied) to "\u20B1${item.creditApplied}",
                                stringResource(R.string.soa_due_date) to (item.dueDate ?: "—"),
                                stringResource(R.string.soa_period) to "${item.periodFrom ?: "—"} → ${item.periodTo ?: "—"}",
                            ),
                        )
                    }

                    item.remarks?.takeIf { it.isNotBlank() }?.let { remarks ->
                        IcsSectionCard(title = stringResource(R.string.soa_remarks)) {
                            Text(
                                remarks,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                style = MaterialTheme.typography.bodyMedium,
                                color = IcsColors.TextSecondary,
                            )
                        }
                    }

                    if (item.lines.isNotEmpty()) {
                        IcsSectionCard(title = stringResource(R.string.soa_lines_title, item.lines.size)) {
                            Column(Modifier.padding(horizontal = 12.dp, vertical = 4.dp)) {
                                item.lines.forEachIndexed { index, line ->
                                    if (index > 0) {
                                        HorizontalDivider(Modifier.padding(vertical = 8.dp), color = IcsColors.Divider)
                                    }
                                    Text(
                                        line.demurrageBillingReferenceNo,
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                    Text(
                                        "${line.containerNo} · ${line.preAdviceReferenceNo}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = IcsColors.TextSecondary,
                                    )
                                    Text(
                                        "\u20B1${line.amount}",
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = IcsColors.Primary,
                                    )
                                }
                            }
                        }
                    }

                    if (!item.proofFile.isNullOrBlank()) {
                        IcsSectionCard(title = stringResource(R.string.payment_upload_proof_section)) {
                            Column(
                                Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                val proofPath = item.proofFile
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
                                item.proofReferenceNo?.takeIf { it.isNotBlank() }?.let {
                                    Text("${stringResource(R.string.payment_proof_reference)}: $it", style = MaterialTheme.typography.bodySmall)
                                }
                            }
                        }
                    }

                    if (canUpload) {
                        IcsSectionCard(title = stringResource(R.string.soa_upload_proof)) {
                            Column(
                                Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                Text(
                                    stringResource(R.string.soa_upload_hint),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = IcsColors.TextSecondary,
                                )
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
                                    text = stringResource(R.string.soa_upload_proof),
                                    onClick = {
                                        val uri = selectedUri ?: return@IcsPrimaryButton
                                        uploading = true
                                        error = null
                                        scope.launch {
                                            runCatching {
                                                repository.uploadSoaProof(
                                                    id,
                                                    uri,
                                                    proofReferenceNo.trim().takeIf { it.isNotBlank() },
                                                    proofTransactionAt.trim().takeIf { it.isNotBlank() },
                                                )
                                            }
                                                .onSuccess {
                                                    success = uploadedMessage
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
                }
            }
        }
    }
}
