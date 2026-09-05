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
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ecms.trucker.R
import com.ecms.trucker.ui.theme.IcsColors
import com.ecms.trucker.ui.theme.icsHexAlpha

@Composable
fun CroEdoLegacyUploadSection(
    fileName: String,
    disabled: Boolean,
    onFileSelected: (Uri, String) -> Unit,
    onCleared: () -> Unit,
) {
    val filePicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        val name = uri.lastPathSegment.orEmpty().ifBlank { "CRO / eDO file" }
        onFileSelected(uri, name)
    }

    IcsSectionCard(title = stringResource(R.string.cro_edo_legacy_upload_title)) {
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
                    Icon(Icons.Default.Description, contentDescription = null, tint = IcsColors.Primary)
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(
                            stringResource(R.string.cro_edo_legacy_step_label),
                            style = MaterialTheme.typography.labelSmall,
                            color = IcsColors.Primary,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            stringResource(R.string.cro_edo_legacy_upload_hint),
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
                OutlinedButton(
                    onClick = { filePicker.launch(arrayOf("image/*", "application/pdf")) },
                    enabled = !disabled,
                    modifier = Modifier.weight(1f),
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Icon(Icons.Default.UploadFile, contentDescription = null, modifier = Modifier.size(18.dp))
                        Text(
                            if (fileName.isBlank()) {
                                stringResource(R.string.cro_edo_upload_button)
                            } else {
                                fileName
                            },
                        )
                    }
                }
                if (fileName.isNotBlank()) {
                    TextButton(onClick = onCleared, enabled = !disabled) {
                        Text(stringResource(R.string.action_clear))
                    }
                }
            }
        }
    }
}
