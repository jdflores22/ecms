package com.ecms.trucker.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Assignment
import androidx.compose.material.icons.automirrored.filled.NoteAdd
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.PostAdd
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ecms.trucker.R
import com.ecms.trucker.data.local.AuthState
import com.ecms.trucker.data.model.TruckerDashboardDto
import com.ecms.trucker.data.model.TruckerNewsFeedItemDto
import com.ecms.trucker.data.repository.TruckerRepository
import com.ecms.trucker.EcmsTruckerApp
import com.ecms.trucker.ui.components.*
import com.ecms.trucker.ui.navigation.Routes
import com.ecms.trucker.ui.theme.IcsColors
import com.ecms.trucker.ui.theme.icsHexAlpha
import com.ecms.trucker.ui.util.rememberScreenLoadState
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private data class DashboardCacheEntry(
    val data: TruckerDashboardDto,
    val updatedAtMs: Long,
)

private const val DASHBOARD_CACHE_TTL_MS = 60_000L
private var DashboardCache: DashboardCacheEntry? = null

private data class AttentionItem(
    val title: String,
    val subtitle: String,
    val count: Int,
    val icon: ImageVector,
    val tint: androidx.compose.ui.graphics.Color,
    val onClick: () -> Unit,
)

private data class HomeMetric(
    val label: String,
    val value: Int,
    val icon: ImageVector,
    val onClick: () -> Unit,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    repository: TruckerRepository,
    userName: String,
    onOpenNotifications: () -> Unit,
    notificationUnreadCount: Int = 0,
    onNavigate: (String) -> Unit,
) {
    val cachedDashboard = DashboardCache
        ?.takeIf { System.currentTimeMillis() - it.updatedAtMs <= DASHBOARD_CACHE_TTL_MS }
        ?.data
    val context = LocalContext.current
    val app = context.applicationContext as EcmsTruckerApp
    val authState by app.container.tokenStore.authState.collectAsState(initial = AuthState())
    val loadState = rememberScreenLoadState(initiallyLoading = cachedDashboard == null)
    var dashboard by remember { mutableStateOf(cachedDashboard) }
    var newsFeed by remember { mutableStateOf<List<TruckerNewsFeedItemDto>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun load(force: Boolean = false) {
        scope.launch {
            loadState.begin(dashboard != null)
            error = null
            val cached = if (!force) {
                DashboardCache?.takeIf { System.currentTimeMillis() - it.updatedAtMs <= DASHBOARD_CACHE_TTL_MS }
            } else {
                null
            }
            if (cached != null) {
                dashboard = cached.data
            } else {
                runCatching { repository.getDashboard() }
                    .onSuccess {
                        dashboard = it
                        DashboardCache = DashboardCacheEntry(
                            data = it,
                            updatedAtMs = System.currentTimeMillis(),
                        )
                    }
                    .onFailure { error = it.message }
            }
            runCatching { newsFeed = repository.getNewsFeed() }
            loadState.end()
        }
    }

    LaunchedEffect(Unit) { load(force = cachedDashboard == null) }

    // Keep news/feed fresh even while user stays on Home.
    LaunchedEffect(Unit) {
        while (true) {
            delay(30_000)
            runCatching { newsFeed = repository.getNewsFeed() }
        }
    }

    IcsScreenScaffold(
        title = "",
        subtitle = stringResource(R.string.home_welcome, userName),
        branded = true,
        onNotificationClick = onOpenNotifications,
        notificationUnreadCount = notificationUnreadCount,
        refreshing = loadState.refreshing,
        onRefresh = { load(force = true) },
    ) { padding ->
        when {
            loadState.loading -> LoadingBox(Modifier.padding(padding))
            error != null -> ErrorMessage(error!!, onRetry = { load() }, modifier = Modifier.padding(padding))
            dashboard != null -> {
                val d = dashboard!!
                val attentionItems = buildAttentionItems(d, onNavigate)
                val metrics = buildHomeMetrics(d, onNavigate)

                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(20.dp),
                    contentPadding = PaddingValues(vertical = 16.dp),
                ) {
                    if (newsFeed.isNotEmpty()) {
                        item {
                            HomeNewsCarousel(
                                items = newsFeed,
                                accessToken = authState.accessToken,
                                onItemClick = { onNavigate(Routes.newsDetail(it)) },
                            )
                        }
                    }

                    item {
                        HomeWelcomeCard(
                            userName = userName,
                            actionCount = attentionItems.sumOf { it.count },
                        )
                    }

                    if (attentionItems.isNotEmpty()) {
                        item {
                            HomeSectionTitle(stringResource(R.string.home_needs_attention))
                            ElevatedCard(
                                modifier = Modifier.fillMaxWidth(),
                                shape = MaterialTheme.shapes.large,
                                colors = CardDefaults.elevatedCardColors(
                                    containerColor = MaterialTheme.colorScheme.surface,
                                ),
                            ) {
                                Column {
                                    attentionItems.forEachIndexed { index, item ->
                                        if (index > 0) {
                                            HorizontalDivider(
                                                modifier = Modifier.padding(horizontal = 16.dp),
                                                color = MaterialTheme.colorScheme.outlineVariant,
                                            )
                                        }
                                        HomeAttentionRow(item)
                                    }
                                }
                            }
                        }
                    }

                    item {
                        HomeSectionTitle(stringResource(R.string.home_start_here))
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            HomePrimaryActionCard(
                                label = stringResource(R.string.home_new_withdrawal),
                                description = stringResource(R.string.home_create_atw_request),
                                icon = Icons.AutoMirrored.Filled.NoteAdd,
                                modifier = Modifier.weight(1f),
                                onClick = { onNavigate(Routes.WITHDRAWAL_NEW) },
                            )
                            HomePrimaryActionCard(
                                label = stringResource(R.string.home_preforecast),
                                description = stringResource(R.string.home_submit_container_return_request),
                                icon = Icons.Default.PostAdd,
                                modifier = Modifier.weight(1f),
                                onClick = { onNavigate(Routes.PREFORECAST_NEW) },
                            )
                        }
                    }

                    item {
                        HomeSectionTitle(stringResource(R.string.home_at_a_glance))
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            contentPadding = PaddingValues(horizontal = 2.dp),
                        ) {
                            items(metrics) { metric ->
                                HomeMetricCard(metric)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun HomeSectionTitle(title: String) {
    Text(
        title,
        style = MaterialTheme.typography.titleSmall,
        fontWeight = FontWeight.Bold,
        color = IcsColors.Primary,
        modifier = Modifier.padding(bottom = 10.dp),
    )
}

@Composable
private fun HomeWelcomeCard(
    userName: String,
    actionCount: Int,
) {
    ElevatedCard(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.extraLarge,
        colors = CardDefaults.elevatedCardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer,
        ),
    ) {
        Column(Modifier.padding(20.dp)) {
            Text(
                stringResource(R.string.home_welcome, userName),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                if (actionCount > 0) {
                    stringResource(R.string.home_subtitle_actions, actionCount)
                } else {
                    stringResource(R.string.home_subtitle_all_clear)
                },
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.85f),
            )
        }
    }
}

@Composable
private fun HomeAttentionRow(item: AttentionItem) {
    ListItem(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = item.onClick),
        headlineContent = {
            Text(item.title, fontWeight = FontWeight.SemiBold)
        },
        supportingContent = {
            Text(
                item.subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = IcsColors.TextSecondary,
            )
        },
        leadingContent = {
            Surface(
                shape = MaterialTheme.shapes.medium,
                color = icsHexAlpha(item.tint, 0.12f),
            ) {
                Icon(
                    item.icon,
                    contentDescription = null,
                    tint = item.tint,
                    modifier = Modifier.padding(10.dp),
                )
            }
        },
        trailingContent = {
            Badge(containerColor = item.tint) {
                Text("${item.count}")
            }
        },
        colors = ListItemDefaults.colors(containerColor = MaterialTheme.colorScheme.surface),
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun HomePrimaryActionCard(
    label: String,
    description: String,
    icon: ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    ElevatedCard(
        onClick = onClick,
        modifier = modifier.heightIn(min = 132.dp),
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(
            Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            Surface(
                shape = MaterialTheme.shapes.medium,
                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
            ) {
                Icon(
                    icon,
                    contentDescription = null,
                    tint = IcsColors.Primary,
                    modifier = Modifier.padding(10.dp),
                )
            }
            Column {
                Text(
                    label,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    description,
                    style = MaterialTheme.typography.bodySmall,
                    color = IcsColors.TextSecondary,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun HomeMetricCard(metric: HomeMetric) {
    val highlighted = metric.value > 0
    OutlinedCard(
        onClick = metric.onClick,
        shape = MaterialTheme.shapes.large,
        border = CardDefaults.outlinedCardBorder(
            enabled = true,
        ),
        colors = CardDefaults.outlinedCardColors(
            containerColor = if (highlighted) {
                icsHexAlpha(IcsColors.Primary, 0.04f)
            } else {
                MaterialTheme.colorScheme.surface
            },
        ),
        modifier = Modifier.width(148.dp),
    ) {
        Column(Modifier.padding(14.dp)) {
            Icon(
                metric.icon,
                contentDescription = null,
                tint = if (highlighted) IcsColors.Primary else IcsColors.TextSecondary,
                modifier = Modifier.size(22.dp),
            )
            Spacer(Modifier.height(10.dp))
            Text(
                "${metric.value}",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = if (highlighted) IcsColors.Primary else IcsColors.OnSurface,
            )
            Text(
                metric.label,
                style = MaterialTheme.typography.labelMedium,
                color = IcsColors.TextSecondary,
                modifier = Modifier.padding(top = 2.dp),
            )
        }
    }
}

@Composable
private fun buildAttentionItems(
    d: TruckerDashboardDto,
    onNavigate: (String) -> Unit,
): List<AttentionItem> = buildList {
    if (d.pendingPayments > 0) {
        add(
            AttentionItem(
                title = stringResource(R.string.home_upload_payment),
                subtitle = stringResource(R.string.home_pending_verification, d.pendingPayments),
                count = d.pendingPayments,
                icon = Icons.Default.AttachMoney,
                tint = IcsColors.Warning,
                onClick = { onNavigate("payments") },
            ),
        )
    }
    if (d.issuedWithdrawalsAwaitingUpload > 0) {
        add(
            AttentionItem(
                title = stringResource(R.string.dashboard_stat_issued_upload),
                subtitle = stringResource(R.string.dashboard_stat_issued_upload_desc),
                count = d.issuedWithdrawalsAwaitingUpload,
                icon = Icons.AutoMirrored.Filled.NoteAdd,
                tint = IcsColors.Primary,
                onClick = { onNavigate("withdrawals") },
            ),
        )
    }
    if (d.pendingRequests > 0) {
        add(
            AttentionItem(
                title = stringResource(R.string.dashboard_stat_pending_preforecast),
                subtitle = stringResource(R.string.home_preforecast_summary, d.pendingRequests),
                count = d.pendingRequests,
                icon = Icons.Default.PostAdd,
                tint = IcsColors.Primary,
                onClick = { onNavigate(Routes.PREFORECAST_LIST) },
            ),
        )
    }
    if (d.draftWithdrawals > 0) {
        add(
            AttentionItem(
                title = stringResource(R.string.dashboard_stat_draft_withdrawals),
                subtitle = stringResource(R.string.dashboard_stat_draft_withdrawals_desc),
                count = d.draftWithdrawals,
                icon = Icons.AutoMirrored.Filled.Assignment,
                tint = IcsColors.TextSecondary,
                onClick = { onNavigate("withdrawals") },
            ),
        )
    }
    d.widgets?.let { widgets ->
        if (widgets.expiringWithin48Hours > 0) {
            add(
                AttentionItem(
                    title = stringResource(R.string.home_alert_expiring_48h),
                    subtitle = stringResource(R.string.home_attention_expiring_hint),
                    count = widgets.expiringWithin48Hours,
                    icon = Icons.Default.WarningAmber,
                    tint = IcsColors.Warning,
                    onClick = { onNavigate("withdrawals") },
                ),
            )
        }
        if (widgets.stuckOver24HoursInReview > 0) {
            add(
                AttentionItem(
                    title = stringResource(R.string.home_alert_review_24h),
                    subtitle = stringResource(R.string.home_attention_review_hint),
                    count = widgets.stuckOver24HoursInReview,
                    icon = Icons.Outlined.CalendarMonth,
                    tint = IcsColors.Primary,
                    onClick = { onNavigate("withdrawals") },
                ),
            )
        }
    }
}

@Composable
private fun buildHomeMetrics(
    d: TruckerDashboardDto,
    onNavigate: (String) -> Unit,
): List<HomeMetric> = listOf(
    HomeMetric(
        label = stringResource(R.string.home_metric_returns),
        value = d.upcomingReturns,
        icon = Icons.Default.LocalShipping,
        onClick = { onNavigate("returns") },
    ),
    HomeMetric(
        label = stringResource(R.string.home_metric_payments),
        value = d.pendingPayments,
        icon = Icons.Default.AttachMoney,
        onClick = { onNavigate("payments") },
    ),
    HomeMetric(
        label = stringResource(R.string.home_metric_withdrawals),
        value = d.issuedWithdrawalsAwaitingUpload + d.submittedWithdrawals + d.draftWithdrawals,
        icon = Icons.AutoMirrored.Filled.NoteAdd,
        onClick = { onNavigate("withdrawals") },
    ),
    HomeMetric(
        label = stringResource(R.string.home_metric_preforecast),
        value = d.pendingRequests,
        icon = Icons.Default.PostAdd,
        onClick = { onNavigate(Routes.PREFORECAST_LIST) },
    ),
)

@Composable
fun MenuScreen(
    repository: TruckerRepository,
    onOpenNotifications: () -> Unit,
    notificationUnreadCount: Int = 0,
    onNavigate: (String) -> Unit,
    onLogout: () -> Unit,
) {
    var unread by remember { mutableIntStateOf(notificationUnreadCount) }
    var refreshing by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun loadUnread() {
        scope.launch {
            refreshing = true
            runCatching { unread = repository.getUnreadNotificationCount() }
            refreshing = false
        }
    }
    LaunchedEffect(notificationUnreadCount) {
        unread = notificationUnreadCount
    }
    LaunchedEffect(Unit) {
        loadUnread()
    }

    IcsScreenScaffold(
        title = stringResource(R.string.more_title),
        branded = true,
        onNotificationClick = onOpenNotifications,
        notificationUnreadCount = notificationUnreadCount,
        refreshing = refreshing,
        onRefresh = { loadUnread() },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(vertical = 16.dp),
        ) {
            item {
                IcsSectionCard(title = stringResource(R.string.menu_title)) {
                    IcsQuickActionRow(stringResource(R.string.home_preforecast), stringResource(R.string.menu_preforecast_subtitle), { onNavigate(Routes.PREFORECAST_LIST) })
                    HorizontalDivider(color = IcsColors.Divider)
                    IcsQuickActionRow(stringResource(R.string.home_qr_passes), stringResource(R.string.menu_qr_subtitle), { onNavigate(Routes.QR_LIST) })
                    HorizontalDivider(color = IcsColors.Divider)
                    IcsQuickActionRow(stringResource(R.string.menu_demurrage_title), stringResource(R.string.menu_demurrage_subtitle), { onNavigate(Routes.DEMURRAGE_LIST) })
                    HorizontalDivider(color = IcsColors.Divider)
                    IcsQuickActionRow(stringResource(R.string.menu_reports_title), stringResource(R.string.menu_reports_subtitle), { onNavigate(Routes.REPORTS) })
                    HorizontalDivider(color = IcsColors.Divider)
                    IcsQuickActionRow(stringResource(R.string.menu_notifications_title), stringResource(R.string.menu_unread_count, unread), { onNavigate(Routes.NOTIFICATIONS) })
                    HorizontalDivider(color = IcsColors.Divider)
                    IcsQuickActionRow(stringResource(R.string.menu_profile_title), stringResource(R.string.menu_profile_subtitle), { onNavigate(Routes.PROFILE) })
                }
            }
            item {
                OutlinedButton(
                    onClick = onLogout,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = IcsColors.Error),
                ) {
                    Text(stringResource(R.string.action_sign_out))
                }
            }
        }
    }
}
