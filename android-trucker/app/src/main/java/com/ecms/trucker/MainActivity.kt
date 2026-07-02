package com.ecms.trucker

import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.ecms.trucker.data.local.AuthState
import com.ecms.trucker.ui.navigation.MainBottomBar
import com.ecms.trucker.ui.navigation.MainTab
import com.ecms.trucker.ui.navigation.Routes
import com.ecms.trucker.ui.screens.*
import com.ecms.trucker.ui.screens.auth.ForgotPasswordScreen
import com.ecms.trucker.ui.screens.auth.LoginScreen
import com.ecms.trucker.ui.screens.auth.SignUpScreen
import com.ecms.trucker.ui.theme.EcmsTruckerTheme
import kotlinx.coroutines.async
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val container = (application as EcmsTruckerApp).container

        setContent {
            EcmsTruckerTheme {
                val authState by container.authRepository.authState.collectAsState(initial = AuthState())
                val scope = rememberCoroutineScope()
                var paymentBadge by remember { mutableIntStateOf(0) }
                var withdrawalBadge by remember { mutableIntStateOf(0) }

                LaunchedEffect(Unit) {
                    container.tokenStore.repairCorruptSession()
                }

                LaunchedEffect(authState.isLoggedIn) {
                    if (authState.isLoggedIn) {
                        val paymentDeferred = async {
                            runCatching { container.truckerRepository.getPaymentDueCount() }
                                .onFailure { Log.w("MainActivity", "Payment badge load failed", it) }
                                .getOrNull()
                        }
                        val withdrawalDeferred = async {
                            runCatching { container.truckerRepository.getWithdrawalPendingActionCount() }
                                .onFailure { Log.w("MainActivity", "Withdrawal badge load failed", it) }
                                .getOrNull()
                        }
                        paymentBadge = paymentDeferred.await() ?: paymentBadge
                        withdrawalBadge = withdrawalDeferred.await() ?: withdrawalBadge
                    } else {
                        paymentBadge = 0
                        withdrawalBadge = 0
                    }
                }

                key(authState.isLoggedIn) {
                    val navController = rememberNavController()

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
                        NavHost(navController = navController, startDestination = Routes.MAIN) {
                            composable(Routes.MAIN) {
                                val tabNav = rememberNavController()
                                val backStack by tabNav.currentBackStackEntryAsState()
                                val currentRoute = backStack?.destination?.route ?: MainTab.Home.route

                                Scaffold(
                                    containerColor = com.ecms.trucker.ui.theme.IcsColors.Background,
                                    contentWindowInsets = androidx.compose.foundation.layout.WindowInsets(0, 0, 0, 0),
                                    bottomBar = {
                                        if (MainTab.tabs.any { it.route == currentRoute }) {
                                            MainBottomBar(
                                                currentRoute = currentRoute,
                                                onTabSelected = { tab ->
                                                    tabNav.navigate(tab.route) {
                                                        popUpTo(tabNav.graph.startDestinationId) {
                                                            saveState = true
                                                        }
                                                        launchSingleTop = true
                                                        restoreState = true
                                                    }
                                                },
                                                paymentBadge = paymentBadge,
                                                withdrawalBadge = withdrawalBadge,
                                            )
                                        }
                                    },
                                ) { padding ->
                                    NavHost(
                                        navController = tabNav,
                                        startDestination = MainTab.Home.route,
                                        modifier = Modifier.padding(padding),
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
                                                onNavigate = { route ->
                                                    when (route) {
                                                        "returns" -> tabNav.navigate(MainTab.Returns.route)
                                                        "payments" -> tabNav.navigate(MainTab.Payments.route)
                                                        else -> navController.navigate(route)
                                                    }
                                                },
                                            )
                                        }
                                        composable(MainTab.Returns.route) {
                                            ReturnsListScreen(
                                                repository = container.truckerRepository,
                                                onOpenNotifications = { navController.navigate(Routes.NOTIFICATIONS) },
                                                onItemClick = { navController.navigate(Routes.returnDetail(it)) },
                                            )
                                        }
                                        composable(MainTab.Withdrawals.route) {
                                            WithdrawalsListScreen(
                                                repository = container.truckerRepository,
                                                onOpenNotifications = { navController.navigate(Routes.NOTIFICATIONS) },
                                                onItemClick = { navController.navigate(Routes.withdrawalDetail(it)) },
                                                onNewClick = { navController.navigate(Routes.WITHDRAWAL_NEW) },
                                            )
                                        }
                                        composable(MainTab.Payments.route) {
                                            PaymentsListScreen(
                                                repository = container.truckerRepository,
                                                onOpenNotifications = { navController.navigate(Routes.NOTIFICATIONS) },
                                                onUploadClick = { navController.navigate(Routes.paymentUpload(it)) },
                                            )
                                        }
                                        composable(MainTab.Menu.route) {
                                            MenuScreen(
                                                repository = container.truckerRepository,
                                                onOpenNotifications = { navController.navigate(Routes.NOTIFICATIONS) },
                                                onNavigate = { navController.navigate(it) },
                                                onLogout = {
                                                    scope.launch { container.authRepository.logout() }
                                                },
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
                            composable(
                                Routes.WITHDRAWAL_DETAIL,
                                arguments = listOf(navArgument("id") { type = NavType.IntType }),
                            ) { entry ->
                                WithdrawalDetailScreen(
                                    id = entry.arguments?.getInt("id") ?: 0,
                                    repository = container.truckerRepository,
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
                                    onLogout = {
                                        scope.launch { container.authRepository.logout() }
                                    },
                                )
                            }
                            composable(Routes.NOTIFICATIONS) {
                                NotificationsScreen(
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
