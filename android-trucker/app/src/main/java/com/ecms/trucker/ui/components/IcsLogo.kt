package com.ecms.trucker.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.ecms.trucker.R
import com.ecms.trucker.ui.theme.IcsColors

@Composable
fun IcsLogo(
    modifier: Modifier = Modifier,
    markSize: Dp = 44.dp,
    showWordmark: Boolean = true,
    centered: Boolean = false,
    onDarkBackground: Boolean = false,
) {
    val titleColor = if (onDarkBackground) Color.White else IcsColors.Primary
    val subtitleColor = if (onDarkBackground) Color.White.copy(0.78f) else IcsColors.TextSecondary

    if (centered && showWordmark) {
        Column(
            modifier = modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Image(
                painter = painterResource(R.drawable.ics_logo_mark),
                contentDescription = stringResource(R.string.logo_content_description),
                modifier = Modifier.size(markSize),
                contentScale = ContentScale.Fit,
            )
            Spacer(Modifier.height(10.dp))
            Text(
                stringResource(R.string.logo_wordmark_title),
                style = MaterialTheme.typography.titleMedium,
                color = titleColor,
                fontWeight = FontWeight.Bold,
            )
            Text(
                stringResource(R.string.logo_wordmark_subtitle),
                style = MaterialTheme.typography.labelSmall,
                color = subtitleColor,
                textAlign = TextAlign.Center,
            )
        }
    } else {
        Row(modifier = modifier, verticalAlignment = Alignment.CenterVertically) {
            Image(
                painter = painterResource(R.drawable.ics_logo_mark),
                contentDescription = stringResource(R.string.logo_content_description),
                modifier = Modifier.size(markSize),
                contentScale = ContentScale.Fit,
            )
            if (showWordmark) {
                Spacer(Modifier.width(12.dp))
                Column {
                    Text(
                        stringResource(R.string.logo_wordmark_title),
                        style = MaterialTheme.typography.titleMedium,
                        color = titleColor,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        stringResource(R.string.logo_wordmark_subtitle),
                        style = MaterialTheme.typography.labelSmall,
                        color = subtitleColor,
                    )
                }
            }
        }
    }
}

@Composable
fun IcsLogoMark(
    modifier: Modifier = Modifier,
    size: Dp = 32.dp,
    tint: Color? = null,
) {
    Image(
        painter = painterResource(R.drawable.ics_logo_mark),
        contentDescription = null,
        modifier = modifier.size(size),
        contentScale = ContentScale.Fit,
        colorFilter = tint?.let { ColorFilter.tint(it) },
    )
}
