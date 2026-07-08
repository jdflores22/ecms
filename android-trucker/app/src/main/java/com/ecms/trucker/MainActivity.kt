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
import com.ecms.trucker.ui.screens.auth.SignUpScreen
import com.ecms.trucker.ui.theme.EcmsTruckerTheme
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private data class PushNavigation(
    val linkPath: String?,
    val category: String?,
)

class MainActivity : ComponentActivity() {

    private var pendingPushNavigation by mutableStateOf<PushNavigation?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val container = (application as EcmsTruckerApp).container
        pendingPushNavigation = extractPushNavigation(intent)

        setContent {
            EcmsTruckerTheme {
                val context = LocalContext.current
                val authState by container.authRepository.authState.collectAsState(initial = AuthState())
                val scope = rememberCoroutineScope()
                var paymentBadge by remember { mutableIntStateOf(0) }
                var withdrawalBadge by remember { mutableIntStateOf(0) }
                var notificationBadge by remember { mutableIntStateOf(0) }
                var pushNavigation by remember { mutableStateOf(pendingPushNavigation) }

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
                }

                suspend fun refreshBadges() {
                    runCatching {
                        val d = container.truckerRepository.getDashboard()
                        paymentBadge = d.pendingPayments
                        withdrawalBadge = d.issuedWithdrawalsAwaitingUpload
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
                        while (true) {
                            delay(30_000)
                            refreshBadges()
                        }
                    } else {
                        paymentBadge = 0
                        withdrawalBadge = 0
                        notificationBadge = 0
                    }
                }

                LaunchedEffect(pendingPushNavigation) {
                    pushNavigation = pendingPushNavigation
                }

                key(authState.isLoggedIn) {
                    val navController = rememberNavController()

                    LaunchedEffect(authState.isLoggedIn, pushNavigation) {
                        val target = pushNavigation ?: return@LaunchedEffect
                        if (!authState.isLoggedIn) return@LaunchedEffect
                        NotificationNavigator.navigate(navController, target.linkPath, target.category)
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
                                )
                            }
                            composable(Routes.SIGNUP) {
                                SignUpScreen(
                                    authRepository = container.authRepository,
                                    onSignedUp = {},
                                    onBack = { navController.popBackStack() },
                                )
                            }
                            composable(Routes.FORGOT_PASSWORD) {
                                ForgotPasswordScreen(
                                    authRepository = container.authRepository,
                                    onBack = { navController.popBackStack() },
                                )
                            }
                        }
                    } else {
                        TruckerBroadcastModal(
                            repository = container.truckerRepository,
                            onOpenNews = { id -> navController.navigate(Routes.newsDetail(id)) },
                        )

                        var selectedTabRoute by rememberSaveable { mutableStateOf(MainTab.Home.route) }

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
                                                onNavigate = { navController.navigate(it) },
                                                onLogout = { scope.launch { logout() } },
                                            )
                                        }
                                    }
                                }
                            }

                            composable(Routes.PREFORECAST_LIST) {
                                PreForecastListScreen(
                                    repository = container.truckerRepository,
                                    onItemClick = { navController.navigate(Routes.preForecastDetail(it)) },
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
                                arguments = listOf(navArgument("id") { type = NavType.IntType }),
                            ) { entry ->
                                PreForecastDetailScreen(
                                    id = entry.arguments?.getInt("id") ?: 0,
                                    repository = container.truckerRepository,
                                    onBack = { navController.popBackStack() },
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
                                WithdrawalNewScreen(
                                    repository = container.truckerRepository,
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
                            composable(
                                Routes.DEMURRAGE_DETAIL,
                                arguments = listOf(navArgument("id") { type = NavType.IntType }),
                            ) { entry ->
                                DemurrageDetailScreen(
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
            category = category?.takeIf { it.isNotBlank() }
                ?: if (openNotifications) "DepotBroadcast" else null,
        )
    }
}
