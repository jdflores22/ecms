package com.ecms.trucker

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.ecms.trucker.data.local.AuthState
import com.ecms.trucker.push.PushNotificationManager
import com.ecms.trucker.push.PushTokenRegistrar
import com.ecms.trucker.ui.components.TruckerBroadcastModal
import com.ecms.trucker.ui.navigation.MainBottomBar
import com.ecms.trucker.ui.navigation.MainTab
import com.ecms.trucker.ui.navigation.NotificationNavigator
import com.ecms.trucker.ui.navigation.Routes
import com.ecms.trucker.ui.screens.*
import com.ecms.trucker.ui.screens.auth.ForgotPasswordScreen
import com.ecms.trucker.ui.screens.auth.LoginScreen
import com.ecms.trucker.ui.screens.auth.ResetPasswordScreen
import com.ecms.trucker.ui.screens.auth.SignUpScreen
import com.ecms.trucker.ui.theme.EcmsTruckerTheme
import com.ecms.trucker.ui.util.clearAllTruckerScreenCaches
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private data class PushNavigation(
    val linkPath: String?,
    val category: String?,
)

class MainActivity : ComponentActivity() {

    private var pendingPushNavigation by mutableStateOf<PushNavigation?>(null)
    private var pendingResetToken by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val container = (application as EcmsTruckerApp).container
        pendingPushNavigation = extractPushNavigation(intent)
        pendingResetToken = extractResetToken(intent)

