package com.ecms.trucker.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.VerticalDivider
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.ecms.trucker.R
import com.ecms.trucker.ui.theme.IcsColors

/** Branded header row: ICS logo image + company name (matches ICS app header). */
@Composable
fun IcsHeaderBrand(
    modifier: Modifier = Modifier,
    logoHeight: Dp = 28.dp,
    onDarkBackground: Boolean = false,
) {
    val dividerColor = if (onDarkBackground) Color.White.copy(0.35f) else IcsColors.Divider
    val subtitleColor = if (onDarkBackground) Color.White.copy(0.92f) else IcsColors.Primary

    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Image(
            painter = painterResource(R.drawable.ics_logo),
            contentDescription = stringResource(R.string.logo_content_description),
            modifier = Modifier.height(logoHeight),
            contentScale = ContentScale.Fit,
        )
        Spacer(Modifier.width(10.dp))
        VerticalDivider(
            modifier = Modifier.height(logoHeight * 0.85f),
            thickness = 1.dp,
            color = dividerColor,
        )
        Spacer(Modifier.width(10.dp))
        Text(
            stringResource(R.string.logo_wordmark_subtitle),
            style = MaterialTheme.typography.labelMedium,
            color = subtitleColor,
            fontWeight = FontWeight.Medium,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f, fill = false),
        )
    }
}

@Composable
fun IcsLogo(
    modifier: Modifier = Modifier,
    markSize: Dp = 44.dp,
    showWordmark: Boolean = true,
    centered: Boolean = false,
    onDarkBackground: Boolean = false,
) {
    val subtitleColor = if (onDarkBackground) Color.White.copy(0.78f) else IcsColors.TextSecondary

    if (centered && showWordmark) {
        Column(
            modifier = modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Image(
                painter = painterResource(R.drawable.ics_logo),
                contentDescription = stringResource(R.string.logo_content_description),
                modifier = Modifier.height(markSize * 1.4f),
                contentScale = ContentScale.Fit,
            )
            Spacer(Modifier.height(12.dp))
            Text(
                stringResource(R.string.logo_wordmark_subtitle),
                style = MaterialTheme.typography.titleSmall,
                color = subtitleColor,
                textAlign = TextAlign.Center,
                fontWeight = FontWeight.Medium,
            )
        }
    } else if (showWordmark) {
        IcsHeaderBrand(
            modifier = modifier,
            logoHeight = markSize * 0.65f,
            onDarkBackground = onDarkBackground,
        )
    } else {
        Image(
            painter = painterResource(R.drawable.ics_logo),
            contentDescription = stringResource(R.string.logo_content_description),
            modifier = modifier.height(markSize),
            contentScale = ContentScale.Fit,
        )
    }
}

@Composable
fun IcsLogoMark(
    modifier: Modifier = Modifier,
    size: Dp = 32.dp,
    tint: Color? = null,
) {
    Image(
        painter = painterResource(R.drawable.ics_logo),
        contentDescription = null,
        modifier = modifier.height(size),
        contentScale = ContentScale.Fit,
        colorFilter = tint?.let { ColorFilter.tint(it) },
    )
}
