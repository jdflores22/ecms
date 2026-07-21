package com.ecms.trucker.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.text.KeyboardOptions
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
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
fun IcsSecondaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    icon: ImageVector? = null,
) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.height(48.dp),
        shape = RoundedCornerShape(10.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, IcsColors.Divider),
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = IcsColors.Surface,
            contentColor = IcsColors.Primary,
        ),
    ) {
        if (icon != null) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(6.dp))
        }
        Text(text, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun IcsOutlinedField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    password: Boolean = false,
    singleLine: Boolean = true,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        modifier = modifier.fillMaxWidth(),
        singleLine = singleLine,
        visualTransformation = if (password) PasswordVisualTransformation() else VisualTransformation.None,
        keyboardOptions = if (password) KeyboardOptions(keyboardType = KeyboardType.Password) else KeyboardOptions.Default,
        shape = RoundedCornerShape(10.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = IcsColors.Primary,
            unfocusedBorderColor = IcsColors.Divider,
            focusedLabelColor = IcsColors.Primary,
            cursorColor = IcsColors.Primary,
        ),
    )
}

@Composable
fun IcsOverviewPanel(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = IcsColors.SurfaceMuted,
        border = androidx.compose.foundation.BorderStroke(1.dp, IcsColors.Divider),
    ) {
        Column(
            Modifier.padding(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            content = content,
        )
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
    onClick: (() -> Unit)? = null,
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier),
        shape = RoundedCornerShape(12.dp),
        color = IcsColors.Surface,
        tonalElevation = if (highlighted) 2.dp else 1.dp,
        shadowElevation = if (highlighted) 2.dp else 0.dp,
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (highlighted) icsHexAlpha(IcsColors.Primary, 0.35f) else IcsColors.Divider,
        ),
    ) {
        Column(Modifier.padding(12.dp)) {
            Text(
                value,
                style = MaterialTheme.typography.headlineSmall,
                color = IcsColors.Primary,
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
            shape = RoundedCornerShape(16.dp),
            color = IcsColors.Surface,
            shadowElevation = 1.dp,
            border = androidx.compose.foundation.BorderStroke(1.dp, IcsColors.Divider),
        ) {
            Column(Modifier.padding(vertical = 6.dp, horizontal = 4.dp)) {
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
fun IcsPaymentListRow(
    title: String,
    subtitle: String,
    amount: String,
    status: String,
    actionLabel: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    emphasized: Boolean = false,
) {
    ListItem(
        headlineContent = {
            Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
        },
        supportingContent = {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = IcsColors.TextSecondary)
                Text(
                    amount,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    color = IcsColors.Primary,
                )
                Text(
                    actionLabel,
                    style = MaterialTheme.typography.labelMedium,
                    color = if (emphasized) IcsColors.Primary else IcsColors.TextSecondary,
                )
            }
        },
        trailingContent = {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                StatusChip(status)
                Icon(
                    Icons.AutoMirrored.Filled.ArrowForward,
                    contentDescription = null,
                    tint = if (emphasized) IcsColors.Primary else IcsColors.TextSecondary,
                )
            }
        },
        modifier = modifier.clickable(onClick = onClick),
        colors = ListItemDefaults.colors(containerColor = Color.Transparent),
    )
}

@Composable
fun IcsPaymentDueCard(
    title: String,
    subtitle: String,
    hint: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    ListItem(
        headlineContent = {
            Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
        },
        supportingContent = {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = IcsColors.TextSecondary)
                Text(hint, style = MaterialTheme.typography.labelMedium, color = IcsColors.Primary)
            }
        },
        trailingContent = {
            Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, tint = IcsColors.Primary)
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
            .padding(horizontal = 16.dp, vertical = 5.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        color = IcsColors.Surface,
        shadowElevation = 1.dp,
        border = androidx.compose.foundation.BorderStroke(1.dp, IcsColors.Divider),
    ) {
        ListItem(
            headlineContent = {
                Text(title, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            },
            supportingContent = {
                Text(
                    subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = IcsColors.TextSecondary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            },
            trailingContent = {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    StatusChip(status)
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowForward,
                        contentDescription = null,
                        tint = IcsColors.TextSecondary,
                        modifier = Modifier.size(16.dp),
                    )
                }
            },
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
    IcsStatDef("pendingRequests", R.string.dashboard_stat_pending_preforecast, R.string.dashboard_stat_pending_preforecast_desc, IcsColors.Primary),
    IcsStatDef("draftWithdrawals", R.string.dashboard_stat_draft_withdrawals, R.string.dashboard_stat_draft_withdrawals_desc, IcsColors.Primary),
    IcsStatDef("issuedWithdrawalsAwaitingUpload", R.string.dashboard_stat_issued_upload, R.string.dashboard_stat_issued_upload_desc, IcsColors.Primary),
    IcsStatDef("submittedWithdrawals", R.string.dashboard_stat_awaiting_review, R.string.dashboard_stat_awaiting_review_desc, IcsColors.Primary),
    IcsStatDef("upcomingReturns", R.string.dashboard_stat_upcoming_returns, R.string.dashboard_stat_upcoming_returns_desc, IcsColors.Primary),
    IcsStatDef("pendingPayments", R.string.dashboard_stat_pending_payments, R.string.dashboard_stat_pending_payments_desc, IcsColors.Primary),
    IcsStatDef("confirmedReturns", R.string.dashboard_stat_confirmed_returns, R.string.dashboard_stat_confirmed_returns_desc, IcsColors.Primary),
    IcsStatDef("approvedWithdrawals", R.string.dashboard_stat_approved_withdrawals, R.string.dashboard_stat_approved_withdrawals_desc, IcsColors.Primary),
)
