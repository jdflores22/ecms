package com.ecms.trucker.ui.navigation

import androidx.navigation.NavHostController

object NotificationNavigator {
    data class Target(
        val route: String,
        val tabRoute: String? = null,
    )

    private fun pathId(path: String, pattern: Regex): Int? {
        return pattern.find(path)?.groupValues?.getOrNull(1)?.toIntOrNull()
    }

    fun resolve(linkPath: String?, category: String?): Target? {
        val path = linkPath?.trim().orEmpty()
        val cat = category?.trim().orEmpty()

        pathId(path, Regex("/trucker/withdrawals/(\\d+)"))?.let {
            return Target(Routes.withdrawalDetail(it))
        }
        pathId(path, Regex("/trucker/returns/(\\d+)"))?.let {
            return Target(Routes.returnDetail(it))
        }
        pathId(path, Regex("/trucker/payments/(\\d+)"))?.let {
            return Target(Routes.paymentUpload(it))
        }
        pathId(path, Regex("/trucker/demurrage-billing/(\\d+)"))?.let {
            return Target(Routes.demurrageDetail(it))
        }
        pathId(path, Regex("/trucker/news/(\\d+)"))?.let {
            return Target(Routes.newsDetail(it))
        }
        pathId(path, Regex("/trucker/preforecast/(\\d+)"))?.let {
            return Target(Routes.preForecastDetail(it))
        }
        pathId(path, Regex("/preforecast/(\\d+)"))?.let {
            return Target(Routes.preForecastDetail(it))
        }

        when (path) {
            "/trucker/withdrawals/schedule" -> return Target(Routes.WITHDRAWAL_SCHEDULE, MainTab.Withdrawals.route)
            "/trucker/withdrawals" -> return Target(Routes.MAIN, MainTab.Withdrawals.route)
            "/trucker/demurrage-billing" -> return Target(Routes.DEMURRAGE_LIST)
            "/trucker/notifications" -> return Target(Routes.NOTIFICATIONS)
        }

        if (path.isNotBlank()) return null

        return when (cat) {
            "TruckerNews" -> {
                pathId(path, Regex("/trucker/news/(\\d+)"))?.let { Target(Routes.newsDetail(it)) }
                    ?: Target(Routes.MAIN, MainTab.Home.route)
            }
            "DepotBroadcast" -> Target(Routes.NOTIFICATIONS)
            "Withdrawal" -> Target(Routes.MAIN, MainTab.Withdrawals.route)
            "Payment", "Schedule" -> Target(Routes.MAIN, MainTab.Payments.route)
            "Evaluation", "PreAdvice" -> Target(Routes.PREFORECAST_LIST)
            "DemurrageBilling" -> Target(Routes.DEMURRAGE_LIST)
            else -> if (cat.isNotBlank()) Target(Routes.NOTIFICATIONS) else null
        }
    }

    fun navigate(
        navController: NavHostController,
        linkPath: String?,
        category: String?,
        onTabSelected: ((String) -> Unit)? = null,
    ) {
        val target = resolve(linkPath, category) ?: return
        target.tabRoute?.let { onTabSelected?.invoke(it) }
        navController.navigate(target.route) {
            launchSingleTop = true
        }
    }
}
