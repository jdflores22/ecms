package com.ecms.trucker.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ecms.trucker.ui.theme.IcsColors
import com.ecms.trucker.ui.theme.icsHexAlpha

enum class IcsGuidanceKind { Info, Success, Warning, Error }

@Composable
fun IcsGuidanceBanner(
    message: String,
    kind: IcsGuidanceKind = IcsGuidanceKind.Info,
    modifier: Modifier = Modifier,
    title: String? = null,
) {
    val (bg, fg, icon) = when (kind) {
        IcsGuidanceKind.Info -> Triple(icsHexAlpha(IcsColors.Primary, 0.08f), IcsColors.Primary, Icons.Default.Info)
        IcsGuidanceKind.Success -> Triple(icsHexAlpha(IcsColors.Success, 0.12f), IcsColors.Success, Icons.Default.CheckCircle)
        IcsGuidanceKind.Warning -> Triple(icsHexAlpha(IcsColors.Warning, 0.14f), IcsColors.Warning, Icons.Default.WarningAmber)
        IcsGuidanceKind.Error -> Triple(icsHexAlpha(IcsColors.Error, 0.12f), IcsColors.Error, Icons.Default.WarningAmber)
    }
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        color = bg,
        border = BorderStroke(1.dp, icsHexAlpha(fg, 0.25f)),
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.Top,
        ) {
            Icon(icon, contentDescription = null, tint = fg, modifier = Modifier.size(20.dp))
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                title?.let {
                    Text(it, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = fg)
                }
                Text(message, style = MaterialTheme.typography.bodySmall, color = fg)
            }
        }
    }
}

@Composable
fun IcsScreenTip(
    message: String,
    modifier: Modifier = Modifier,
) {
    IcsGuidanceBanner(
        message = message,
        kind = IcsGuidanceKind.Info,
        modifier = modifier.padding(horizontal = 16.dp, vertical = 6.dp),
    )
}

@Composable
fun IcsStepLabel(
    step: String,
    title: String,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Surface(
            shape = MaterialTheme.shapes.small,
            color = icsHexAlpha(IcsColors.Primary, 0.12f),
        ) {
            Text(
                step,
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                style = MaterialTheme.typography.labelSmall,
                color = IcsColors.Primary,
                fontWeight = FontWeight.Bold,
            )
        }
        Text(
            title,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
            color = IcsColors.OnSurface,
        )
    }
}
