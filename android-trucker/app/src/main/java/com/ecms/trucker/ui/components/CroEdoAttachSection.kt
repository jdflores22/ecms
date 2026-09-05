package com.ecms.trucker.ui.components

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
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
import com.ecms.trucker.data.model.CroEdoVerificationLineDto
import com.ecms.trucker.data.model.CroEdoVerificationResponseDto
import com.ecms.trucker.data.repository.TruckerRepository
import com.ecms.trucker.ui.theme.IcsColors
import com.ecms.trucker.ui.theme.icsHexAlpha
import com.ecms.trucker.util.CroEdoQrDecoder
import com.ecms.trucker.util.croFreeTimeExpiredMessage
import com.ecms.trucker.util.isCroFreeTimeExpired
import kotlinx.coroutines.launch

data class CroEdoAttachSuccess(
    val token: String,
    val fileUri: Uri?,
    val result: CroEdoVerificationResponseDto,
    val line: CroEdoVerificationLineDto,
)

private enum class CroEdoSource { None, Scan, Upload }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CroEdoAttachSection(
    repository: TruckerRepository,
    disabled: Boolean,
    onLinked: (CroEdoAttachSuccess) -> Unit,
    onCleared: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var fileName by remember { mutableStateOf("") }
    var pendingUri by remember { mutableStateOf<Uri?>(null) }
    var result by remember { mutableStateOf<CroEdoVerificationResponseDto?>(null) }
    var token by remember { mutableStateOf("") }
    var selectedLineNo by remember { mutableIntStateOf(0) }
    var lineMenuExpanded by remember { mutableStateOf(false) }
    var source by remember { mutableStateOf(CroEdoSource.None) }
    var scannerOpen by remember { mutableStateOf(false) }

    fun applyVerified(
        verifiedToken: String,
        verified: CroEdoVerificationResponseDto,
        uri: Uri?,
        lineNo: Int? = null,
        attachSource: CroEdoSource,
    ) {
        val lines = verified.lines.orEmpty()
        if (!verified.valid || lines.isEmpty()) {
            error = verified.message.ifBlank { "CRO/eDO could not be verified." }
            result = null
            token = ""
            source = CroEdoSource.None
            onCleared()
            return
        }

        result = verified
        token = verifiedToken
        source = attachSource
        val line = when {
            lineNo != null -> lines.find { it.lineNo == lineNo }
            lines.size == 1 -> lines.first()
            else -> null
        }

        if (line == null) {
            selectedLineNo = 0
            onCleared()
            return
        }

        selectedLineNo = line.lineNo
        onLinked(CroEdoAttachSuccess(verifiedToken, uri, verified, line))
    }

    fun verifyToken(rawToken: String, uri: Uri?, attachSource: CroEdoSource) {
        scope.launch {
            busy = true
            error = null
            runCatching { repository.verifyCroEdo(rawToken) }
                .onSuccess { verified -> applyVerified(rawToken, verified, uri, attachSource = attachSource) }
                .onFailure {
                    error = "Unable to reach the verification service. Please try again."
                    source = CroEdoSource.None
                    onCleared()
                }
            busy = false
        }
    }

    fun reset() {
        error = null
        fileName = ""
        pendingUri = null
        result = null
        token = ""
        selectedLineNo = 0
        source = CroEdoSource.None
        onCleared()
    }

    val filePicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            busy = true
            error = null
            pendingUri = uri
            fileName = uri.lastPathSegment.orEmpty().ifBlank { "CRO / eDO file" }
            val decoded = runCatching {
                CroEdoQrDecoder.extractTokenFromUri(context, uri)
                    ?: throw IllegalStateException(
                        context.getString(R.string.cro_edo_decode_failed),
                    )
            }
            if (decoded.isSuccess) {
                verifyToken(decoded.getOrThrow(), uri, CroEdoSource.Upload)
            } else {
                error = decoded.exceptionOrNull()?.message ?: context.getString(R.string.cro_edo_decode_failed)
                source = CroEdoSource.None
                onCleared()
                busy = false
            }
        }
    }

    if (scannerOpen) {
        CroEdoQrScannerDialog(
            onDismiss = { scannerOpen = false },
            onTokenScanned = { scannedToken ->
                scannerOpen = false
                fileName = ""
                pendingUri = null
                verifyToken(scannedToken, uri = null, attachSource = CroEdoSource.Scan)
            },
        )
    }

    IcsSectionCard(title = stringResource(R.string.cro_edo_attach_title)) {
        Column(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Surface(
                color = icsHexAlpha(IcsColors.Primary, 0.06f),
                shape = MaterialTheme.shapes.medium,
                border = BorderStroke(1.dp, icsHexAlpha(IcsColors.Primary, 0.12f)),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Default.QrCodeScanner, contentDescription = null, tint = IcsColors.Primary)
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(
                            stringResource(R.string.cro_edo_step_label),
                            style = MaterialTheme.typography.labelSmall,
                            color = IcsColors.Primary,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            stringResource(R.string.cro_edo_attach_hint),
                            style = MaterialTheme.typography.bodySmall,
                            color = IcsColors.TextSecondary,
                        )
                    }
                }
            }

            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Button(
                    onClick = { scannerOpen = true },
                    enabled = !disabled && !busy,
                    modifier = Modifier.weight(1f),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.QrCodeScanner, contentDescription = null, modifier = Modifier.size(18.dp))
                        Text(stringResource(R.string.cro_edo_scan_button))
                    }
                }
                OutlinedButton(
                    onClick = { filePicker.launch(arrayOf("image/*", "application/pdf")) },
                    enabled = !disabled && !busy,
                    modifier = Modifier.weight(1f),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.UploadFile, contentDescription = null, modifier = Modifier.size(18.dp))
                        Text(stringResource(R.string.cro_edo_upload_button))
                    }
                }
            }

            if (busy) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                    Text(
                        stringResource(R.string.cro_edo_verifying),
                        style = MaterialTheme.typography.bodySmall,
                        color = IcsColors.TextSecondary,
                    )
                }
            }

            if (result != null || fileName.isNotBlank() || source != CroEdoSource.None) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        when (source) {
                            CroEdoSource.Scan -> stringResource(R.string.cro_edo_source_scan)
                            CroEdoSource.Upload -> fileName.ifBlank { stringResource(R.string.cro_edo_source_upload) }
                            CroEdoSource.None -> fileName
                        },
                        style = MaterialTheme.typography.labelMedium,
                        color = IcsColors.TextSecondary,
                        modifier = Modifier.weight(1f),
                    )
                    TextButton(onClick = { reset() }, enabled = !disabled && !busy) {
                        Text(stringResource(R.string.action_clear))
                    }
                }
            }

            error?.let {
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }

            result?.takeIf { it.valid }?.let { verified ->
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = IcsColors.Success, modifier = Modifier.size(18.dp))
                    Text(
                        stringResource(
                            R.string.cro_edo_verified_message,
                            verified.referenceNo.orEmpty(),
                            verified.blNumber?.let { " · BL $it" }.orEmpty(),
                        ),
                        color = IcsColors.Success,
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }

            val lines = result?.lines.orEmpty()
            if (result?.valid == true && lines.size > 1) {
                val selectedLine = lines.find { it.lineNo == selectedLineNo }
                ExposedDropdownMenuBox(
                    expanded = lineMenuExpanded,
                    onExpandedChange = { lineMenuExpanded = it },
                ) {
                    OutlinedTextField(
                        value = selectedLine?.let {
                            "${it.containerNumber} · ${it.size} ${it.type}"
                        }.orEmpty(),
                        onValueChange = {},
                        readOnly = true,
                        label = { Text(stringResource(R.string.cro_edo_container_line)) },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = lineMenuExpanded) },
                        modifier = Modifier
                            .menuAnchor(androidx.compose.material3.MenuAnchorType.PrimaryNotEditable, true)
                            .fillMaxWidth(),
                    )
                    ExposedDropdownMenu(expanded = lineMenuExpanded, onDismissRequest = { lineMenuExpanded = false }) {
                        lines.forEach { line ->
                            DropdownMenuItem(
                                text = {
                                    Text("${line.containerNumber} · ${line.size} ${line.type} · free until ${line.demurrageValidUntil}")
                                },
                                onClick = {
                                    lineMenuExpanded = false
                                    applyVerified(token, result!!, pendingUri, line.lineNo, source)
                                },
                            )
                        }
                    }
                }
            }

            lines.find { it.lineNo == selectedLineNo }?.let { line ->
                Text(
                    stringResource(
                        R.string.cro_edo_free_time_summary,
                        line.demurrageValidUntil,
                        line.returnEmptyTo,
                    ),
                    style = MaterialTheme.typography.bodySmall,
                    color = IcsColors.TextSecondary,
                )
                if (isCroFreeTimeExpired(line.demurrageValidUntil)) {
                    Text(
                        croFreeTimeExpiredMessage(line.demurrageValidUntil),
                        color = IcsColors.Warning,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }
        }
    }
}
