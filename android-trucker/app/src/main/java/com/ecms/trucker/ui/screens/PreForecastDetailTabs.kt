package com.ecms.trucker.ui.screens

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.ecms.trucker.R
import com.ecms.trucker.data.model.AuditLogDto
import com.ecms.trucker.data.model.PreAdviceDto
import com.ecms.trucker.data.model.PreAdviceLookupsDto
import com.ecms.trucker.data.model.QrBookingDto
import com.ecms.trucker.data.model.ScheduleDto
import com.ecms.trucker.data.repository.TruckerRepository
import com.ecms.trucker.ui.components.IcsGuidanceBanner
import com.ecms.trucker.ui.components.IcsGuidanceKind
import com.ecms.trucker.ui.components.IcsInfoTile
import com.ecms.trucker.ui.components.IcsInfoTileGrid
import com.ecms.trucker.ui.components.IcsSectionCard
import com.ecms.trucker.ui.components.QrDownloadActions
import com.ecms.trucker.ui.theme.IcsColors
import com.ecms.trucker.util.GuidanceSeverity
import com.ecms.trucker.util.StatusGuidance
import com.ecms.trucker.util.canBookLogicteck
import com.ecms.trucker.util.isScheduleConfirmed
import com.ecms.trucker.util.isScheduleForPayment
import com.ecms.trucker.util.logicteckStatusFromBooking
import com.ecms.trucker.util.scheduleStatusLabel
import com.ecms.trucker.util.QrCodeGenerator
import kotlinx.coroutines.launch

enum class PreForecastDetailTab {
    Overview,
    Details,
    Photos,
    Schedule,
    Qr,
    Activity,
    ;

    companion object {
        fun fromRoute(value: String?): PreForecastDetailTab? = when (value?.lowercase()) {
            "overview" -> Overview
            "details" -> Details
            "photos" -> Photos
            "schedule" -> Schedule
            "qr" -> Qr
            "activity" -> Activity
            else -> null
        }
    }
}

@Composable
internal fun preForecastDetailTabLabel(
    tab: PreForecastDetailTab,
    photoUploaded: Int? = null,
    photoTotal: Int? = null,
): String = when (tab) {
    PreForecastDetailTab.Overview -> stringResource(R.string.preforecast_tab_overview)
    PreForecastDetailTab.Details -> stringResource(R.string.preforecast_tab_details)
    PreForecastDetailTab.Photos -> {
        if (photoUploaded != null && photoTotal != null) {
            stringResource(R.string.preforecast_tab_photos_count, photoUploaded, photoTotal)
        } else {
            stringResource(R.string.preforecast_tab_photos)
        }
    }
    PreForecastDetailTab.Schedule -> stringResource(R.string.preforecast_tab_schedule)
    PreForecastDetailTab.Qr -> stringResource(R.string.preforecast_tab_qr)
    PreForecastDetailTab.Activity -> stringResource(R.string.preforecast_tab_activity)
}

@Composable
internal fun PreForecastHeroActions(
    canEdit: Boolean,
    canDelete: Boolean,
    canCancel: Boolean,
    canSubmit: Boolean,
    submitLabel: String,
    showPayDemurrage: Boolean,
    loading: Boolean,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onCancel: () -> Unit,
    onSubmit: () -> Unit,
    onPayDemurrage: () -> Unit,
) {
    if (!canEdit && !canDelete && !canCancel && !canSubmit && !showPayDemurrage) return
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        if (showPayDemurrage) {
            Button(onClick = onPayDemurrage, enabled = !loading, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.preforecast_pay_demurrage))
            }
        }
        if (canSubmit) {
            Button(onClick = onSubmit, enabled = !loading, modifier = Modifier.fillMaxWidth()) {
                Text(submitLabel)
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            if (canEdit) {
                OutlinedButton(onClick = onEdit, enabled = !loading, modifier = Modifier.weight(1f)) {
                    Text(stringResource(R.string.action_edit))
                }
            }
            if (canCancel) {
                OutlinedButton(onClick = onCancel, enabled = !loading, modifier = Modifier.weight(1f)) {
                    Text(stringResource(R.string.preforecast_cancel_request))
                }
            }
            if (canDelete) {
                OutlinedButton(onClick = onDelete, enabled = !loading, modifier = Modifier.weight(1f)) {
                    Text(stringResource(R.string.action_delete))
                }
            }
        }
    }
}

