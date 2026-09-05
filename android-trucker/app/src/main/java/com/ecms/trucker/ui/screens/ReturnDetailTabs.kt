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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.ecms.trucker.R
import com.ecms.trucker.data.model.PaymentDto
import com.ecms.trucker.data.model.PreAdviceDocumentDto
import com.ecms.trucker.data.model.PreAdviceDto
import com.ecms.trucker.data.model.QrBookingDto
import com.ecms.trucker.data.model.ScheduleDto
import com.ecms.trucker.ui.components.IcsInfoTileGrid
import com.ecms.trucker.ui.components.IcsPrimaryButton
import com.ecms.trucker.ui.components.IcsSecondaryButton
import com.ecms.trucker.ui.components.IcsSectionCard
import com.ecms.trucker.ui.components.PreForecastProgressStrip
import com.ecms.trucker.ui.components.QrDownloadActions
import com.ecms.trucker.ui.theme.IcsColors
import com.ecms.trucker.ui.util.AssetUrls
import com.ecms.trucker.ui.util.isWaitingSchedule
import com.ecms.trucker.util.buildReturnJourneySteps
import com.ecms.trucker.util.canBookLogicteck
import com.ecms.trucker.util.logicteckStatusFromBooking
import com.ecms.trucker.util.needsPaymentUpload
import com.ecms.trucker.util.resolvePaymentStatus

internal enum class ReturnDetailTab {
    Details,
    Photos,
    Payment,
    Qr,
}

@Composable
internal fun returnDetailTabLabel(tab: ReturnDetailTab, photoUploaded: Int? = null, photoTotal: Int? = null): String =
    when (tab) {
        ReturnDetailTab.Details -> stringResource(R.string.return_tab_details)
        ReturnDetailTab.Photos -> {
            if (photoUploaded != null && photoTotal != null) {
                stringResource(R.string.return_tab_photos_count, photoUploaded, photoTotal)
            } else {
                stringResource(R.string.return_tab_photos)
            }
        }
        ReturnDetailTab.Payment -> stringResource(R.string.return_tab_payment)
        ReturnDetailTab.Qr -> stringResource(R.string.return_tab_qr)
    }

@Composable
internal fun ReturnDetailsTabContent(
    schedule: ScheduleDto,
    preAdvice: PreAdviceDto?,
) {
    Column(
        Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        if (isWaitingSchedule(schedule.status)) {
            IcsSectionCard(title = stringResource(R.string.section_schedule)) {
                Column(Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                    Text(stringResource(R.string.returns_waiting_schedule_message), style = MaterialTheme.typography.bodyMedium)
                    Text(
                        stringResource(R.string.returns_waiting_schedule_hint),
                        style = MaterialTheme.typography.bodySmall,
                        color = IcsColors.TextSecondary,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                }
            }
        } else {
            IcsSectionCard(title = stringResource(R.string.section_schedule)) {
                IcsInfoTileGrid(
                    tiles = listOf(
                        stringResource(R.string.field_depot) to schedule.depotName,
                        stringResource(R.string.field_date) to schedule.date,
                        stringResource(R.string.field_time) to schedule.time,
                        stringResource(R.string.field_slot) to schedule.slotNo.toString(),
                    ),
                )
            }
        }
        preAdvice?.let { p ->
            IcsSectionCard(title = stringResource(R.string.section_preforecast)) {
                IcsInfoTileGrid(
                    tiles = buildList {
                        add(stringResource(R.string.field_reference) to p.referenceNo)
                        add(stringResource(R.string.field_container) to p.containerNo)
                        add(stringResource(R.string.field_size_type) to "${p.containerSize} / ${p.containerType}")
                        add(stringResource(R.string.field_shipping_line) to p.shippingLineName)
                        add(stringResource(R.string.field_status) to p.status)
                        p.demurrageValidUntil?.let { add(stringResource(R.string.field_demurrage_valid_until) to it) }
                    },
                )
            }
        }
    }
}

@Composable
internal fun ReturnPhotosTabContent(
    documents: List<PreAdviceDocumentDto>,
    uploadedRequired: Int,
    photosTotal: Int,
    accessToken: String?,
) {
    val context = LocalContext.current
    val identityDocs = documents.filter { doc ->
        val cat = doc.category.orEmpty()
        cat.isNotBlank() && !cat.equals("Damage", true) && !cat.equals("Others", true) && !cat.equals("CroEdo", true)
    }
    Column(
        Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(stringResource(R.string.return_tab_photos), style = MaterialTheme.typography.titleMedium)
            PhotoProgressChip(uploaded = uploadedRequired, total = photosTotal)
        }
        if (identityDocs.isEmpty()) {
            Text(stringResource(R.string.return_photos_empty), color = IcsColors.TextSecondary)
        } else {
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 1200.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                userScrollEnabled = false,
            ) {
                items(identityDocs, key = { it.id }) { doc ->
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        AsyncImage(
                            model = ImageRequest.Builder(context)
                                .data(AssetUrls.resolve(doc.filePath))
                                .apply {
                                    if (!accessToken.isNullOrBlank()) {
                                        addHeader("Authorization", "Bearer $accessToken")
                                    }
                                }
                                .build(),
                            contentDescription = doc.categoryLabel ?: doc.category,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(120.dp)
                                .clip(RoundedCornerShape(8.dp)),
                            contentScale = ContentScale.Crop,
                        )
                        Text(
                            doc.categoryLabel ?: doc.category.orEmpty(),
                            style = MaterialTheme.typography.labelSmall,
                            color = IcsColors.TextSecondary,
                        )
                    }
                }
            }
        }
    }
}

