package com.ecms.trucker.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.ecms.trucker.R
import com.ecms.trucker.ui.theme.IcsColors
import com.ecms.trucker.ui.theme.icsHexAlpha
import com.ecms.trucker.ui.util.formatScheduleStatus
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterialApi::class, ExperimentalMaterial3Api::class)
@Composable
fun IcsScreenScaffold(
    title: String,
    subtitle: String? = null,
    onBack: (() -> Unit)? = null,
    branded: Boolean = false,
    onNotificationClick: (() -> Unit)? = null,
    refreshing: Boolean = false,
    onRefresh: (() -> Unit)? = null,
    showRefreshFeedback: Boolean = true,
    refreshFeedbackMessage: String? = null,
    snackbarHost: @Composable (SnackbarHostState) -> Unit = { hostState ->
        SnackbarHost(hostState = hostState)
    },
    actions: @Composable RowScope.() -> Unit = {},
    floatingActionButton: @Composable () -> Unit = {},
    content: @Composable (PaddingValues) -> Unit,
) {
    val scaffoldSnackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    var pullRefreshTriggeredByUser by remember { mutableStateOf(false) }
    val resolvedRefreshFeedbackMessage =
        refreshFeedbackMessage ?: stringResource(R.string.refresh_feedback_page_updated)

    LaunchedEffect(refreshing) {
        if (!refreshing) pullRefreshTriggeredByUser = false
    }

    Scaffold(
        containerColor = IcsColors.Background,
        topBar = { EcmsTopBar(title, subtitle, onBack, branded, onNotificationClick, actions) },
        snackbarHost = { snackbarHost(scaffoldSnackbarHostState) },
        floatingActionButton = floatingActionButton,
        content = { padding ->
            if (onRefresh != null) {
                val pullRefreshState = rememberPullRefreshState(
                    refreshing = refreshing,
                    onRefresh = {
                        pullRefreshTriggeredByUser = true
                        onRefresh.invoke()
                        if (showRefreshFeedback && resolvedRefreshFeedbackMessage.isNotBlank()) {
                            scope.launch {
                                scaffoldSnackbarHostState.showSnackbar(resolvedRefreshFeedbackMessage)
                            }
                        }
                    }
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .pullRefresh(pullRefreshState),
                ) {
                    content(padding)
                    if (pullRefreshState.progress > 0f && pullRefreshTriggeredByUser) {
                        PullRefreshIndicator(
                            refreshing = false,
                            state = pullRefreshState,
                            modifier = Modifier
                                .align(Alignment.TopCenter)
                                .padding(top = padding.calculateTopPadding()),
                        )
                    }
                }
            } else {
                content(padding)
            }
        },
    )
}

@Composable
fun LoadingBox(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = IcsColors.Primary)
    }
}

@Composable
fun ErrorMessage(
    message: String,
    onRetry: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxWidth().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(message, color = IcsColors.Error, textAlign = TextAlign.Center)
        if (onRetry != null) {
            Button(
                onClick = onRetry,
                colors = ButtonDefaults.buttonColors(containerColor = IcsColors.Primary),
            ) {
                Text(stringResource(R.string.action_retry))
            }
        }
    }
}

@Composable
fun StatusChip(status: String) {
    val label = formatScheduleStatus(status)
    val (bg, fg) = when (status.lowercase()) {
        "draft", "pending", "scheduled" -> icsHexAlpha(IcsColors.Primary, 0.12f) to IcsColors.Primary
        "waitingschedule" -> icsHexAlpha(IcsColors.Warning, 0.14f) to IcsColors.Warning
        "approved", "confirmed", "paid", "completed", "released" -> icsHexAlpha(IcsColors.Success, 0.12f) to IcsColors.Success
        "rejected", "cancelled", "noshow" -> icsHexAlpha(IcsColors.Error, 0.12f) to IcsColors.Error
        "submitted", "forverification", "issued" -> icsHexAlpha(IcsColors.Warning, 0.14f) to IcsColors.Warning
        else -> IcsColors.Divider to IcsColors.TextSecondary
    }
    Surface(color = bg, shape = MaterialTheme.shapes.small) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelMedium,
            color = fg,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
fun EmptyState(message: String, modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(
            message,
            style = MaterialTheme.typography.bodyLarge,
            color = IcsColors.TextSecondary,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(24.dp),
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EcmsTopBar(
    title: String,
    subtitle: String? = null,
    onBack: (() -> Unit)? = null,
    branded: Boolean = false,
    onNotificationClick: (() -> Unit)? = null,
    actions: @Composable RowScope.() -> Unit = {},
) {
    val isPrimary = branded && onBack == null
    val barColors = if (isPrimary) {
        TopAppBarDefaults.topAppBarColors(
            containerColor = IcsColors.Primary,
            titleContentColor = Color.White,
            navigationIconContentColor = Color.White,
            actionIconContentColor = Color.White,
        )
    } else {
        TopAppBarDefaults.topAppBarColors(
            containerColor = IcsColors.Surface,
            titleContentColor = IcsColors.Primary,
            navigationIconContentColor = IcsColors.Primary,
            actionIconContentColor = IcsColors.Primary,
        )
    }

    Column {
        TopAppBar(
            title = {
                Column(Modifier.fillMaxWidth()) {
                    if (isPrimary) {
                        IcsHeaderBrand(onDarkBackground = true, logoHeight = 26.dp)
                        if (!subtitle.isNullOrBlank()) {
                            Spacer(Modifier.height(4.dp))
                            Text(
                                subtitle,
                                style = MaterialTheme.typography.titleSmall,
                                color = Color.White,
                                fontWeight = FontWeight.SemiBold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        } else if (title.isNotBlank()) {
                            Spacer(Modifier.height(4.dp))
                            Text(
                                title,
                                style = MaterialTheme.typography.titleSmall,
                                color = Color.White,
                                fontWeight = FontWeight.SemiBold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                    } else {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.padding(end = 8.dp)) {
                                Text(
                                    title,
                                    fontWeight = FontWeight.SemiBold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                                if (!subtitle.isNullOrBlank()) {
                                    Text(
                                        subtitle,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = IcsColors.TextSecondary,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                }
                            }
                        }
                    }
                }
            },
            navigationIcon = {
                when {
                    onBack != null -> {
                        IconButton(onClick = onBack) {
                            Icon(
                                Icons.AutoMirrored.Filled.ArrowBack,
                                stringResource(R.string.content_desc_back),
                            )
                        }
                    }
                    isPrimary -> Spacer(Modifier.width(12.dp))
                }
            },
            actions = {
                if (onNotificationClick != null) {
                    IconButton(onClick = onNotificationClick) {
                        Icon(
                            Icons.Outlined.Notifications,
                            contentDescription = stringResource(R.string.content_desc_notifications),
                        )
                    }
                }
                actions()
            },
            colors = barColors,
        )
        if (!isPrimary) {
            HorizontalDivider(color = IcsColors.Divider, thickness = 1.dp)
        }
    }
}

@Composable
fun IcsFab(onClick: () -> Unit, content: @Composable () -> Unit) {
    FloatingActionButton(
        onClick = onClick,
        containerColor = IcsColors.Primary,
        contentColor = Color.White,
        content = content,
    )
}

@Composable
fun IcsScreenSectionTitle(title: String, modifier: Modifier = Modifier) {
    Text(
        title,
        style = MaterialTheme.typography.titleSmall,
        color = IcsColors.Primary,
        fontWeight = FontWeight.SemiBold,
        modifier = modifier.padding(vertical = 4.dp),
    )
}