@Composable
internal fun PreForecastGuidanceBanner(guidance: StatusGuidance?) {
    guidance ?: return
    val kind = when (guidance.severity) {
        GuidanceSeverity.Info -> IcsGuidanceKind.Info
        GuidanceSeverity.Success -> IcsGuidanceKind.Success
        GuidanceSeverity.Warning -> IcsGuidanceKind.Warning
        GuidanceSeverity.Error -> IcsGuidanceKind.Error
    }
    IcsGuidanceBanner(
        message = guidance.message,
        kind = kind,
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
    )
}

@Composable
private fun EmbeddedTabLoading() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(200.dp),
        contentAlignment = Alignment.Center,
    ) {
        CircularProgressIndicator(color = IcsColors.Primary)
    }
}

@Composable
internal fun PreForecastOverviewTab(
    item: PreAdviceDto,
    schedule: ScheduleDto?,
    qr: QrBookingDto?,
    onOpenSchedule: () -> Unit,
    onOpenQr: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        IcsSectionCard(title = stringResource(R.string.preforecast_tab_overview)) {
            val detailTiles = buildList {
                add(stringResource(R.string.field_container) to item.containerNo)
                add(stringResource(R.string.field_size_type) to "${item.containerSize} / ${item.containerType}")
                add(stringResource(R.string.field_shipping_line) to item.shippingLineName)
                item.croEdoReferenceNo?.takeIf { it.isNotBlank() }?.let {
                    add(stringResource(R.string.field_cro_reference) to it)
                }
                item.demurrageValidUntil?.takeIf { it.isNotBlank() }?.let {
                    add(stringResource(R.string.field_free_time_until) to it)
                }
                item.qrCode?.takeIf { it.isNotBlank() }?.let {
                    add(stringResource(R.string.field_qr_reference) to it)
                }
                add(stringResource(R.string.field_created) to item.createdAt)
            }
            IcsInfoTileGrid(tiles = detailTiles)
        }
        if (item.status.equals("Approved", true)) {
            IcsSectionCard(title = stringResource(R.string.preforecast_tab_schedule)) {
                if (schedule == null) {
                    Text(stringResource(R.string.preforecast_schedule_empty), color = IcsColors.TextSecondary, modifier = Modifier.padding(8.dp))
                } else {
                    IcsInfoTileGrid(
                        tiles = listOf(
                            stringResource(R.string.field_depot) to schedule.depotName,
                            stringResource(R.string.field_date) to schedule.date,
                            stringResource(R.string.field_status) to scheduleStatusLabel(schedule.status),
                        ),
                    )
                }
                OutlinedButton(onClick = onOpenSchedule, modifier = Modifier.fillMaxWidth().padding(8.dp)) {
                    Text(stringResource(R.string.preforecast_view_schedule_tab))
                }
            }
            if (qr != null) {
                IcsSectionCard(title = stringResource(R.string.preforecast_tab_qr)) {
                    IcsInfoTileGrid(
                        tiles = listOf(
                            stringResource(R.string.field_qr_reference) to qr.qrCode,
                            stringResource(R.string.field_logicteck) to logicteckStatusFromBooking(qr).label,
                        ),
                    )
                    OutlinedButton(onClick = onOpenQr, modifier = Modifier.fillMaxWidth().padding(8.dp)) {
                        Text(stringResource(R.string.preforecast_view_qr_tab))
                    }
                }
            }
        }
    }
}

