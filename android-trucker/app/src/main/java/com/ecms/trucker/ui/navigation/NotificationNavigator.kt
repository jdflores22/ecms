package com.ecms.trucker.ui.navigation

import androidx.navigation.NavHostController

object NotificationNavigator {
    fun navigate(
        navController: NavHostController,
        linkPath: String?,
        category: String?,
    ) {
        val path = linkPath?.trim().orEmpty()
        when {
            path.matches(Regex("/trucker/withdrawals/\\d+")) -> {
                val id = path.substringAfterLast('/').toIntOrNull()
                if (id != null) navController.navigate(Routes.withdrawalDetail(id))
            }
            path.matches(Regex("/trucker/returns/\\d+")) -> {
                val id = path.substringAfterLast('/').toIntOrNull()
                if (id != null) navController.navigate(Routes.returnDetail(id))
            }
            path.matches(Regex("/trucker/payments/\\d+")) -> {
                val id = path.substringAfterLast('/').toIntOrNull()
                if (id != null) navController.navigate(Routes.paymentUpload(id))
            }
            path.matches(Regex("/trucker/demurrage-billing/\\d+")) -> {
                val id = path.substringAfterLast('/').toIntOrNull()
                if (id != null) navController.navigate(Routes.demurrageDetail(id))
            }
            path == "/trucker/withdrawals/schedule" -> navController.navigate(Routes.WITHDRAWAL_SCHEDULE)
            path == "/trucker/withdrawals" -> navController.navigate(Routes.MAIN)
            path == "/trucker/notifications" || category == "DepotBroadcast" -> {
                navController.navigate(Routes.NOTIFICATIONS)
            }
            path.isNotBlank() -> navController.navigate(Routes.NOTIFICATIONS)
            category == "DepotBroadcast" -> navController.navigate(Routes.NOTIFICATIONS)
            else -> navController.navigate(Routes.NOTIFICATIONS)
        }
    }
}
