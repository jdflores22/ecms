package com.ecms.trucker.ui.util

import com.ecms.trucker.ui.screens.clearDashboardScreenCache
import com.ecms.trucker.ui.screens.clearPaymentsScreenCache
import com.ecms.trucker.ui.screens.clearPreForecastScreenCache
import com.ecms.trucker.ui.screens.clearQrScreenCache
import com.ecms.trucker.ui.screens.clearReturnsScreenCache
import com.ecms.trucker.ui.screens.clearWithdrawalsScreenCache

/**
 * Clears every in-memory, process-global screen cache. These caches live for the lifetime of the
 * process (not tied to a session), so they must be wiped on logout to prevent one trucker's data
 * from leaking into the next signed-in user's screens before a refresh occurs.
 */
fun clearAllTruckerScreenCaches() {
    clearDashboardScreenCache()
    clearReturnsScreenCache()
    clearWithdrawalsScreenCache()
    clearPaymentsScreenCache()
    clearPreForecastScreenCache()
    clearQrScreenCache()
}