@Composable
internal fun PreForecastDetailsTab(item: PreAdviceDto) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        IcsSectionCard(title = stringResource(R.string.preforecast_tab_details)) {
            val tiles = buildList {
                add(stringResource(R.string.field_reference) to item.referenceNo)
                add(stringResource(R.string.field_trucker) to item.truckerName)
                add(stringResource(R.string.field_container) to item.containerNo)
                add(stringResource(R.string.field_size_type) to "${item.containerSize} / ${item.containerType}")
                add(stringResource(R.string.field_shipping_line) to item.shippingLineName)
                add(stringResource(R.string.field_status) to item.status)
                add(stringResource(R.string.field_created) to item.createdAt)
                item.evaluatedAt?.takeIf { it.isNotBlank() }?.let {
                    add(stringResource(R.string.field_evaluated_at) to it)
                }
            }
            IcsInfoTileGrid(tiles = tiles)
            item.remarks?.takeIf { it.isNotBlank() }?.let { remarks ->
                Spacer(Modifier.height(8.dp))
                IcsInfoTile(stringResource(R.string.field_remarks), remarks, Modifier.padding(horizontal = 8.dp))
            }
            item.complianceRemarks?.takeIf { it.isNotBlank() }?.let { remarks ->
                Spacer(Modifier.height(8.dp))
                IcsInfoTile(stringResource(R.string.field_compliance_remarks), remarks, Modifier.padding(horizontal = 8.dp))
            }
        }
    }
}

@Composable
internal fun PreForecastScheduleTab(
    schedule: ScheduleDto?,
    loading: Boolean,
    error: String?,
    onUploadPayment: ((Int) -> Unit)?,
    onRetry: () -> Unit,
) {
    when {
        loading -> EmbeddedTabLoading()
        error != null -> Column(
            Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(error, color = MaterialTheme.colorScheme.error)
            TextButton(onClick = onRetry) { Text(stringResource(R.string.action_retry)) }
        }
        schedule == null -> Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
            Text(stringResource(R.string.preforecast_schedule_empty), color = IcsColors.TextSecondary)
        }
        else -> Column(
            Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            IcsSectionCard(title = stringResource(R.string.preforecast_tab_schedule)) {
                IcsInfoTileGrid(
                    tiles = listOf(
                        stringResource(R.string.field_reference) to schedule.referenceNo,
                        stringResource(R.string.field_depot) to schedule.depotName,
                        stringResource(R.string.field_date) to schedule.date,
                        stringResource(R.string.field_time) to "${schedule.time} · Slot ${schedule.slotNo}",
                        stringResource(R.string.field_status) to scheduleStatusLabel(schedule.status),
                    ),
                )
                schedule.truckerName?.takeIf { it.isNotBlank() }?.let { name ->
                    Spacer(Modifier.height(8.dp))
                    IcsInfoTile(stringResource(R.string.field_trucker), name, Modifier.padding(horizontal = 8.dp))
                }
                schedule.depotRemarks?.takeIf { it.isNotBlank() }?.let { remarks ->
                    Spacer(Modifier.height(8.dp))
                    IcsInfoTile(stringResource(R.string.field_remarks), remarks, Modifier.padding(horizontal = 8.dp))
                }
            }
            if (schedule.status.equals("WaitingSchedule", true)) {
                Text(stringResource(R.string.preforecast_schedule_waiting), color = IcsColors.Warning, style = MaterialTheme.typography.bodySmall)
            }
            if (schedule.status.equals("Scheduled", true) && onUploadPayment != null) {
                Button(onClick = { onUploadPayment(schedule.id) }, modifier = Modifier.fillMaxWidth()) {
                    Text(stringResource(R.string.preforecast_go_to_payment))
                }
            }
        }
    }
}

