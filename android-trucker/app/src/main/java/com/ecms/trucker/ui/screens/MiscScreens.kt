package com.ecms.trucker.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ecms.trucker.R
import com.ecms.trucker.data.model.DemurrageBillingDto
import com.ecms.trucker.data.model.NotificationDto
import com.ecms.trucker.data.repository.TruckerRepository
import com.ecms.trucker.ui.components.*
import com.ecms.trucker.ui.theme.IcsColors
import com.ecms.trucker.ui.theme.icsHexAlpha
import com.ecms.trucker.ui.util.formatRelativeTime
import com.ecms.trucker.ui.util.rememberScreenLoadState
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DemurrageListScreen(
    repository: TruckerRepository,
    onItemClick: (Int) -> Unit,
    onBack: (() -> Unit)? = null,
) {
    val loadState = rememberScreenLoadState(initiallyLoading = true)
    var items by remember { mutableStateOf<List<DemurrageBillingDto>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun load() {
        scope.launch {
            loadState.begin(items.isNotEmpty())
            runCatching { repository.listDemurrageBillings() }
                .onSuccess { items = it }
                .onFailure { error = it.message }
            loadState.end()
        }
    }
    LaunchedEffect(Unit) { load() }

    IcsScreenScaffold(
        title = stringResource(R.string.demurrage_title),
        onBack = onBack,
        refreshing = loadState.refreshing,
        onRefresh = { load() },
    ) { padding ->
        when {
            loadState.loading -> LoadingBox(Modifier.padding(padding))
            error != null -> ErrorMessage(error!!, { load() }, Modifier.padding(padding))
            items.isEmpty() -> EmptyState(stringResource(R.string.demurrage_empty), Modifier.padding(padding))
            else -> LazyColumn(Modifier.padding(padding), contentPadding = PaddingValues(vertical = 8.dp)) {
                items(items) { b ->
                    IcsListItemCard(
                        title = b.referenceNo,
                        subtitle = stringResource(
                            R.string.demurrage_item_subtitle,
                            b.containerNo,
                            "\u20B1",
                            b.totalAmount.toString(),
                            b.daysOverdue,
                        ),
                        status = b.status,
                        onClick = { onItemClick(b.id) },
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DemurrageDetailScreen(
    id: Int,
    repository: TruckerRepository,
    onBack: () -> Unit,
) {
    val loadState = rememberScreenLoadState(initiallyLoading = true)
    var billing by remember { mutableStateOf<DemurrageBillingDto?>(null) }
    var uploading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var selectedUri by remember { mutableStateOf<Uri?>(null) }
    val scope = rememberCoroutineScope()

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { selectedUri = it }

    fun load() {
        scope.launch {
            loadState.begin(billing != null)
            runCatching { billing = repository.getDemurrageBilling(id) }
                .onFailure { error = it.message }
            loadState.end()
        }
    }
    LaunchedEffect(id) { load() }

    IcsScreenScaffold(
        title = stringResource(R.string.demurrage_detail_title),
        onBack = onBack,
        refreshing = loadState.refreshing,
        onRefresh = { load() },
    ) { padding ->
        when {
            loadState.loading && billing == null -> LoadingBox(Modifier.padding(padding))
            error != null && billing == null -> ErrorMessage(error!!, { load() }, Modifier.padding(padding))
            billing != null -> {
                val b = billing!!
                Column(
                    Modifier
                        .padding(padding)
                        .padding(16.dp)
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(b.referenceNo, style = MaterialTheme.typography.headlineSmall)
                    StatusChip(b.status)
                    DRow(stringResource(R.string.field_container), b.containerNo)
                    DRow(stringResource(R.string.section_preforecast), b.preAdviceReferenceNo)
                    DRow(stringResource(R.string.field_total), "\u20B1${b.totalAmount}")
                    DRow(stringResource(R.string.field_days_overdue), "${b.daysOverdue}")
                    b.feeLines.forEach { DRow(it.description, "\u20B1${it.amount}") }
                    if (!b.status.equals("Paid", true)) {
                        OutlinedButton(onClick = { picker.launch("*/*") }, modifier = Modifier.fillMaxWidth()) {
                            Text(selectedUri?.lastPathSegment ?: stringResource(R.string.demurrage_select_payment_proof))
                        }
                        Button(
                            onClick = {
                                val uri = selectedUri ?: return@Button
                                uploading = true
                                scope.launch {
                                    runCatching { repository.uploadDemurrageProof(id, uri, null, null) }
                                        .onSuccess { load() }
                                        .onFailure { error = it.message }
                                    uploading = false
                                }
                            },
                            enabled = !uploading && selectedUri != null,
                            modifier = Modifier.fillMaxWidth(),
                        ) { Text(stringResource(R.string.demurrage_upload_proof)) }
                    }
                    error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                }
            }
        }
    }
}

@Composable
private fun DRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.labelMedium)
        Text(value)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportsScreen(
    repository: TruckerRepository,
    onBack: (() -> Unit)? = null,
) {
    val context = LocalContext.current
    val loadState = rememberScreenLoadState(initiallyLoading = false)
    var tab by remember { mutableIntStateOf(0) }
    var daily by remember { mutableStateOf<String?>(null) }
    var monthly by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun loadReport() {
        scope.launch {
            loadState.begin(daily != null || monthly != null)
            if (tab == 0) {
                runCatching { repository.getDailyReturnsReport(null, null) }
                    .onSuccess { daily = context.getString(R.string.reports_summary, it.totalScheduled, it.totalCompleted) }
            } else {
                runCatching { repository.getMonthlyReturnsReport(null) }
                    .onSuccess { monthly = context.getString(R.string.reports_summary, it.totalScheduled, it.totalCompleted) }
            }
            loadState.end()
        }
    }
    LaunchedEffect(tab) { loadReport() }

    IcsScreenScaffold(
        title = stringResource(R.string.reports_title),
        onBack = onBack,
        refreshing = loadState.refreshing,
        onRefresh = { loadReport() },
    ) { padding ->
        Column(
            Modifier
                .padding(padding)
                .padding(16.dp)
                .fillMaxSize()
                .verticalScroll(rememberScrollState()),
        ) {
            TabRow(selectedTabIndex = tab) {
                Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text(stringResource(R.string.reports_daily_tab)) })
                Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text(stringResource(R.string.reports_monthly_tab)) })
            }
            Spacer(Modifier.height(16.dp))
            if (loadState.loading) CircularProgressIndicator() else {
                Text(if (tab == 0) daily ?: stringResource(R.string.reports_no_data) else monthly ?: stringResource(R.string.reports_no_data))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    repository: TruckerRepository,
    authRepository: com.ecms.trucker.data.repository.AuthRepository,
    onBack: (() -> Unit)? = null,
    onLogout: () -> Unit,
) {
    val loadState = rememberScreenLoadState(initiallyLoading = true)
    var profile by remember { mutableStateOf<com.ecms.trucker.data.model.ProfileDto?>(null) }
    var fullName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var currentPassword by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var message by remember { mutableStateOf<String?>(null) }
    val profileUpdatedMessage = stringResource(R.string.profile_updated)
    val passwordChangedMessage = stringResource(R.string.profile_password_changed)
    val scope = rememberCoroutineScope()

    fun loadProfile() {
        scope.launch {
            loadState.begin(profile != null)
            runCatching { repository.getProfile() }
                .onSuccess { profile = it; fullName = it.fullName; email = it.email }
            loadState.end()
        }
    }
    LaunchedEffect(Unit) { loadProfile() }

    IcsScreenScaffold(
        title = stringResource(R.string.profile_title),
        onBack = onBack,
        refreshing = loadState.refreshing,
        onRefresh = { loadProfile() },
    ) { padding ->
        if (loadState.loading) LoadingBox(Modifier.padding(padding)) else {
            Column(
                Modifier
                    .padding(padding)
                    .padding(16.dp)
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                profile?.let { Text("@${it.username}", style = MaterialTheme.typography.titleMedium) }
                OutlinedTextField(fullName, { fullName = it }, label = { Text(stringResource(R.string.auth_full_name)) }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(email, { email = it }, label = { Text(stringResource(R.string.auth_email)) }, modifier = Modifier.fillMaxWidth())
                Button(
                    onClick = {
                        scope.launch {
                            runCatching { repository.updateProfile(email, fullName) }
                                .onSuccess { message = profileUpdatedMessage }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) { Text(stringResource(R.string.profile_save)) }
                HorizontalDivider(Modifier.padding(vertical = 8.dp))
                OutlinedTextField(currentPassword, { currentPassword = it }, label = { Text(stringResource(R.string.profile_current_password)) }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(newPassword, { newPassword = it }, label = { Text(stringResource(R.string.profile_new_password)) }, modifier = Modifier.fillMaxWidth())
                OutlinedButton(
                    onClick = {
                        scope.launch {
                            runCatching { repository.changePassword(currentPassword, newPassword) }
                                .onSuccess { message = passwordChangedMessage; currentPassword = ""; newPassword = "" }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) { Text(stringResource(R.string.profile_change_password)) }
                message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
                Spacer(Modifier.height(16.dp))
                OutlinedButton(onClick = {
                    scope.launch { authRepository.logout(); onLogout() }
                }, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.action_sign_out)) }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(
    repository: TruckerRepository,
    onBack: () -> Unit,
    onUnreadCountChanged: (Int) -> Unit = {},
) {
    val loadState = rememberScreenLoadState(initiallyLoading = true)
    var items by remember { mutableStateOf<List<NotificationDto>>(emptyList()) }
    val scope = rememberCoroutineScope()

    fun loadNotifications() {
        scope.launch {
            loadState.begin(items.isNotEmpty())
            runCatching {
                val page = repository.getNotifications(page = 1, pageSize = 50)
                items = page.items
                onUnreadCountChanged(page.unreadCount)
            }
            loadState.end()
        }
    }

    fun markRead(id: Int) {
        scope.launch {
            runCatching { repository.markNotificationRead(id) }
            items = items.map { if (it.id == id) it.copy(isRead = true) else it }
            onUnreadCountChanged(items.count { !it.isRead })
        }
    }

    fun markAllRead() {
        scope.launch {
            runCatching { repository.markAllNotificationsRead() }
            items = items.map { it.copy(isRead = true) }
            onUnreadCountChanged(0)
        }
    }

    LaunchedEffect(Unit) { loadNotifications() }

    val hasUnread = items.any { !it.isRead }

    IcsScreenScaffold(
        title = stringResource(R.string.notifications_title),
        onBack = onBack,
        refreshing = loadState.refreshing,
        onRefresh = { loadNotifications() },
        actions = {
            if (hasUnread) {
                TextButton(onClick = { markAllRead() }) {
                    Text(stringResource(R.string.notifications_mark_all_read))
                }
            }
        },
    ) { padding ->
        when {
            loadState.loading -> LoadingBox(Modifier.padding(padding))
            items.isEmpty() -> EmptyState(stringResource(R.string.notifications_empty), Modifier.padding(padding))
            else -> LazyColumn(
                Modifier.padding(padding),
                contentPadding = PaddingValues(vertical = 8.dp),
            ) {
                items(items, key = { it.id }) { n ->
                    val bg = if (n.isRead) {
                        MaterialTheme.colorScheme.surface
                    } else {
                        icsHexAlpha(IcsColors.Primary, 0.04f)
                    }
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(bg)
                            .clickable(enabled = !n.isRead) { markRead(n.id) }
                            .padding(horizontal = 16.dp, vertical = 14.dp),
                    ) {
                        Text(
                            n.title,
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                        )
                        Spacer(Modifier.height(6.dp))
                        Text(
                            n.message,
                            style = MaterialTheme.typography.bodyMedium,
                            color = IcsColors.TextSecondary,
                        )
                        Spacer(Modifier.height(6.dp))
                        Text(
                            formatRelativeTime(n.createdAt),
                            style = MaterialTheme.typography.labelSmall,
                            color = IcsColors.TextSecondary.copy(alpha = 0.75f),
                        )
                    }
                    HorizontalDivider(color = IcsColors.Divider)
                }
            }
        }
    }
}
