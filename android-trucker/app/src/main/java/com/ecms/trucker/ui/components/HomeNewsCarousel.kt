package com.ecms.trucker.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.ecms.trucker.R
import com.ecms.trucker.data.model.TruckerNewsFeedItemDto
import com.ecms.trucker.ui.theme.IcsColors
import com.ecms.trucker.ui.util.buildAuthedImageRequest

private val StoryCardWidth = 134.dp
private val StoryCardHeight = 210.dp
private val ImageDimAlpha = 0.28f

@Composable
fun HomeNewsCarousel(
    items: List<TruckerNewsFeedItemDto>,
    accessToken: String?,
    onItemClick: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (items.isEmpty()) return

    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = stringResource(R.string.home_news_feed),
                style = MaterialTheme.typography.titleSmall,
                color = IcsColors.Primary,
                fontWeight = FontWeight.SemiBold,
            )
            if (items.size > 1) {
                Text(
                    text = stringResource(R.string.home_news_count, items.size),
                    style = MaterialTheme.typography.labelSmall,
                    color = IcsColors.TextSecondary,
                )
            }
        }

        LazyRow(
            modifier = Modifier
                .fillMaxWidth()
                .height(StoryCardHeight),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(horizontal = 4.dp),
        ) {
            items(items, key = { it.id }) { item ->
                HomeNewsStoryCard(
                    item = item,
                    accessToken = accessToken,
                    onClick = { onItemClick(item.id) },
                )
            }
        }
    }
}

@Composable
private fun HomeNewsStoryCard(
    item: TruckerNewsFeedItemDto,
    accessToken: String?,
    onClick: () -> Unit,
) {
    val context = LocalContext.current
    val shape = MaterialTheme.shapes.extraLarge

    Box(
        modifier = Modifier
            .width(StoryCardWidth)
            .height(StoryCardHeight)
            .clip(shape)
            .clickable(onClick = onClick),
    ) {
        if (!item.imagePath.isNullOrBlank()) {
            AsyncImage(
                model = buildAuthedImageRequest(context, item.imagePath, accessToken),
                contentDescription = item.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
            )
        } else {
            Box(
                Modifier
                    .fillMaxSize()
                    .background(IcsColors.Primary.copy(alpha = 0.18f)),
            )
        }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = ImageDimAlpha)),
        )

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.82f)),
                    ),
                )
                .padding(horizontal = 10.dp, vertical = 12.dp),
        ) {
            Text(
                text = item.title,
                style = MaterialTheme.typography.labelMedium,
                color = Color.White,
                fontWeight = FontWeight.SemiBold,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}