@Composable
internal fun PreForecastQrTab(
    schedule: ScheduleDto?,
    qr: QrBookingDto?,
    bitmap: Bitmap?,
    loading: Boolean,
    booking: Boolean,
    message: String?,
    error: String?,
    downloading: Boolean = false,
    onDownloadQr: () -> Unit = {},
    onDownloadPdf: () -> Unit = {},
    onShareQr: () -> Unit = {},
    onSharePdf: () -> Unit = {},
    onBookLogicteck: () -> Unit,
    onRetry: () -> Unit,
    onUploadPayment: ((Int) -> Unit)?,
) {
    when {
        loading -> EmbeddedTabLoading()
        schedule == null -> Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
            Text(stringResource(R.string.preforecast_qr_no_schedule), color = IcsColors.TextSecondary)
        }
        isScheduleForPayment(schedule.status) -> Column(
            Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(stringResource(R.string.preforecast_qr_awaiting_payment), color = IcsColors.TextSecondary)
            if (onUploadPayment != null) {
                Button(onClick = { onUploadPayment(schedule.id) }, modifier = Modifier.fillMaxWidth()) {
                    Text(stringResource(R.string.preforecast_go_to_payment))
                }
            }
        }
        !isScheduleConfirmed(schedule.status) -> Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
            Text(stringResource(R.string.preforecast_qr_not_ready), color = IcsColors.TextSecondary)
        }
        error != null && qr == null -> Column(
            Modifier.fillMaxWidth().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(error, color = MaterialTheme.colorScheme.error)
            TextButton(onClick = onRetry) { Text(stringResource(R.string.action_retry)) }
        }
        qr != null -> Column(
            Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            bitmap?.let {
                Image(it.asImageBitmap(), contentDescription = stringResource(R.string.qr_image_desc), modifier = Modifier.size(220.dp))
            }
            Text(qr.qrCode, style = MaterialTheme.typography.titleMedium)
            val logicteck = logicteckStatusFromBooking(qr)
            IcsSectionCard(title = stringResource(R.string.preforecast_tab_qr)) {
                IcsInfoTileGrid(
                    tiles = listOf(
                        stringResource(R.string.field_container) to qr.payload.containerNo,
                        stringResource(R.string.field_depot) to qr.payload.depot,
                        stringResource(R.string.field_schedule) to "${qr.payload.scheduleDate} ${qr.payload.scheduleTime}",
                        stringResource(R.string.field_logicteck) to logicteck.label,
                    ),
                )
            }
            Text(stringResource(R.string.preforecast_logicteck_integration_note), style = MaterialTheme.typography.bodySmall, color = IcsColors.TextSecondary)
            when (logicteck) {
                com.ecms.trucker.util.LogicteckQrStatus.Booked -> Text(stringResource(R.string.preforecast_logicteck_booked), color = IcsColors.Primary, style = MaterialTheme.typography.bodySmall)
                com.ecms.trucker.util.LogicteckQrStatus.Retrieved -> Text(stringResource(R.string.preforecast_logicteck_retrieved), color = IcsColors.TextSecondary, style = MaterialTheme.typography.bodySmall)
                else -> Unit
            }
            message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
            QrDownloadActions(
                downloading = downloading,
                onDownloadQr = onDownloadQr,
                onDownloadPdf = onDownloadPdf,
                onShareQr = onShareQr,
                onSharePdf = onSharePdf,
                showLogicteck = canBookLogicteck(qr),
                logicteckBooking = booking,
                onBookLogicteck = onBookLogicteck,
            )
        }
        else -> EmbeddedTabLoading()
    }
}

