package com.ecms.trucker.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.History
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ecms.trucker.R
import com.ecms.trucker.data.local.WithdrawalDraftStore
import com.ecms.trucker.data.local.WithdrawalLineDraft
import com.ecms.trucker.data.local.WithdrawalWizardDraft
import com.ecms.trucker.data.model.BookWithdrawalRequest
import com.ecms.trucker.data.model.WithdrawalDto
import com.ecms.trucker.data.model.WithdrawalFormConfigDto
import com.ecms.trucker.data.model.WithdrawalLineInput
import com.ecms.trucker.data.repository.TruckerRepository
import com.ecms.trucker.ui.components.ErrorMessage
import com.ecms.trucker.ui.components.IcsScreenScaffold
import com.ecms.trucker.ui.components.IcsSectionCard
import com.ecms.trucker.ui.components.LoadingBox
import com.ecms.trucker.ui.components.WithdrawalProgressChecklist
import com.ecms.trucker.ui.components.WithdrawalProgressItem
import com.ecms.trucker.ui.theme.IcsColors
import com.ecms.trucker.ui.util.rememberScreenLoadState
import com.ecms.trucker.util.BulkContainerPaste
import com.ecms.trucker.util.TextRecognitionOcr
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.time.LocalDate

private enum class WithdrawalWizardStep {
    Booking,
    Shipment,
    AtwDocument,
    Review,
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun WithdrawalNewWizard(
    repository: TruckerRepository,
    truckingCompany: String,
    onBooked: (Int) -> Unit,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val draftStore = remember { WithdrawalDraftStore(context) }
    val loadState = rememberScreenLoadState(initiallyLoading = true)
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    var config by remember { mutableStateOf<WithdrawalFormConfigDto?>(null) }
    var nextBookingNumber by remember { mutableStateOf("") }
    var activeStep by remember { mutableIntStateOf(0) }
    var error by remember { mutableStateOf<String?>(null) }
    var submitting by remember { mutableStateOf(false) }
    var restoredDraft by remember { mutableStateOf(false) }
    var draftReady by remember { mutableStateOf(false) }
    var showQuickStart by remember { mutableStateOf(false) }
    var bulkPasteOpen by remember { mutableStateOf(false) }
    var bulkPasteText by remember { mutableStateOf("") }
    var issuedItems by remember { mutableStateOf<List<WithdrawalDto>>(emptyList()) }
    var previousItems by remember { mutableStateOf<List<WithdrawalDto>>(emptyList()) }

    var plateNumber by remember { mutableStateOf("") }
    var driverName by remember { mutableStateOf("") }
    var purpose by remember { mutableStateOf("Repositioning") }
    var atwNumber by remember { mutableStateOf("") }
    var shippingLineId by remember { mutableIntStateOf(0) }
    var destination by remember { mutableStateOf("") }
    var issueDate by remember { mutableStateOf(LocalDate.now().toString()) }
    var expirationDate by remember { mutableStateOf(LocalDate.now().plusDays(14).toString()) }
    var remarks by remember { mutableStateOf("") }
    var lines by remember { mutableStateOf(listOf(WithdrawalLineDraft())) }

    var atwFileUri by remember { mutableStateOf<Uri?>(null) }
    var atwFileName by remember { mutableStateOf<String?>(null) }
    var ocrLoading by remember { mutableStateOf(false) }
    var ocrNote by remember { mutableStateOf<String?>(null) }
    var atwWarning by remember { mutableStateOf<String?>(null) }

    val steps = listOf(
        stringResource(R.string.withdrawal_wizard_step_booking),
        stringResource(R.string.withdrawal_wizard_step_shipment),
        stringResource(R.string.withdrawal_wizard_step_atw),
        stringResource(R.string.withdrawal_wizard_step_review),
    )

    val completeLines = lines.filter {
        it.containerNo.isNotBlank() && it.containerSizeId > 0 && it.containerTypeId > 0
    }

    val bookingStepValid = truckingCompany.isNotBlank() &&
        plateNumber.isNotBlank() &&
        driverName.isNotBlank()

    val shipmentStepValid = atwNumber.isNotBlank() &&
        shippingLineId > 0 &&
        destination.isNotBlank() &&
        issueDate.isNotBlank() &&
        expirationDate.isNotBlank() &&
        completeLines.isNotEmpty() &&
        atwWarning == null

    val progressItems = listOf(
        WithdrawalProgressItem("booking", stringResource(R.string.withdrawal_progress_booking), nextBookingNumber.isNotBlank()),
        WithdrawalProgressItem("truck", stringResource(R.string.withdrawal_progress_trucking), bookingStepValid),
        WithdrawalProgressItem("atw", stringResource(R.string.withdrawal_progress_atw), atwNumber.isNotBlank()),
        WithdrawalProgressItem("line", stringResource(R.string.withdrawal_progress_shipping_line), shippingLineId > 0),
        WithdrawalProgressItem("dest", stringResource(R.string.withdrawal_progress_destination), destination.isNotBlank()),
        WithdrawalProgressItem("dates", stringResource(R.string.withdrawal_progress_dates), issueDate.isNotBlank() && expirationDate.isNotBlank()),
        WithdrawalProgressItem("containers", stringResource(R.string.withdrawal_progress_containers), completeLines.isNotEmpty()),
        WithdrawalProgressItem("cert", stringResource(R.string.withdrawal_progress_certificate), atwFileUri != null),
    )

    fun currentDraft() = WithdrawalWizardDraft(
        plateNumber = plateNumber,
        driverName = driverName,
        purpose = purpose,
        atwNumber = atwNumber,
        shippingLineId = shippingLineId,
        destination = destination,
        issueDate = issueDate,
        expirationDate = expirationDate,
        remarks = remarks,
        lines = lines,
    )

    fun applyDraft(draft: WithdrawalWizardDraft) {
        plateNumber = draft.plateNumber
        driverName = draft.driverName
        purpose = draft.purpose
        atwNumber = draft.atwNumber
        shippingLineId = draft.shippingLineId
        destination = draft.destination
        issueDate = draft.issueDate.ifBlank { LocalDate.now().toString() }
        expirationDate = draft.expirationDate.ifBlank { LocalDate.now().plusDays(14).toString() }
        remarks = draft.remarks
        lines = draft.lines.ifEmpty { listOf(WithdrawalLineDraft()) }
    }

    fun applyShippingLineDefaults(lineId: Int) {
        shippingLineId = lineId
        val rules = config?.shippingLineRules?.find { it.shippingLineId == lineId }
        if (issueDate.isBlank()) issueDate = LocalDate.now().toString()
        if (expirationDate.isBlank()) {
            expirationDate = LocalDate.now().plusDays((rules?.defaultValidityDays ?: 14).toLong()).toString()
        }
    }

    fun applyWithdrawalTemplate(item: WithdrawalDto) {
        atwNumber = item.atwNumber
        shippingLineId = item.shippingLineId
        destination = item.destination
        issueDate = item.issueDate
        expirationDate = item.expirationDate
        remarks = item.remarks.orEmpty()
        lines = item.lines.map {
            WithdrawalLineDraft(it.containerNo, it.containerSizeId, it.containerTypeId)
        }.ifEmpty { listOf(WithdrawalLineDraft()) }
    }

    fun load() {
        scope.launch {
            loadState.begin(config != null)
            error = null
            runCatching {
                config = repository.getWithdrawalFormConfig()
                nextBookingNumber = repository.getNextBookingNumber()
                val all = repository.listWithdrawals()
                issuedItems = all.filter { it.status.equals("Issued", true) }
                previousItems = all.filter {
                    it.status.equals("Booked", true) ||
                        it.status.equals("Approved", true) ||
                        it.status.equals("Released", true) ||
                        it.status.equals("Completed", true)
                }.take(8)
                if (!restoredDraft) {
                    draftStore.load()?.let { draft ->
                        applyDraft(draft)
                        restoredDraft = true
                    }
                }
                if (destination.isBlank()) {
                    destination = config?.destinations?.firstOrNull()?.label.orEmpty()
                }
                draftReady = true
            }.onFailure { error = it.message }
            loadState.end()
        }
    }

    LaunchedEffect(Unit) { load() }

    LaunchedEffect(plateNumber, driverName, purpose, atwNumber, shippingLineId, destination, issueDate, expirationDate, remarks, lines, draftReady) {
        if (!draftReady) return@LaunchedEffect
        draftStore.save(currentDraft())
    }

    LaunchedEffect(atwNumber) {
        if (atwNumber.isBlank()) {
            atwWarning = null
            return@LaunchedEffect
        }
        delay(400)
        runCatching { repository.checkAtwNumber(atwNumber.trim()) }
            .onSuccess { check ->
                atwWarning = if (check.isTaken) {
                    context.getString(R.string.withdrawal_atw_taken, check.referenceNo.orEmpty())
                } else null
            }
    }

    val atwDocPicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        uri ?: return@rememberLauncherForActivityResult
        atwFileUri = uri
        atwFileName = uri.lastPathSegment
        ocrLoading = true
        scope.launch {
            runCatching { TextRecognitionOcr.extractAtwDocumentMetadata(context, uri) }
                .onSuccess { meta ->
                    meta.atwNumber?.let { atwNumber = it }
                    meta.issueDate?.let { issueDate = it }
                    meta.expirationDate?.let { expirationDate = it }
                    meta.destination?.let { destination = it }
                    if (meta.containerNumbers.isNotEmpty()) {
                        lines = meta.containerNumbers.map { WithdrawalLineDraft(containerNo = it) }
                        ocrNote = context.getString(R.string.withdrawal_ocr_containers, meta.containerNumbers.size)
                    } else {
                        ocrNote = context.getString(R.string.withdrawal_ocr_applied)
                    }
                }
                .onFailure {
                    ocrNote = context.getString(R.string.withdrawal_ocr_manual)
                }
            ocrLoading = false
        }
    }

