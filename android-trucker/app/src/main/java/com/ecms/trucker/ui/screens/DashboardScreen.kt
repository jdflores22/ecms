package com.ecms.trucker.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.ecms.trucker.R
import com.ecms.trucker.data.model.TruckerDashboardDto
import com.ecms.trucker.data.repository.TruckerRepository
import com.ecms.trucker.ui.components.*
import com.ecms.trucker.ui.navigation.Routes
import com.ecms.trucker.ui.theme.IcsColors
import com.ecms.trucker.ui.theme.icsHexAlpha
import kotlinx.coroutines.launch

private data class DashboardCacheEntry(
    val data: TruckerDashboardDto,
    val updatedAtMs: Long,
)

private const val DASHBOARD_CACHE_TTL_MS = 60_000L
private var DashboardCache: DashboardCacheEntry? = null

private fun dashboardStatValue(d: TruckerDashboardDto, key: String): Int = when (key) {
    "pendingRequests" -> d.pendingRequests
    "draftWithdrawals" -> d.draftWithdrawals
    "issuedWithdrawalsAwaitingUpload" -> d.issuedWithdrawalsAwaitingUpload
    "submittedWithdrawals" -> d.submittedWithdrawals
    "upcomingReturns" -> d.upcomingReturns
    "pendingPayments" -> d.pendingPayments
    "confirmedReturns" -> d.confirmedReturns
    "approvedWithdrawals" -> d.approvedWithdrawals
    else -> 0
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    repository: TruckerRepository,
    userName: String,
    onOpenNotifications: () -> Unit,
    onNavigate: (String) -> Unit,
) {
    val cachedDashboard = DashboardCache
        ?.takeIf { System.currentTimeMillis() - it.updatedAtMs <= DASHBOARD_CACHE_TTL_MS }
        ?.data
    var dashboard by remember { mutableStateOf(cachedDashboard) }
    var loading by remember { mutableStateOf(cachedDashboard == null) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun load(force: Boolean = false) {
        scope.launch {
            if (dashboard == null) loading = true
            error = null
            if (!force) {
                DashboardCache
                    ?.takeIf { System.currentTimeMillis() - it.updatedAtMs <= DASHBOARD_CACHE_TTL_MS }
                    ?.let { entry ->
                        dashboard = entry.data
                        loading = false
                        return@launch
                    }
            }
            runCatching { repository.getDashboard() }
                .onSuccess {
                    dashboard = it
                    DashboardCache = DashboardCacheEntry(
                        data = it,
                        updatedAtMs = System.currentTimeMillis(),
                    )
                }
                .onFailure { error = it.message }
            loading = false
        }
    }

    LaunchedEffect(Unit) { load(force = cachedDashboard == null) }

    IcsScreenScaffold(
        title = stringResource(R.string.home_title),
        subtitle = stringResource(R.string.home_welcome, userName),
        branded = true,
        onNotificationClick = onOpenNotifications,
        refreshing = loading,
        onRefresh = { load(force = true) },
    ) { padding ->
        when {
            loading -> LoadingBox(Modifier.padding(padding))
            error != null -> ErrorMessage(error!!, onRetry = { load() }, modifier = Modifier.padding(padding))
            dashboard != null -> {
                val d = dashboard!!
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    contentPadding = PaddingValues(vertical = 16.dp),
                ) {
                    item {
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            FilledTonalButton(
                                onClick = { onNavigate(Routes.WITHDRAWAL_NEW) },
                                modifier = Modifier.weight(1f),
                            ) { Text(stringResource(R.string.home_new_withdrawal)) }
                            FilledTonalButton(
                                onClick = { onNavigate(Routes.PREFORECAST_NEW) },
                                modifier = Modifier.weight(1f),
                            ) { Text(stringResource(R.string.home_preforecast)) }
                        }
                    }

                    item { IcsScreenSectionTitle(stringResource(R.string.home_overview)) }

                    TruckerDashboardStats.chunked(2).forEach { row ->
                        item {
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                row.forEach { stat ->
                                    val count = dashboardStatValue(d, stat.key)
                                    IcsStatCard(
                                        label = stringResource(stat.labelRes),
                                        value = "$count",
                                        description = stringResource(stat.descriptionRes),
                                        color = stat.color,
                                        highlighted = stat.highlightWhenPositive && count > 0,
                                        modifier = Modifier.weight(1f),
                                    )
                                }
                                if (row.size == 1) Spacer(Modifier.weight(1f))
                            }
                        }
                    }

                    item {
                        IcsSectionCard(title = stringResource(R.string.home_quick_actions)) {
                            IcsQuickActionRow(
                                stringResource(R.string.home_new_preforecast),
                                stringResource(R.string.home_submit_container_return_request),
                                onClick = { onNavigate(Routes.PREFORECAST_NEW) },
                            )
                            HorizontalDivider(color = IcsColors.Divider)
                            IcsQuickActionRow(
                                stringResource(R.string.home_new_withdrawal),
                                stringResource(R.string.home_create_atw_request),
                                onClick = { onNavigate(Routes.WITHDRAWAL_NEW) },
                            )
                            HorizontalDivider(color = IcsColors.Divider)
                            IcsQuickActionRow(
                                stringResource(R.string.home_my_returns),
                                stringResource(R.string.home_returns_summary, d.confirmedReturns, d.upcomingReturns),
                                onClick = { onNavigate("returns") },
                            )
                            HorizontalDivider(color = IcsColors.Divider)
                            IcsQuickActionRow(
                                stringResource(R.string.home_upload_payment),
                                stringResource(R.string.home_pending_verification, d.pendingPayments),
                                onClick = { onNavigate("payments") },
                            )
                            HorizontalDivider(color = IcsColors.Divider)
                            IcsQuickActionRow(
                                stringResource(R.string.home_qr_passes),
                                stringResource(R.string.home_download_qr),
                                onClick = { onNavigate(Routes.QR_LIST) },
                            )
                        }
                    }

                    val widgets = d.widgets
                    if (widgets != null && (widgets.expiringWithin48Hours > 0 || widgets.stuckOver24HoursInReview > 0)) {
                        item {
                            IcsSectionCard(title = stringResource(R.string.home_alerts)) {
                                if (widgets.expiringWithin48Hours > 0) {
                                    AlertRow(stringResource(R.string.home_alert_expiring_48h), widgets.expiringWithin48Hours, IcsColors.Warning)
                                }
                                if (widgets.stuckOver24HoursInReview > 0) {
                                    AlertRow(
                                        stringResource(R.string.home_alert_review_24h),
                                        widgets.stuckOver24HoursInReview,
                                        IcsColors.Purple,
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AlertRow(label: String, count: Int, color: androidx.compose.ui.graphics.Color) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium)
        Surface(color = icsHexAlpha(color, 0.12f), shape = MaterialTheme.shapes.small) {
            Text(
                "$count",
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                color = color,
                style = MaterialTheme.typography.labelLarge,
            )
        }
    }
}

@Composable
fun MenuScreen(
    repository: TruckerRepository,
    onOpenNotifications: () -> Unit,
    onNavigate: (String) -> Unit,
    onLogout: () -> Unit,
) {
    var unread by remember { mutableIntStateOf(0) }
    var refreshing by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun loadUnread() {
        scope.launch {
            refreshing = true
            runCatching { unread = repository.getUnreadNotificationCount() }
            refreshing = false
        }
    }
    LaunchedEffect(Unit) {
        loadUnread()
    }

    IcsScreenScaffold(
        title = stringResource(R.string.more_title),
        branded = true,
        onNotificationClick = onOpenNotifications,
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