@Composable
internal fun ReturnPaymentTabContent(
    schedule: ScheduleDto,
    payment: PaymentDto?,
    onUploadPayment: () -> Unit,
) {
    val paymentStatus = resolvePaymentStatus(schedule, payment)
    val uploadNeeded = needsPaymentUpload(schedule, payment)
    Column(
        Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        PreForecastProgressStrip(
            steps = com.ecms.trucker.util.buildPaymentProgressSteps(
                paymentStatus = paymentStatus,
                hasProof = !payment?.proofFile.isNullOrBlank(),
                uploadNeeded = uploadNeeded,
            ),
        )
        IcsSectionCard(title = stringResource(R.string.section_payment)) {
            Column(Modifier.padding(horizontal = 12.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (payment != null) {
                    IcsInfoTileGrid(
                        tiles = listOf(
                            stringResource(R.string.field_status) to payment.status,
                            stringResource(R.string.field_amount) to "\u20B1${payment.amount}",
                        ),
                    )
                } else {
                    Text(stringResource(R.string.payment_not_uploaded_yet), color = IcsColors.TextSecondary)
                }
                if (uploadNeeded) {
                    Spacer(Modifier.height(4.dp))
                    IcsPrimaryButton(text = stringResource(R.string.payment_upload_title), onClick = onUploadPayment)
                }
            }
        }
    }
}

@Composable
internal fun ReturnQrTabContent(
    schedule: ScheduleDto,
    payment: PaymentDto?,
    qr: QrBookingDto?,
    bitmap: Bitmap?,
    qrLoading: Boolean,
    downloading: Boolean,
    logicteckBooking: Boolean,
    logicteckMessage: String?,
    accessToken: String?,
    onDownloadQr: () -> Unit,
    onDownloadPdf: () -> Unit,
    onShareQr: () -> Unit,
    onSharePdf: () -> Unit,
    onBookLogicteck: () -> Unit,
    onViewQrPass: () -> Unit,
) {
    val paymentStatus = resolvePaymentStatus(schedule, payment)
    Column(
        Modifier
            .fillMaxWidth()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        PreForecastProgressStrip(
            steps = buildReturnJourneySteps(schedule, paymentStatus, qr, qrLoading),
        )
        when {
            qr != null -> {
                bitmap?.let {
                    Image(
                        it.asImageBitmap(),
                        contentDescription = stringResource(R.string.qr_image_desc),
                        modifier = Modifier.size(220.dp),
                    )
                }
                Text(qr.qrCode, style = MaterialTheme.typography.titleMedium)
                val logicteck = logicteckStatusFromBooking(qr)
                IcsSectionCard(title = stringResource(R.string.section_qr_booking)) {
                    IcsInfoTileGrid(
                        tiles = listOf(
                            stringResource(R.string.field_container) to qr.payload.containerNo,
                            stringResource(R.string.field_depot) to qr.payload.depot,
                            stringResource(R.string.field_schedule) to "${qr.payload.scheduleDate} ${qr.payload.scheduleTime}",
                            stringResource(R.string.field_logicteck) to logicteck.label,
                        ),
                    )
                }
                logicteckMessage?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
                QrDownloadActions(
                    downloading = downloading,
                    onDownloadQr = onDownloadQr,
                    onDownloadPdf = onDownloadPdf,
                    onShareQr = onShareQr,
                    onSharePdf = onSharePdf,
                    showLogicteck = canBookLogicteck(qr),
                    logicteckBooking = logicteckBooking,
                    onBookLogicteck = onBookLogicteck,
                )
                IcsSecondaryButton(text = stringResource(R.string.action_view_qr_pass), onClick = onViewQrPass)
            }
            paymentStatus.equals("Paid", true) && qrLoading -> {
                Text(stringResource(R.string.return_qr_publishing), color = IcsColors.TextSecondary)
            }
            paymentStatus.equals("Paid", true) -> {
                Text(stringResource(R.string.return_qr_preparing), color = IcsColors.TextSecondary)
            }
            else -> {
                Text(stringResource(R.string.preforecast_qr_not_ready), color = IcsColors.TextSecondary)
            }
        }
    }
}
