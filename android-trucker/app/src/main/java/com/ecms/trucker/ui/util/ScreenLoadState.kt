package com.ecms.trucker.ui.util

import androidx.compose.runtime.Composable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue

@Stable
class ScreenLoadState(initialLoading: Boolean) {
    var loading by mutableStateOf(initialLoading)
    var refreshing by mutableStateOf(false)

    fun begin(hasContent: Boolean) {
        if (hasContent) {
            refreshing = true
        } else {
            loading = true
        }
    }

    fun end() {
        loading = false
        refreshing = false
    }
}

@Composable
fun rememberScreenLoadState(initiallyLoading: Boolean): ScreenLoadState =
    remember { ScreenLoadState(initiallyLoading) }