        setContent {
            EcmsTruckerTheme {
                val context = LocalContext.current
                val authState by container.authRepository.authState.collectAsState(initial = AuthState())
                val scope = rememberCoroutineScope()
                var paymentBadge by remember { mutableIntStateOf(0) }
                var withdrawalBadge by remember { mutableIntStateOf(0) }
                var demurrageBadge by remember { mutableIntStateOf(0) }
                var soaBadge by remember { mutableIntStateOf(0) }
                var notificationBadge by remember { mutableIntStateOf(0) }
                var pushNavigation by remember { mutableStateOf(pendingPushNavigation) }
                var resetToken by remember { mutableStateOf(pendingResetToken) }

                val notificationPermissionLauncher = rememberLauncherForActivityResult(
                    ActivityResultContracts.RequestPermission(),
                ) { granted ->
                    if (granted && authState.isLoggedIn) {
                        scope.launch { PushTokenRegistrar.sync(context, container.api) }
                    }
                }

                suspend fun logout() {
                    PushTokenRegistrar.unregister(context, container.api)
                    container.authRepository.logout()
                    clearAllTruckerScreenCaches()
                }

                suspend fun refreshBadges() {
                    runCatching {
                        val d = container.truckerRepository.getDashboard()
                        paymentBadge = d.pendingPayments
                        withdrawalBadge = d.issuedWithdrawalsAwaitingUpload
                    }
                    runCatching {
                        demurrageBadge = container.truckerRepository.getDemurragePaymentDueCount()
                    }
                    runCatching {
                        soaBadge = container.truckerRepository.getSoaPaymentDueCount()
                    }
                    runCatching {
                        notificationBadge = container.truckerRepository.getUnreadNotificationCount()
                    }
                }

                LaunchedEffect(Unit) {
                    container.tokenStore.repairCorruptSession()
                    PushNotificationManager.ensureChannel(context)
                }

                LaunchedEffect(authState.isLoggedIn) {
                    if (authState.isLoggedIn) {
                        if (BuildConfig.FIREBASE_ENABLED) {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                                && !PushNotificationManager.hasPermission(context)
                            ) {
                                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                            } else {
                                PushTokenRegistrar.sync(context, container.api)
                            }
                        }
                        refreshBadges()
                        container.authRepository.syncAllowedPages()
                        while (true) {
                            delay(30_000)
                            refreshBadges()
                        }
                    } else {
                        paymentBadge = 0
                        withdrawalBadge = 0
                        demurrageBadge = 0
                        soaBadge = 0
                        notificationBadge = 0
                        clearAllTruckerScreenCaches()
                    }
                }

                LaunchedEffect(pendingPushNavigation) {
                    pushNavigation = pendingPushNavigation
                }

                LaunchedEffect(pendingResetToken) {
                    if (pendingResetToken != null) {
                        resetToken = pendingResetToken
                    }
                }

                key(authState.isLoggedIn) {
                    val navController = rememberNavController()
                    var selectedTabRoute by rememberSaveable { mutableStateOf(MainTab.Home.route) }

                    LaunchedEffect(resetToken, authState.isLoggedIn) {
                        val token = resetToken?.trim().orEmpty()
                        if (!authState.isLoggedIn && token.isNotEmpty()) {
                            navController.navigate(Routes.resetPassword(token)) {
                                launchSingleTop = true
                            }
                            resetToken = null
                            pendingResetToken = null
                        }
                    }

                    fun navigateFromNotification(linkPath: String?, category: String) {
                        NotificationNavigator.navigate(
                            navController = navController,
                            linkPath = linkPath,
                            category = category,
                            onTabSelected = { selectedTabRoute = it },
                        )
                    }

                    LaunchedEffect(authState.isLoggedIn, pushNavigation) {
                        val target = pushNavigation ?: return@LaunchedEffect
                        if (!authState.isLoggedIn) return@LaunchedEffect
                        navigateFromNotification(target.linkPath, target.category.orEmpty())
                        pushNavigation = null
                        pendingPushNavigation = null
                    }

                    if (!authState.isLoggedIn) {
                        NavHost(navController = navController, startDestination = Routes.LOGIN) {
                            composable(Routes.LOGIN) {
                                LoginScreen(
                                    authRepository = container.authRepository,
                                    onLoggedIn = {},
                                    onSignUp = { navController.navigate(Routes.SIGNUP) },
                                    onForgotPassword = { navController.navigate(Routes.FORGOT_PASSWORD) },
                                    onOpenFaq = { navController.navigate(Routes.FAQ) },
                                )
                            }
                            composable(Routes.SIGNUP) {
                                SignUpScreen(
                                    authRepository = container.authRepository,
                                    onSignedUp = {},
                                    onBack = { navController.popBackStack() },
                                    onOpenFaq = { navController.navigate(Routes.FAQ) },
                                )
                            }
                            composable(Routes.FORGOT_PASSWORD) {
                                ForgotPasswordScreen(
                                    authRepository = container.authRepository,
                                    onBack = { navController.popBackStack() },
                                )
                            }
                            composable(Routes.FAQ) {
                                FaqScreen(onBack = { navController.popBackStack() })
                            }
                            composable(
                                Routes.RESET_PASSWORD,
                                arguments = listOf(navArgument("token") { type = NavType.StringType }),
                            ) { entry ->
                                ResetPasswordScreen(
                                    authRepository = container.authRepository,
                                    resetToken = entry.arguments?.getString("token").orEmpty(),
                                    onBack = { navController.popBackStack() },
                                    onResetComplete = {
                                        navController.navigate(Routes.LOGIN) {
                                            popUpTo(Routes.LOGIN) { inclusive = true }
                                        }
                                    },
                                )
                            }
                        }
                    } else {
                        TruckerBroadcastModal(
                            repository = container.truckerRepository,
                            onNavigate = { linkPath, category ->
                                navigateFromNotification(linkPath, category)
                            },
                        )

                        Scaffold(
                            containerColor = com.ecms.trucker.ui.theme.IcsColors.Background,
                            contentWindowInsets = androidx.compose.foundation.layout.WindowInsets(0, 0, 0, 0),
                            bottomBar = {
                                MainBottomBar(
                                    currentRoute = selectedTabRoute,
                                    onTabSelected = { tab ->
                                        selectedTabRoute = tab.route
                                        if (navController.currentDestination?.route != Routes.MAIN) {
                                            if (!navController.popBackStack(Routes.MAIN, inclusive = false)) {
                                                navController.navigate(Routes.MAIN) {
                                                    launchSingleTop = true
                                                }
                                            }
                                        }
                                    },
                                    paymentBadge = paymentBadge,
                                    withdrawalBadge = withdrawalBadge,
                                )
                            },
                        ) { padding ->
                        NavHost(
                            navController = navController,
                            startDestination = Routes.MAIN,
                            modifier = Modifier.padding(padding),
                        ) {
                            composable(Routes.MAIN) {
                                val tabNav = rememberNavController()

                                LaunchedEffect(selectedTabRoute) {
                                    if (tabNav.currentDestination?.route == selectedTabRoute) return@LaunchedEffect
                                    tabNav.navigate(selectedTabRoute) {
                                        popUpTo(tabNav.graph.startDestinationId) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                }

                                NavHost(
                                    navController = tabNav,
                                    startDestination = MainTab.Home.route,
                                ) {
                                        composable(MainTab.Home.route) {
                                            val displayName = authState.user?.fullName
                                                ?.trim()
                                                ?.split(" ")
                                                ?.firstOrNull()
                                                ?.takeIf { it.isNotBlank() }
                                                ?: authState.user?.username
                                                ?: "Trucker"
                                            DashboardScreen(
                                                repository = container.truckerRepository,
                                                userName = displayName,
                                                onOpenNotifications = { navController.navigate(Routes.NOTIFICATIONS) },
                                                notificationUnreadCount = notificationBadge,
                                                demurrageDueCount = demurrageBadge,
                                                soaDueCount = soaBadge,
                                                onNavigate = { route ->
                                                    when (route) {
                                                        "returns" -> selectedTabRoute = MainTab.Returns.route
                                                        "payments" -> selectedTabRoute = MainTab.Payments.route
                                                        "withdrawals" -> selectedTabRoute = MainTab.Withdrawals.route
                                                        else -> navController.navigate(route)
                                                    }
                                                },
                                            )
                                        }
                                        composable(MainTab.Returns.route) {
                                            ReturnsListScreen(
                                                repository = container.truckerRepository,
                                                onOpenNotifications = { navController.navigate(Routes.NOTIFICATIONS) },
                                                notificationUnreadCount = notificationBadge,
                                                onItemClick = { navController.navigate(Routes.returnDetail(it)) },
                                            )
                                        }
                                        composable(MainTab.Withdrawals.route) {
                                            WithdrawalsListScreen(
                                                repository = container.truckerRepository,
                                                onOpenNotifications = { navController.navigate(Routes.NOTIFICATIONS) },
                                                notificationUnreadCount = notificationBadge,
                                                onItemClick = { navController.navigate(Routes.withdrawalDetail(it)) },
                                                onNewClick = { navController.navigate(Routes.WITHDRAWAL_NEW) },
                                                onScheduleClick = { navController.navigate(Routes.WITHDRAWAL_SCHEDULE) },
                                            )
                                        }
                                        composable(MainTab.Payments.route) {
                                            PaymentsListScreen(
                                                repository = container.truckerRepository,
                                                onOpenNotifications = { navController.navigate(Routes.NOTIFICATIONS) },
                                                notificationUnreadCount = notificationBadge,
                                                onOpenPayment = { navController.navigate(Routes.paymentUpload(it)) },
                                            )
                                        }
                                        composable(MainTab.Menu.route) {
                                            MenuScreen(
                                                repository = container.truckerRepository,
                                                onOpenNotifications = { navController.navigate(Routes.NOTIFICATIONS) },
                                                notificationUnreadCount = notificationBadge,
                                                demurrageDueCount = demurrageBadge,
                                                soaDueCount = soaBadge,
                                                onNavigate = { navController.navigate(it) },
                                                onLogout = { scope.launch { logout() } },
                                            )
                                        }
                                    }
                                }

                                composable(Routes.PREFORECAST_LIST) {
                                PreForecastListScreen(
                                    repository = container.truckerRepository,
                                    onItemClick = { navController.navigate(Routes.preForecastDetail(it)) },
                                    onViewQr = { navController.navigate(Routes.preForecastDetail(it, "qr")) },
                                    onNewClick = { navController.navigate(Routes.PREFORECAST_NEW) },
                                    onBack = { navController.popBackStack() },
                                )
                            }
                            composable(Routes.PREFORECAST_NEW) {
                                PreForecastNewScreen(
                                    repository = container.truckerRepository,
                                    onCreated = {
                                        navController.navigate(Routes.preForecastDetail(it)) {
                                            popUpTo(Routes.PREFORECAST_NEW) { inclusive = true }
                                        }
                                    },
                                    onBack = { navController.popBackStack() },
                                )
                            }
                            composable(
                                Routes.PREFORECAST_DETAIL,
                                arguments = listOf(
                                    navArgument("id") { type = NavType.IntType },
                                    navArgument("initialTab") {
                                        type = NavType.StringType
                                        nullable = true
                                        defaultValue = null
                                    },
                                ),
                            ) { entry ->
                                PreForecastDetailScreen(
                                    id = entry.arguments?.getInt("id") ?: 0,
                                    repository = container.truckerRepository,
                                    onBack = { navController.popBackStack() },
                                    onDeleted = {
                                        navController.popBackStack(Routes.PREFORECAST_LIST, false)
                                    },
                                    onUploadPayment = { navController.navigate(Routes.paymentUpload(it)) },
                                    onPayDemurrage = { navController.navigate(Routes.demurrageDetail(it)) },
                                    initialTab = PreForecastDetailTab.fromRoute(entry.arguments?.getString("initialTab")),
                                )
                            }
                            composable(
                                Routes.RETURN_DETAIL,
                                arguments = listOf(navArgument("id") { type = NavType.IntType }),
                            ) { entry ->
                                ReturnDetailScreen(
                                    scheduleId = entry.arguments?.getInt("id") ?: 0,
                                    repository = container.truckerRepository,
                                    onBack = { navController.popBackStack() },
                                    onUploadPayment = { navController.navigate(Routes.paymentUpload(it)) },
                                    onViewQr = { navController.navigate(Routes.qrDetail(it)) },
                                )
                            }
                            composable(
                                Routes.PAYMENT_UPLOAD,
                                arguments = listOf(navArgument("scheduleId") { type = NavType.IntType }),
                            ) { entry ->
                                PaymentUploadScreen(
                                    scheduleId = entry.arguments?.getInt("scheduleId") ?: 0,
                                    repository = container.truckerRepository,
                                    onBack = { navController.popBackStack() },
                                    onUploaded = { navController.popBackStack() },
                                )
                            }
                            composable(Routes.QR_LIST) {
                                QrListScreen(
                                    repository = container.truckerRepository,
                                    onItemClick = { navController.navigate(Routes.qrDetail(it)) },
                                    onBack = { navController.popBackStack() },
                                )
                            }
                            composable(
                                Routes.QR_DETAIL,
                                arguments = listOf(navArgument("bookingId") { type = NavType.IntType }),
                            ) { entry ->
                                QrDetailScreen(
                                    bookingId = entry.arguments?.getInt("bookingId") ?: 0,
                                    repository = container.truckerRepository,
                                    onBack = { navController.popBackStack() },
                                )
                            }
                            composable(Routes.WITHDRAWAL_NEW) {
                                val truckingCompany = authState.user?.fullName?.takeIf { it.isNotBlank() }
                                    ?: authState.user?.username.orEmpty()
                                WithdrawalNewScreen(
                                    repository = container.truckerRepository,
                                    truckingCompany = truckingCompany,
                                    onCreated = {
                                        navController.navigate(Routes.withdrawalDetail(it)) {
                                            popUpTo(Routes.WITHDRAWAL_NEW) { inclusive = true }
                                        }
                                    },
                                    onBack = { navController.popBackStack() },
                                )
                            }
                            composable(Routes.WITHDRAWAL_SCHEDULE) {
                                WithdrawalScheduleScreen(
                                    repository = container.truckerRepository,
                                    onBack = { navController.popBackStack() },
                                    onItemClick = { navController.navigate(Routes.withdrawalDetail(it)) },
                                )
                            }
                            composable(
                                Routes.WITHDRAWAL_DETAIL,
                                arguments = listOf(navArgument("id") { type = NavType.IntType }),
                            ) { entry ->
                                WithdrawalDetailScreen(
                                    id = entry.arguments?.getInt("id") ?: 0,
                                    repository = container.truckerRepository,
                                    tokenStore = container.tokenStore,
                                    onBack = { navController.popBackStack() },
                                )
                            }
                            composable(Routes.DEMURRAGE_LIST) {
                                DemurrageListScreen(
                                    repository = container.truckerRepository,
                                    onItemClick = { navController.navigate(Routes.demurrageDetail(it)) },
                                    onBack = { navController.popBackStack() },
                                )
                            }
                            composable(Routes.DEMURRAGE_DETAIL,
                                arguments = listOf(navArgument("id") { type = NavType.IntType }),
                            ) { entry ->
                                DemurrageDetailScreen(
                                    id = entry.arguments?.getInt("id") ?: 0,
                                    repository = container.truckerRepository,
                                    onBack = { navController.popBackStack() },
                                )
                            }
                            composable(Routes.SOA_LIST) {
                                SoaListScreen(
                                    repository = container.truckerRepository,
                                    onItemClick = { navController.navigate(Routes.soaDetail(it)) },
                                    onBack = { navController.popBackStack() },
                                )
                            }
                            composable(
                                Routes.SOA_DETAIL,
                                arguments = listOf(navArgument("id") { type = NavType.IntType }),
                            ) { entry ->
                                SoaDetailScreen(
                                    id = entry.arguments?.getInt("id") ?: 0,
                                    repository = container.truckerRepository,
                                    onBack = { navController.popBackStack() },
                                )
                            }
                            composable(Routes.REPORTS) {
                                ReportsScreen(
                                    repository = container.truckerRepository,
                                    onBack = { navController.popBackStack() },
                                )
                            }
                            composable(Routes.FAQ) {
                                FaqScreen(onBack = { navController.popBackStack() })
                            }
                            composable(Routes.PROFILE) {
                                ProfileScreen(
                                    repository = container.truckerRepository,
                                    authRepository = container.authRepository,
                                    onBack = { navController.popBackStack() },
                                    onLogout = { scope.launch { logout() } },
                                )
                            }
                            composable(Routes.NOTIFICATIONS) {
                                NotificationsScreen(
                                    repository = container.truckerRepository,
                                    onBack = { navController.popBackStack() },
                                    onUnreadCountChanged = { notificationBadge = it },
                                    onNavigate = { linkPath, category ->
                                        navigateFromNotification(linkPath, category)
                                    },
                                )
                            }
                            composable(
                                Routes.NEWS_DETAIL,
                                arguments = listOf(navArgument("id") { type = NavType.IntType }),
                            ) { entry ->
                                NewsDetailScreen(
                                    newsId = entry.arguments?.getInt("id") ?: 0,
                                    repository = container.truckerRepository,
                                    onBack = { navController.popBackStack() },
                                )
                            }
                        }
                        }
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        pendingPushNavigation = extractPushNavigation(intent)
        pendingResetToken = extractResetToken(intent)
    }

    private fun extractResetToken(intent: Intent?): String? {
        if (intent == null) return null
        intent.data?.let { uri ->
            val path = uri.path.orEmpty()
            if (path.contains("reset-password", ignoreCase = true) || !uri.getQueryParameter("token").isNullOrBlank()) {
                uri.getQueryParameter("token")?.trim()?.takeIf { it.isNotEmpty() }?.let { return it }
            }
        }
        return intent.getStringExtra("reset_token")?.trim()?.takeIf { it.isNotEmpty() }
    }

    private fun extractPushNavigation(intent: Intent?): PushNavigation? {
        if (intent == null) return null
        val linkPath = intent.getStringExtra(PushNotificationManager.EXTRA_LINK_PATH)
        val category = intent.getStringExtra(PushNotificationManager.EXTRA_CATEGORY)
        val openNotifications =
            intent.getBooleanExtra(PushNotificationManager.EXTRA_OPEN_NOTIFICATIONS, false)
        if (!openNotifications && linkPath.isNullOrBlank() && category.isNullOrBlank()) {
            return null
        }
        return PushNavigation(
            linkPath = linkPath?.takeIf { it.isNotBlank() },
            category = category?.takeIf { it.isNotBlank() },
        )
    }
}