@Composable
internal fun PreForecastActivityTab(
    preAdviceId: Int,
    repository: TruckerRepository,
    active: Boolean,
) {
    var items by remember(preAdviceId) { mutableStateOf<List<AuditLogDto>>(emptyList()) }
    var loading by remember(preAdviceId) { mutableStateOf(false) }
    var error by remember(preAdviceId) { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun load() {
        scope.launch {
            loading = true
            error = null
            runCatching { repository.getPreAdviceActivity(preAdviceId) }
                .onSuccess { items = it }
                .onFailure { error = it.message ?: "Failed to load activity log." }
            loading = false
        }
    }

    LaunchedEffect(preAdviceId, active) {
        if (active && items.isEmpty() && error == null) load()
    }

    when {
        !active -> Unit
        loading && items.isEmpty() -> EmbeddedTabLoading()
        error != null -> Column(
            Modifier.fillMaxWidth().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(error!!, color = MaterialTheme.colorScheme.error)
            TextButton(onClick = { load() }) { Text(stringResource(R.string.action_retry)) }
        }
        items.isEmpty() -> Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
            Text(stringResource(R.string.preforecast_activity_empty), color = IcsColors.TextSecondary)
        }
        else -> Column(
            Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items.forEach { entry ->
                IcsSectionCard(title = auditModuleLabel(entry.module)) {
                    Column(Modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(entry.action, style = MaterialTheme.typography.bodyMedium)
                        Text(
                            "${entry.username} · ${entry.timestamp}",
                            style = MaterialTheme.typography.bodySmall,
                            color = IcsColors.TextSecondary,
                        )
                        entry.details?.takeIf { it.isNotBlank() }?.let { details ->
                            Text(details, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun auditModuleLabel(module: String): String = when (module) {
    "PreForecast", "PreAdvice" -> stringResource(R.string.preforecast_tab_overview)
    "Evaluation" -> stringResource(R.string.preforecast_tab_evaluation)
    "Schedule" -> stringResource(R.string.preforecast_tab_schedule)
    "Payment" -> stringResource(R.string.payments_title)
    "QR", "BookingConfirmationPdf" -> stringResource(R.string.preforecast_tab_qr)
    "LOGICTECK" -> stringResource(R.string.field_logicteck)
    else -> module
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun PreForecastEditDialog(
    repository: TruckerRepository,
    lookups: PreAdviceLookupsDto,
    item: PreAdviceDto,
    saving: Boolean,
    onDismiss: () -> Unit,
    onSave: (shippingLineId: Int, containerNo: String, sizeId: Int, typeId: Int, remarks: String?) -> Unit,
) {
    val context = LocalContext.current
    var containerNo by remember(item.id) { mutableStateOf(item.containerNo) }
    var shippingLineId by remember(item.id) { mutableIntStateOf(item.shippingLineId) }
    var sizeId by remember(item.id) {
        mutableIntStateOf(lookups.containerSizes.find { it.label == item.containerSize }?.id ?: 0)
    }
    var typeId by remember(item.id) {
        mutableIntStateOf(
            lookups.containerTypes.find { it.code == item.containerType || it.label == item.containerType }?.id ?: 0,
        )
    }
    var remarks by remember(item.id) { mutableStateOf(item.remarks.orEmpty()) }
    var duplicateWarning by remember(item.id) { mutableStateOf<String?>(null) }

    LaunchedEffect(containerNo, sizeId, typeId) {
        if (containerNo.isBlank() || sizeId <= 0 || typeId <= 0) {
            duplicateWarning = null
            return@LaunchedEffect
        }
        runCatching {
            repository.checkPreAdviceDuplicate(containerNo.trim(), sizeId, typeId, excludePreAdviceId = item.id)
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

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.preforecast_edit_title)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    containerNo,
                    { containerNo = it.uppercase() },
                    label = { Text(stringResource(R.string.field_container_number)) },
                    modifier = Modifier.fillMaxWidth(),
                )
                PreForecastDialogDropdown(
                    label = stringResource(R.string.field_shipping_line),
                    options = lookups.shippingLines.map { it.id to it.name },
                    selected = shippingLineId,
                    onSelect = { shippingLineId = it },
                )
                PreForecastDialogDropdown(
                    label = stringResource(R.string.field_size),
                    options = lookups.containerSizes.map { it.id to it.label },
                    selected = sizeId,
                    onSelect = { sizeId = it },
                )
                PreForecastDialogDropdown(
                    label = stringResource(R.string.field_type),
                    options = lookups.containerTypes.map { it.id to it.label },
                    selected = typeId,
                    onSelect = { typeId = it },
                )
                OutlinedTextField(
                    remarks,
                    { remarks = it },
                    label = { Text(stringResource(R.string.field_remarks)) },
                    modifier = Modifier.fillMaxWidth(),
                )
                duplicateWarning?.let { warning ->
                    Text(
                        warning,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                enabled = !saving && containerNo.isNotBlank() && shippingLineId > 0 && sizeId > 0 && typeId > 0,
                onClick = {
                    onSave(shippingLineId, containerNo.trim(), sizeId, typeId, remarks.ifBlank { null })
                },
            ) { Text(if (saving) "..." else stringResource(R.string.action_save)) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(stringResource(R.string.action_cancel)) }
        },
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PreForecastDialogDropdown(
    label: String,
    options: List<Pair<Int, String>>,
    selected: Int,
    onSelect: (Int) -> Unit,
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
            options.forEach { (id, name) ->
                DropdownMenuItem(
                    text = { Text(name) },
                    onClick = { onSelect(id); expanded = false },
                )
            }
        }
    }
}
