package com.ecms.trucker.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Article
import androidx.compose.material.icons.outlined.Campaign
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.ecms.trucker.R
import com.ecms.trucker.data.model.NotificationDto
import com.ecms.trucker.data.repository.TruckerRepository
import com.ecms.trucker.ui.theme.IcsColors
import com.ecms.trucker.ui.theme.icsHexAlpha
import com.ecms.trucker.ui.util.formatRelativeTime
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private const val DEPOT_BROADCAST_CATEGORY = "DepotBroadcast"
private const val TRUCKER_NEWS_CATEGORY = "TruckerNews"

private fun isInAppAlert(notification: NotificationDto): Boolean {
    return notification.category.equals(DEPOT_BROADCAST_CATEGORY, ignoreCase = true)
        || notification.category.equals(TRUCKER_NEWS_CATEGORY, ignoreCase = true)
}

private fun newsIdFromLink(linkPath: String?): Int? {
    val path = linkPath?.trim().orEmpty()
    val match = Regex("/trucker/news/(\\d+)").find(path) ?: return null
    return match.groupValues[1].toIntOrNull()
}

@Composable
fun TruckerBroadcastModal(
    repository: TruckerRepository,
    onOpenNews: (Int) -> Unit = {},
) {
    var active by remember { mutableStateOf<NotificationDto?>(null) }
    var dismissing by remember { mutableStateOf(false) }
    val presented = remember { mutableStateListOf<Int>() }
    val scope = rememberCoroutineScope()

    fun pickNext(items: List<NotificationDto>): NotificationDto? {
        return items
            .filter { isInAppAlert(it) && !it.isRead && it.id !in presented }
            .maxByOrNull { it.createdAt }
    }

    suspend fun poll() {
        if (active != null) return
        runCatching {
            val page = repository.getNotifications(page = 1, pageSize = 50, unreadOnly = true)
            val next = pickNext(page.items)
            if (next != null) {
                presented.add(next.id)
                active = next
            }
        }
    }

    LaunchedEffect(Unit) {
        poll()
        while (true) {
            delay(20_000)
            poll()
        }
    }

    fun dismissCurrent() {
        val current = active ?: return
        if (dismissing) return
        scope.launch {
            dismissing = true
            val dismissedId = current.id
            runCatching { repository.markNotificationRead(dismissedId) }
            runCatching {
                val page = repository.getNotifications(page = 1, pageSize = 50, unreadOnly = true)
                val remaining = page.items.filter { it.id != dismissedId }
                active = pickNext(remaining)
            }.onFailure { active = null }
            dismissing = false
        }
    }

    val alert = active ?: return
    val isNews = alert.category.equals(TRUCKER_NEWS_CATEGORY, ignoreCase = true)
    val newsId = if (isNews) newsIdFromLink(alert.linkPath) else null

    Dialog(
        onDismissRequest = { dismissCurrent() },
        properties = DialogProperties(dismissOnBackPress = true, dismissOnClickOutside = true),
    ) {
        Surface(
            shape = MaterialTheme.shapes.extraLarge,
            tonalElevation = 6.dp,
            color = MaterialTheme.colorScheme.surface,
        ) {
            Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 20.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Surface(
                        shape = MaterialTheme.shapes.medium,
                        color = icsHexAlpha(IcsColors.Primary, 0.1f),
                    ) {
                        Icon(
                            if (isNews) Icons.Outlined.Article else Icons.Outlined.Campaign,
                            contentDescription = null,
                            tint = IcsColors.Primary,
                            modifier = Modifier.padding(10.dp),
                        )
                    }
                    Column {
                        Text(
                            if (isNews) {
                                stringResource(R.string.home_news_feed)
                            } else {
                                stringResource(R.string.notifications_title)
                            },
                            style = MaterialTheme.typography.labelSmall,
                            color = IcsColors.TextSecondary,
                        )
                        Text(
                            alert.title,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }

                Spacer(Modifier.height(16.dp))
                HorizontalDivider()
                Spacer(Modifier.height(16.dp))

                Text(
                    alert.message,
                    style = MaterialTheme.typography.bodyMedium,
                    color = IcsColors.TextSecondary,
                )
                Spacer(Modifier.height(12.dp))
                Text(
                    formatRelativeTime(alert.createdAt),
                    style = MaterialTheme.typography.labelSmall,
                    color = IcsColors.TextSecondary.copy(alpha = 0.7f),
                )

                Spacer(Modifier.height(20.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (isNews && newsId != null) {
                        TextButton(
                            onClick = {
                                dismissCurrent()
                                onOpenNews(newsId)
                            },
                            enabled = !dismissing,
                        ) {
                            Text(stringResource(R.string.news_modal_read_story))
                        }
                        Spacer(Modifier.width(8.dp))
                    }
                    Button(
                        onClick = { dismissCurrent() },
                        enabled = !dismissing,
                        colors = ButtonDefaults.buttonColors(containerColor = IcsColors.Primary),
                    ) {
                        Text(
                            if (dismissing) {
                                stringResource(R.string.broadcast_modal_closing)
                            } else {
                                stringResource(R.string.broadcast_modal_got_it)
                            },
                        )
                    }
                }
            }
        }
    }
}