    fun submitBook() {
        scope.launch {
            submitting = true
            error = null
            runCatching {
                val booked = repository.bookWithdrawal(
                    BookWithdrawalRequest(
                        plateNumber = plateNumber.trim(),
                        driverName = driverName.trim(),
                        atwNumber = atwNumber.trim().uppercase(),
                        shippingLineId = shippingLineId,
                        purpose = purpose,
                        lines = completeLines.map {
                            WithdrawalLineInput(
                                containerNo = it.containerNo.trim().uppercase(),
                                containerSizeId = it.containerSizeId,
                                containerTypeId = it.containerTypeId,
                            )
                        },
                        destination = destination.trim(),
                        issueDate = issueDate,
                        expirationDate = expirationDate,
                        remarks = remarks.ifBlank { null },
                    ),
                )
                atwFileUri?.let { uri ->
                    runCatching { repository.uploadWithdrawalDocument(booked.id, uri) }
                }
                draftStore.clear()
                booked.id
            }.onSuccess { onBooked(it) }
                .onFailure { err -> error = err.message; submitting = false }
        }
    }

    if (bulkPasteOpen) {
        AlertDialog(
            onDismissRequest = { bulkPasteOpen = false },
            title = { Text(stringResource(R.string.withdrawal_bulk_paste_title)) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(stringResource(R.string.withdrawal_bulk_paste_hint), style = MaterialTheme.typography.bodySmall)
                    OutlinedTextField(
                        value = bulkPasteText,
                        onValueChange = { bulkPasteText = it },
                        modifier = Modifier.fillMaxWidth().height(140.dp),
                        placeholder = { Text("ABCD1234567\nEFGH7654321") },
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val parsed = BulkContainerPaste.parse(bulkPasteText)
                        if (parsed.isNotEmpty()) {
                            lines = parsed.map { WithdrawalLineDraft(containerNo = it) }
                        }
                        bulkPasteOpen = false
                        bulkPasteText = ""
                    },
                ) { Text(stringResource(R.string.action_apply)) }
            },
            dismissButton = {
                TextButton(onClick = { bulkPasteOpen = false }) { Text(stringResource(R.string.action_cancel)) }
            },
        )
    }

    IcsScreenScaffold(
        title = stringResource(R.string.withdrawal_wizard_title),
        subtitle = steps.getOrNull(activeStep),
        onBack = onBack,
        refreshing = loadState.refreshing,
        onRefresh = { load() },
        showRefreshFeedback = false,
        snackbarHost = { _ -> SnackbarHost(hostState = snackbarHostState) },
    ) { padding ->
        when {
            loadState.loading && config == null -> LoadingBox(Modifier.padding(padding))
            error != null && config == null -> ErrorMessage(error!!, { load() }, Modifier.padding(padding))
            config != null -> {
                val c = config!!
                Column(
                    modifier = Modifier
                        .padding(padding)
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        steps.forEachIndexed { index, label ->
                            FilterChip(
                                selected = index == activeStep,
                                onClick = { },
                                enabled = false,
                                label = { Text(label) },
                            )
                        }
                    }

                    WithdrawalProgressChecklist(items = progressItems)

                    IcsSectionCard(title = steps[activeStep]) {
                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            when (WithdrawalWizardStep.entries[activeStep]) {
                                WithdrawalWizardStep.Booking -> {
                                    Text(
                                        stringResource(R.string.withdrawal_wizard_booking_intro),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = IcsColors.TextSecondary,
                                    )
                                    OutlinedTextField(
                                        value = nextBookingNumber.ifBlank { stringResource(R.string.withdrawal_booking_generating) },
                                        onValueChange = {},
                                        readOnly = true,
                                        label = { Text(stringResource(R.string.field_booking_number)) },
                                        modifier = Modifier.fillMaxWidth(),
                                    )
                                    WizardDropdown(
                                        label = stringResource(R.string.field_purpose),
                                        options = listOf("Repositioning", "Export"),
                                        selected = purpose,
                                        onSelect = { purpose = it },
                                    )
                                    OutlinedTextField(
                                        value = truckingCompany.ifBlank { "—" },
                                        onValueChange = {},
                                        readOnly = true,
                                        label = { Text(stringResource(R.string.field_trucking_company)) },
                                        modifier = Modifier.fillMaxWidth(),
                                    )
                                    OutlinedTextField(
                                        value = plateNumber,
                                        onValueChange = { plateNumber = it.uppercase() },
                                        label = { Text(stringResource(R.string.field_plate_number)) },
                                        modifier = Modifier.fillMaxWidth(),
                                    )
                                    OutlinedTextField(
                                        value = driverName,
                                        onValueChange = { driverName = it },
                                        label = { Text(stringResource(R.string.field_driver_name)) },
                                        modifier = Modifier.fillMaxWidth(),
                                    )
                                }

                                WithdrawalWizardStep.Shipment -> {
                                    if (restoredDraft) {
                                        Surface(color = IcsColors.Primary.copy(alpha = 0.08f), shape = MaterialTheme.shapes.small) {
                                            Text(
                                                stringResource(R.string.withdrawal_draft_restored),
                                                modifier = Modifier.padding(10.dp),
                                                style = MaterialTheme.typography.bodySmall,
                                                color = IcsColors.Primary,
                                            )
                                        }
                                    }
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        OutlinedButton(onClick = { bulkPasteOpen = true }, modifier = Modifier.weight(1f)) {
                                            Text(stringResource(R.string.withdrawal_bulk_paste_title))
                                        }
                                        OutlinedButton(onClick = { showQuickStart = !showQuickStart }, modifier = Modifier.weight(1f)) {
                                            Icon(Icons.Default.History, contentDescription = null, modifier = Modifier.padding(end = 4.dp))
                                            Text(stringResource(if (showQuickStart) R.string.withdrawal_hide_quick_start else R.string.withdrawal_show_quick_start))
                                        }
                                    }
                                    if (showQuickStart) {
                                        QuickStartPanel(
                                            issuedItems = issuedItems,
                                            previousItems = previousItems,
                                            onSelect = { applyWithdrawalTemplate(it) },
                                        )
                                    }
                                    OutlinedTextField(
                                        value = atwNumber,
                                        onValueChange = { atwNumber = it.uppercase() },
                                        label = { Text(stringResource(R.string.field_atw_number)) },
                                        modifier = Modifier.fillMaxWidth(),
                                    )
                                    atwWarning?.let {
                                        Text(it, color = IcsColors.Warning, style = MaterialTheme.typography.bodySmall)
                                    }
                                    WizardIntDropdown(
                                        label = stringResource(R.string.field_shipping_line),
                                        options = c.shippingLines.map { it.id to it.name },
                                        selected = shippingLineId,
                                        onSelect = { applyShippingLineDefaults(it) },
                                    )
                                    WizardDestinationDropdown(
                                        destinations = c.destinations.map { it.label },
                                        selected = destination,
                                        onSelect = { destination = it },
                                    )
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        OutlinedTextField(
                                            value = issueDate,
                                            onValueChange = { issueDate = it },
                                            label = { Text(stringResource(R.string.field_issue_date)) },
                                            modifier = Modifier.weight(1f),
                                            placeholder = { Text("YYYY-MM-DD") },
                                        )
                                        OutlinedTextField(
                                            value = expirationDate,
                                            onValueChange = { expirationDate = it },
                                            label = { Text(stringResource(R.string.field_expiration_date)) },
                                            modifier = Modifier.weight(1f),
                                            placeholder = { Text("YYYY-MM-DD") },
                                        )
                                    }
                                    OutlinedTextField(
                                        value = remarks,
                                        onValueChange = { remarks = it },
                                        label = { Text(stringResource(R.string.field_remarks)) },
                                        modifier = Modifier.fillMaxWidth(),
                                    )
                                    Text(
                                        stringResource(R.string.withdrawal_containers_heading),
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                    lines.forEachIndexed { index, line ->
                                        WithdrawalWizardLineRow(
                                            index = index,
                                            line = line,
                                            sizes = c.containerSizes.map { it.id to it.label },
                                            types = c.containerTypes.map { it.id to it.label },
                                            canRemove = lines.size > 1,
                                            onChange = { updated ->
                                                lines = lines.toMutableList().also { it[index] = updated }
                                            },
                                            onRemove = {
                                                lines = lines.filterIndexed { i, _ -> i != index }
                                                    .ifEmpty { listOf(WithdrawalLineDraft()) }
                                            },
                                        )
                                    }
                                    OutlinedButton(
                                        onClick = { lines = lines + WithdrawalLineDraft() },
                                        modifier = Modifier.fillMaxWidth(),
                                    ) {
                                        Icon(Icons.Default.Add, contentDescription = null)
                                        Spacer(Modifier.width(6.dp))
                                        Text(stringResource(R.string.withdrawal_add_container))
                                    }
                                    if (lines.any { it.containerNo.isNotBlank() && (it.containerSizeId <= 0 || it.containerTypeId <= 0) }) {
                                        Text(
                                            stringResource(R.string.withdrawal_size_type_required),
                                            color = IcsColors.Warning,
                                            style = MaterialTheme.typography.bodySmall,
                                        )
                                    }
                                }

                                WithdrawalWizardStep.AtwDocument -> {
                                    Text(
                                        stringResource(R.string.withdrawal_wizard_atw_intro),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = IcsColors.TextSecondary,
                                    )
                                    OutlinedButton(
                                        onClick = { atwDocPicker.launch(arrayOf("image/*", "application/pdf")) },
                                        enabled = !ocrLoading,
                                        modifier = Modifier.fillMaxWidth(),
                                    ) {
                                        if (ocrLoading) {
                                            CircularProgressIndicator(modifier = Modifier.padding(end = 8.dp))
                                        }
                                        Text(
                                            atwFileName ?: stringResource(R.string.withdrawal_choose_atw_document),
                                        )
                                    }
                                    ocrNote?.let {
                                        Text(it, style = MaterialTheme.typography.bodySmall, color = IcsColors.Primary)
                                    }
                                }

                                WithdrawalWizardStep.Review -> {
                                    ReviewRow(stringResource(R.string.field_booking_number), nextBookingNumber)
                                    ReviewRow(stringResource(R.string.field_purpose), purpose)
                                    ReviewRow(stringResource(R.string.field_plate_number), plateNumber)
                                    ReviewRow(stringResource(R.string.field_driver_name), driverName)
                                    ReviewRow(stringResource(R.string.field_atw_number), atwNumber)
                                    ReviewRow(
                                        stringResource(R.string.field_shipping_line),
                                        c.shippingLines.find { it.id == shippingLineId }?.name.orEmpty(),
                                    )
                                    ReviewRow(stringResource(R.string.field_destination), destination)
                                    ReviewRow(stringResource(R.string.field_issue_date), issueDate)
                                    ReviewRow(stringResource(R.string.field_expiration_date), expirationDate)
                                    ReviewRow(
                                        stringResource(R.string.withdrawal_containers_heading),
                                        completeLines.joinToString { it.containerNo },
                                    )
                                    atwFileName?.let { ReviewRow(stringResource(R.string.withdrawal_atw_certificate), it) }
                                    error?.let { Text(it, color = IcsColors.Error, style = MaterialTheme.typography.bodySmall) }
                                }
                            }
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        if (activeStep > 0) {
                            OutlinedButton(onClick = { activeStep -= 1 }) {
                                Text(stringResource(R.string.action_back))
                            }
                        } else {
                            Spacer(Modifier.width(1.dp))
                        }
                        when (WithdrawalWizardStep.entries[activeStep]) {
                            WithdrawalWizardStep.Booking -> {
                                Button(
                                    onClick = { activeStep = 1 },
                                    enabled = bookingStepValid,
                                ) { Text(stringResource(R.string.withdrawal_continue_shipment)) }
                            }
                            WithdrawalWizardStep.Shipment -> {
                                Button(
                                    onClick = { activeStep = 2 },
                                    enabled = shipmentStepValid,
                                ) { Text(stringResource(R.string.withdrawal_continue_atw)) }
                            }
                            WithdrawalWizardStep.AtwDocument -> {
                                Button(
                                    onClick = { activeStep = 3 },
                                    enabled = atwFileUri != null && shipmentStepValid,
                                ) { Text(stringResource(R.string.withdrawal_continue_review)) }
                            }
                            WithdrawalWizardStep.Review -> {
                                Button(
                                    onClick = { submitBook() },
                                    enabled = !submitting && shipmentStepValid && atwFileUri != null,
                                ) {
                                    Text(if (submitting) "..." else stringResource(R.string.withdrawal_book_ics))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun QuickStartPanel(
    issuedItems: List<WithdrawalDto>,
    previousItems: List<WithdrawalDto>,
    onSelect: (WithdrawalDto) -> Unit,
) {
    Surface(
        shape = MaterialTheme.shapes.medium,
        color = IcsColors.Background,
        border = androidx.compose.foundation.BorderStroke(1.dp, IcsColors.Divider),
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            if (issuedItems.isNotEmpty()) {
                Text(
                    stringResource(R.string.withdrawal_quick_start_issued, issuedItems.size),
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold,
                )
                issuedItems.take(5).forEach { item ->
                    TextButton(onClick = { onSelect(item) }, modifier = Modifier.fillMaxWidth()) {
                        Text("${item.atwNumber} · ${item.referenceNo}", maxLines = 1)
                    }
                }
            }
            if (previousItems.isNotEmpty()) {
                Text(
                    stringResource(R.string.withdrawal_quick_start_previous),
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold,
                )
                previousItems.take(5).forEach { item ->
                    TextButton(onClick = { onSelect(item) }, modifier = Modifier.fillMaxWidth()) {
                        Text("${item.atwNumber} · ${item.containerSummary}", maxLines = 1)
                    }
                }
            }
        }
    }
}

@Composable
private fun ReviewRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = IcsColors.TextSecondary)
        Text(value, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun WithdrawalWizardLineRow(
    index: Int,
    line: WithdrawalLineDraft,
    sizes: List<Pair<Int, String>>,
    types: List<Pair<Int, String>>,
    canRemove: Boolean,
    onChange: (WithdrawalLineDraft) -> Unit,
    onRemove: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.withdrawal_container_row, index + 1), modifier = Modifier.weight(1f))
            if (canRemove) {
                IconButton(onClick = onRemove) {
                    Icon(Icons.Default.DeleteOutline, contentDescription = stringResource(R.string.action_remove))
                }
            }
        }
        OutlinedTextField(
            value = line.containerNo,
            onValueChange = { onChange(line.copy(containerNo = it.uppercase())) },
            label = { Text(stringResource(R.string.field_container_number)) },
            modifier = Modifier.fillMaxWidth(),
        )
        WizardIntDropdown(
            label = stringResource(R.string.field_size),
            options = sizes,
            selected = line.containerSizeId,
            onSelect = { onChange(line.copy(containerSizeId = it)) },
        )
        WizardIntDropdown(
            label = stringResource(R.string.field_type),
            options = types,
            selected = line.containerTypeId,
            onSelect = { onChange(line.copy(containerTypeId = it)) },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun WizardDropdown(
    label: String,
    options: List<String>,
    selected: String,
    onSelect: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
        OutlinedTextField(
            value = selected,
            onValueChange = {},
            readOnly = true,
            label = { Text(label) },
            modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable, true).fillMaxWidth(),
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { option ->
                androidx.compose.material3.DropdownMenuItem(
                    text = { Text(option) },
                    onClick = { onSelect(option); expanded = false },
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun WizardIntDropdown(
    label: String,
    options: List<Pair<Int, String>>,
    selected: Int,
    onSelect: (Int) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedLabel = options.find { it.first == selected }?.second ?: stringResource(R.string.field_select_label, label)
    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
        OutlinedTextField(
            value = selectedLabel,
            onValueChange = {},
            readOnly = true,
            label = { Text(label) },
            modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable, true).fillMaxWidth(),
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { (id, name) ->
                androidx.compose.material3.DropdownMenuItem(
                    text = { Text(name) },
                    onClick = { onSelect(id); expanded = false },
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun WizardDestinationDropdown(
    destinations: List<String>,
    selected: String,
    onSelect: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
        OutlinedTextField(
            value = selected,
            onValueChange = {},
            readOnly = true,
            label = { Text(stringResource(R.string.field_destination)) },
            modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable, true).fillMaxWidth(),
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            destinations.forEach { dest ->
                androidx.compose.material3.DropdownMenuItem(
                    text = { Text(dest) },
                    onClick = { onSelect(dest); expanded = false },
                )
            }
        }
    }
}
