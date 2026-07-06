package com.ecms.trucker.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ecms.trucker.R
import com.ecms.trucker.data.local.TokenStore
import com.ecms.trucker.data.model.WithdrawalDocumentDto
import com.ecms.trucker.ui.theme.IcsColors
import com.ecms.trucker.ui.util.DocumentOpener
import com.ecms.trucker.ui.util.formatRelativeTime
import kotlinx.coroutines.launch

private data class ReleaseCertificateRow(
    val id: Int,
    val kind: String,
    val containerLabel: String,
    val label: String,
    val filePath: String,
    val createdAt: String,
)

private fun parseCyContainerNo(fileName: String): String {
    val match = Regex("^CY-RELEASE-(.+)-ATW-.+\\.pdf$", RegexOption.IGNORE_CASE).find(fileName)
    return match?.groupValues?.getOrNull(1)
        ?: fileName.removePrefix("CY-RELEASE-").removeSuffix(".pdf")
}

private fun buildReleaseRows(documents: List<WithdrawalDocumentDto>): List<ReleaseCertificateRow> {
    val cyRows = documents
        .filter { it.documentType.equals("CyContainerReleaseCertificate", true) }
        .sortedBy { parseCyContainerNo(it.fileName) }
        .map { doc ->
            ReleaseCertificateRow(
                id = doc.id,
                kind = "cy",
                containerLabel = parseCyContainerNo(doc.fileName),
                label = "CY release",
                filePath = doc.filePath,
                createdAt = doc.createdAt,
            )
        }

    val atwRelease = documents.firstOrNull { it.documentType.equals("AtwReleaseCertificate", true) }
    val atwRow = atwRelease?.let { doc ->
        ReleaseCertificateRow(
            id = doc.id,
            kind = "atw",
            containerLabel = "All containers",
            label = "ATW released",
            filePath = doc.filePath,
            createdAt = doc.createdAt,
        )
    }

    return if (atwRow != null) cyRows + atwRow else cyRows
}

@Composable
fun WithdrawalReleaseCertificates(
    documents: List<WithdrawalDocumentDto>,
    tokenStore: TokenStore,
    modifier: Modifier = Modifier,
) {
    val rows = remember(documents) { buildReleaseRows(documents) }
    if (rows.isEmpty()) return

    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val accessToken by tokenStore.authState.collectAsState(initial = com.ecms.trucker.data.local.AuthState())
    var opening by remember { mutableStateOf(false) }
    var openError by remember { mutableStateOf<String?>(null) }

    val cyCount = rows.count { it.kind == "cy" }
    val hasAtwRelease = rows.any { it.kind == "atw" }
    val summary = when {
        hasAtwRelease && cyCount > 0 -> stringResource(R.string.release_cert_summary_both, cyCount)
        hasAtwRelease -> stringResource(R.string.release_cert_summary_atw)
        else -> stringResource(R.string.release_cert_summary_cy, cyCount)
    }

    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            stringResource(R.string.release_certificates_title),
            style = MaterialTheme.typography.titleSmall,
            color = IcsColors.Primary,
            fontWeight = FontWeight.SemiBold,
        )
        Text(summary, style = MaterialTheme.typography.bodySmall, color = IcsColors.TextSecondary)
        Spacer(Modifier.height(8.dp))

        rows.forEach { row ->
            Surface(
                shape = MaterialTheme.shapes.medium,
                border = ButtonDefaults.outlinedButtonBorder(enabled = true),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            AssistChip(
                                onClick = {},
                                label = {
                                    Text(
                                        if (row.kind == "atw") {
                                            stringResource(R.string.release_cert_chip_atw)
                                        } else {
                                            stringResource(R.string.release_cert_chip_cy)
                                        },
                                    )
                                },
                                enabled = false,
                            )
                        }
                        Text(
                            row.containerLabel,
                            fontWeight = FontWeight.SemiBold,
                            fontFamily = if (row.kind == "cy") FontFamily.Monospace else FontFamily.Default,
                        )
                        Text(
                            formatRelativeTime(row.createdAt),
                            style = MaterialTheme.typography.labelSmall,
                            color = IcsColors.TextSecondary,
                        )
                    }
                    IconButton(
                        onClick = {
                            if (opening) return@IconButton
                            scope.launch {
                                opening = true
                                openError = null
                                runCatching {
                                    DocumentOpener.open(
                                        context = context,
                                        filePath = row.filePath,
                                        accessToken = accessToken.accessToken,
                                        fileName = row.filePath.substringAfterLast('/'),
                                    )
                                }.onFailure { openError = it.message }
                                opening = false
                            }
                        },
                        enabled = !opening,
                    ) {
                        Icon(Icons.AutoMirrored.Filled.OpenInNew, stringResource(R.string.release_cert_view_pdf))
                    }
                }
            }
        }

        openError?.let {
            Text(it, color = IcsColors.Error, style = MaterialTheme.typography.bodySmall)
        }
    }
}
