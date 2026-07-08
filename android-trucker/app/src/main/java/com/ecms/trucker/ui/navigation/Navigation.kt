@file:OptIn(ExperimentalMaterial3Api::class)

package com.ecms.trucker.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Assignment
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.*
import androidx.compose.foundation.layout.WindowInsets
import androidx.annotation.StringRes
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.ecms.trucker.R
import com.ecms.trucker.ui.theme.IcsColors

sealed class MainTab(
    val route: String,
    @StringRes val labelRes: Int,
    val icon: ImageVector,
) {
    data object Home : MainTab("home", R.string.home_title, Icons.Default.Home)
    data object Returns : MainTab("returns", R.string.returns_title, Icons.Default.LocalShipping)
    data object Withdrawals : MainTab("withdrawals", R.string.withdrawals_title, Icons.AutoMirrored.Filled.Assignment)
    data object Payments : MainTab("payments", R.string.payments_title, Icons.Default.AttachMoney)
    data object Menu : MainTab("menu", R.string.more_title, Icons.Default.Menu)

    companion object {
        val tabs by lazy { listOf(Home, Returns, Withdrawals, Payments, Menu) }
    }
}

object Routes {
    const val LOGIN = "login"
    const val SIGNUP = "signup"
    const val FORGOT_PASSWORD = "forgot_password"
    const val MAIN = "main"
    const val PREFORECAST_LIST = "preforecast"
    const val PREFORECAST_DETAIL = "preforecast/{id}"
    const val PREFORECAST_NEW = "preforecast/new"
    const val RETURN_DETAIL = "returns/{id}"
    const val PAYMENT_UPLOAD = "payments/upload/{scheduleId}"
    const val QR_LIST = "qr"
    const val QR_DETAIL = "qr/{bookingId}"
    const val WITHDRAWAL_DETAIL = "withdrawals/{id}"
    const val WITHDRAWAL_NEW = "withdrawals/new"
    const val WITHDRAWAL_SCHEDULE = "withdrawals/schedule"
    const val DEMURRAGE_LIST = "demurrage"
    const val DEMURRAGE_DETAIL = "demurrage/{id}"
    const val REPORTS = "reports"
    const val PROFILE = "profile"
    const val NOTIFICATIONS = "notifications"
    const val NEWS_DETAIL = "news/{id}"

    fun preForecastDetail(id: Int) = "preforecast/$id"
    fun returnDetail(id: Int) = "returns/$id"
    fun paymentUpload(scheduleId: Int) = "payments/upload/$scheduleId"
    fun qrDetail(bookingId: Int) = "qr/$bookingId"
    fun withdrawalDetail(id: Int) = "withdrawals/$id"
    fun demurrageDetail(id: Int) = "demurrage/$id"
    fun newsDetail(id: Int) = "news/$id"
}

@Composable
fun MainBottomBar(
    currentRoute: String,
    onTabSelected: (MainTab) -> Unit,
    paymentBadge: Int = 0,
    withdrawalBadge: Int = 0,
) {
    NavigationBar(
        containerColor = IcsColors.Surface,
        tonalElevation = 3.dp,
        windowInsets = WindowInsets(0, 0, 0, 0),
    ) {
        MainTab.tabs.forEach { tab ->
            val tabLabel = stringResource(tab.labelRes)
            val badge = when (tab) {
                MainTab.Payments -> paymentBadge
                MainTab.Withdrawals -> withdrawalBadge
                else -> 0
            }
            NavigationBarItem(
                selected = currentRoute == tab.route,
                onClick = { onTabSelected(tab) },
                alwaysShowLabel = true,
                icon = {
                    if (badge > 0) {
                        BadgedBox(
                            badge = {
                                Badge(
                                    containerColor = IcsColors.Error,
                                    contentColor = Color.White,
                                ) {
                                    Text(if (badge > 99) "99+" else "$badge")
                                }
                            },
                        ) {
                            Icon(tab.icon, contentDescription = tabLabel)
                        }
                    } else {
                        Icon(tab.icon, contentDescription = tabLabel)
                    }
                },
                label = {
                    Text(
                        tabLabel,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        style = MaterialTheme.typography.labelSmall,
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = IcsColors.Primary,
                    selectedTextColor = IcsColors.Primary,
                    unselectedIconColor = IcsColors.TextSecondary,
                    unselectedTextColor = IcsColors.TextSecondary,
                    indicatorColor = IcsColors.Primary.copy(alpha = 0.12f),
                ),
            )
        }
    }
}
