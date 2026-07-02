package com.ecms.trucker.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.res.stringResource
import androidx.annotation.StringRes
import com.ecms.trucker.R
import com.ecms.trucker.ui.theme.IcsColors
import com.ecms.trucker.ui.theme.icsHexAlpha

@Composable
fun IcsAuthBackground(content: @Composable BoxScope.() -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.linearGradient(
                    colors = listOf(
                        IcsColors.Primary,
                        IcsColors.PrimaryDark,
                        IcsColors.Accent.copy(alpha = 0.85f),
                    ),
                ),
            ),
    ) {
        Box(
            Modifier
                .size(200.dp)
                .offset(x = (-50).dp, y = (-50).dp)
                .clip(CircleShape)
                .background(Color.White.copy(alpha = 0.06f)),
        )
        content()
    }
}

@Composable
fun IcsAuthScreenLayout(
    onBack: (() -> Unit)? = null,
    content: @Composable () -> Unit,
) {
    IcsAuthBackground {
        if (onBack != null) {
            IconButton(
                onClick = onBack,
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .statusBarsPadding()
                    .padding(4.dp),
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = stringResource(R.string.content_desc_back),
                    tint = Color.White,
                )
            }
        }
        Box(
            modifier = Modifier
                .fillMaxSize()
                .imePadding()
                .padding(horizontal = 24.dp, vertical = 16.dp),
            contentAlignment = Alignment.Center,
        ) {
            content()
        }
    }
}

@Composable
fun IcsAuthCard(
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    val scrollState = rememberScrollState()
    Card(
        modifier = modifier
            .fillMaxWidth()
            .widthIn(max = 400.dp)
            .heightIn(max = 640.dp)
            .verticalScroll(scrollState),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = IcsColors.Surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
    ) {
        Column(
            Modifier.padding(horizontal = 24.dp, vertical = 28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            IcsLogo(
                modifier = Modifier.padding(bottom = 20.dp),
                markSize = 48.dp,
                showWordmark = true,
                centered = true,
            )
            Text(
                title,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
            )
            Text(
                subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = IcsColors.TextSecondary,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 6.dp, bottom = 24.dp),
            )
            Column(Modifier.fillMaxWidth()) {
                content()
            }
        }
    }
}

@Composable
fun IcsPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
) {
    Button(
        onClick = onClick,
        enabled = enabled && !loading,
        modifier = modifier
            .fillMaxWidth()
            .height(48.dp),
        shape = RoundedCornerShape(10.dp),
        colors = ButtonDefaults.buttonColors(containerColor = IcsColors.Primary),
        elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp),
    ) {
        if (loading) {
            CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White, strokeWidth = 2.dp)
        } else {
            Text(text, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun IcsStatCard(
    label: String,
    value: String,
    description: String,
    color: Color,
    highlighted: Boolean,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = IcsColors.Surface,
        tonalElevation = if (highlighted) 2.dp else 1.dp,
        shadowElevation = if (highlighted) 2.dp else 0.dp,
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (highlighted) icsHexAlpha(color, 0.35f) else IcsColors.Divider,
        ),
    ) {
        Column(Modifier.padding(12.dp)) {
            Text(
                value,
                style = MaterialTheme.typography.headlineSmall,
                color = if (highlighted) color else IcsColors.Primary,
                fontWeight = FontWeight.Bold,
            )
            Text(
                label,
                style = MaterialTheme.typography.labelMedium,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 2.dp),
            )
            if (highlighted) {
                Text(
                    description,
                    style = MaterialTheme.typography.bodySmall,
                    color = IcsColors.TextSecondary,
                    modifier = Modifier.padding(top = 2.dp),
                )
            }
        }
    }
}

@Composable
fun IcsSectionCard(
    title: String,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(modifier = modifier.fillMaxWidth()) {
        IcsScreenSectionTitle(title)
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            color = IcsColors.Surface,
            tonalElevation = 1.dp,
            border = androidx.compose.foundation.BorderStroke(1.dp, IcsColors.Divider),
        ) {
            Column(Modifier.padding(4.dp)) {
                content()
            }
        }
    }
}

@Composable
fun IcsQuickActionRow(
    title: String,
    subtitle: String,
    onClick: () -> Unit,
) {
    ListItem(
        headlineContent = { Text(title, style = MaterialTheme.typography.bodyLarge) },
        supportingContent = {
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = IcsColors.TextSecondary)
        },
        trailingContent = {
            Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, tint = IcsColors.TextSecondary)
        },
        modifier = Modifier.clickable(onClick = onClick),
        colors = ListItemDefaults.colors(containerColor = Color.Transparent),
    )
}

@Composable
fun IcsListItemCard(
    title: String,
    subtitle: String,
    status: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        color = IcsColors.Surface,
        tonalElevation = 1.dp,
    ) {
        ListItem(
            headlineContent = {
                Text(title, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
            },
            supportingContent = {
                Text(subtitle, style = MaterialTheme.typography.bodySmall, maxLines = 2, overflow = TextOverflow.Ellipsis)
            },
            trailingContent = { StatusChip(status) },
            colors = ListItemDefaults.colors(containerColor = Color.Transparent),
        )
    }
}

data class IcsStatDef(
    val key: String,
    @StringRes val labelRes: Int,
    @StringRes val descriptionRes: Int,
    val color: Color,
    val highlightWhenPositive: Boolean = true,
)

val TruckerDashboardStats = listOf(
    IcsStatDef("pendingRequests", R.string.dashboard_stat_pending_preforecast, R.string.dashboard_stat_pending_preforecast_desc, IcsColors.Warning),
    IcsStatDef("draftWithdrawals", R.string.dashboard_stat_draft_withdrawals, R.string.dashboard_stat_draft_withdrawals_desc, IcsColors.Warning),
    IcsStatDef("issuedWithdrawalsAwaitingUpload", R.string.dashboard_stat_issued_upload, R.string.dashboard_stat_issued_upload_desc, IcsColors.Purple),
    IcsStatDef("submittedWithdrawals", R.string.dashboard_stat_awaiting_review, R.string.dashboard_stat_awaiting_review_desc, IcsColors.BlueStat),
    IcsStatDef("upcomingReturns", R.string.dashboard_stat_upcoming_returns, R.string.dashboard_stat_upcoming_returns_desc, IcsColors.Purple),
    IcsStatDef("pendingPayments", R.string.dashboard_stat_pending_payments, R.string.dashboard_stat_pending_payments_desc, IcsColors.Warning),
    IcsStatDef("confirmedReturns", R.string.dashboard_stat_confirmed_returns, R.string.dashboard_stat_confirmed_returns_desc, IcsColors.Success),
    IcsStatDef("approvedWithdrawals", R.string.dashboard_stat_approved_withdrawals, R.string.dashboard_stat_approved_withdrawals_desc, IcsColors.Success),
)
