package com.ecms.trucker.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.ecms.trucker.R

@Composable
fun QrDownloadActions(
    downloading: Boolean,
    onDownloadQr: () -> Unit,
    onDownloadPdf: () -> Unit,
    onShareQr: () -> Unit,
    onSharePdf: () -> Unit,
    modifier: Modifier = Modifier,
    showLogicteck: Boolean = false,
    logicteckBooking: Boolean = false,
    onBookLogicteck: (() -> Unit)? = null,
) {
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (downloading) {
            CircularProgressIndicator(modifier = Modifier.padding(8.dp))
        } else {
            OutlinedButton(onClick = onDownloadQr, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.qr_action_download_image))
            }
            OutlinedButton(onClick = onDownloadPdf, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.qr_action_download_pdf))
            }
            OutlinedButton(onClick = onShareQr, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.qr_action_share_image))
            }
            OutlinedButton(onClick = onSharePdf, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.qr_action_share_pdf))
            }
        }
        if (showLogicteck && onBookLogicteck != null) {
            Button(
                onClick = onBookLogicteck,
                enabled = !logicteckBooking,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(R.string.action_book_logicteck))
            }
        }
    }
}
