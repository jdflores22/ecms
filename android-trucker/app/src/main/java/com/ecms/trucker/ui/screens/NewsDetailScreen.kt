package com.ecms.trucker.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.ecms.trucker.EcmsTruckerApp
import com.ecms.trucker.R
import com.ecms.trucker.data.local.AuthState
import com.ecms.trucker.data.model.TruckerNewsDetailDto
import com.ecms.trucker.data.repository.TruckerRepository
import com.ecms.trucker.ui.components.*
import com.ecms.trucker.ui.theme.IcsColors
import com.ecms.trucker.ui.util.buildAuthedImageRequest
import com.ecms.trucker.ui.util.formatRelativeTime
import com.ecms.trucker.ui.util.rememberScreenLoadState
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NewsDetailScreen(
    newsId: Int,
    repository: TruckerRepository,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val app = context.applicationContext as EcmsTruckerApp
    val authState by app.container.tokenStore.authState.collectAsState(initial = AuthState())
    val accessToken = authState.accessToken

    val loadState = rememberScreenLoadState(initiallyLoading = true)
    var item by remember { mutableStateOf<TruckerNewsDetailDto?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun load() {
        scope.launch {
            loadState.begin(item != null)
            error = null
            runCatching { item = repository.getNewsDetail(newsId) }
                .onFailure { error = it.message }
            loadState.end()
        }
    }

    LaunchedEffect(newsId) { load() }

    IcsScreenScaffold(
        title = stringResource(R.string.news_detail_title),
        onBack = onBack,
        refreshing = loadState.refreshing,
        onRefresh = { load() },
    ) { padding ->
        when {
            loadState.loading && item == null -> LoadingBox(Modifier.padding(padding))
            error != null && item == null -> ErrorMessage(error!!, { load() }, Modifier.padding(padding))
            item != null -> {
                val news = item!!
                Column(
                    Modifier
                        .padding(padding)
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    if (!news.imagePath.isNullOrBlank()) {
                        AsyncImage(
                            model = buildAuthedImageRequest(context, news.imagePath, accessToken),
                            contentDescription = news.title,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(220.dp)
                                .clip(MaterialTheme.shapes.large),
                        )
                    }
                    Text(
                        news.title,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = IcsColors.Primary,
                    )
                    Text(
                        stringResource(
                            R.string.news_detail_meta,
                            news.createdByName,
                            formatRelativeTime(news.publishedAt ?: news.createdAt),
                        ),
                        style = MaterialTheme.typography.labelMedium,
                        color = IcsColors.TextSecondary,
                    )
                    Text(
                        news.body,
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                }
            }
        }
    }
}
