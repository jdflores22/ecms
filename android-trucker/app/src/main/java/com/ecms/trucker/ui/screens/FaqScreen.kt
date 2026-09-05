package com.ecms.trucker.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.ecms.trucker.R
import com.ecms.trucker.data.TruckerFaqData
import com.ecms.trucker.ui.components.IcsScreenScaffold
import com.ecms.trucker.ui.theme.IcsColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FaqScreen(onBack: () -> Unit) {
    var query by remember { mutableStateOf("") }
    var useTagalog by remember { mutableStateOf(false) }
    val normalizedQuery = query.trim().lowercase()

    val filtered = remember(normalizedQuery, useTagalog) {
        TruckerFaqData.categories.mapNotNull { category ->
            val title = if (useTagalog) category.titleTl else category.titleEn
            val items = category.items.filter { item ->
                if (normalizedQuery.isBlank()) return@filter true
                val q = if (useTagalog) item.questionTl else item.questionEn
                val a = if (useTagalog) item.answerTl else item.answerEn
                q.lowercase().contains(normalizedQuery) || a.lowercase().contains(normalizedQuery)
            }
            if (items.isEmpty()) null else category.copy(items = items)
        }
    }

    IcsScreenScaffold(
        title = stringResource(R.string.faq_title),
        onBack = onBack,
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            contentPadding = PaddingValues(vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text(stringResource(R.string.faq_search_hint)) },
                    singleLine = true,
                )
            }
            item {
                Surface(
                    onClick = { useTagalog = !useTagalog },
                    shape = MaterialTheme.shapes.medium,
                    color = IcsColors.Primary.copy(alpha = 0.08f),
                ) {
                    Text(
                        if (useTagalog) stringResource(R.string.faq_language_tl) else stringResource(R.string.faq_language_en),
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        color = IcsColors.Primary,
                        style = MaterialTheme.typography.labelLarge,
                    )
                }
            }
            if (filtered.isEmpty()) {
                item {
                    Text(stringResource(R.string.faq_no_results), color = IcsColors.TextSecondary)
                }
            } else {
                filtered.forEach { category ->
                    item(key = "cat-${category.id}") {
                        Text(
                            if (useTagalog) category.titleTl else category.titleEn,
                            style = MaterialTheme.typography.titleMedium,
                            modifier = Modifier.padding(top = 8.dp),
                        )
                    }
                    items(category.items, key = { it.id }) { item ->
                        FaqItemCard(item = item, useTagalog = useTagalog)
                    }
                }
            }
        }
    }
}

@Composable
private fun FaqItemCard(
    item: com.ecms.trucker.data.TruckerFaqItem,
    useTagalog: Boolean,
) {
    var expanded by remember(item.id) { mutableStateOf(false) }
    Surface(
        shape = MaterialTheme.shapes.medium,
        color = IcsColors.Surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, IcsColors.Divider),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(12.dp)) {
            androidx.compose.foundation.layout.Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    if (useTagalog) item.questionTl else item.questionEn,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.weight(1f),
                )
                IconButton(onClick = { expanded = !expanded }) {
                    Icon(
                        if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = null,
                    )
                }
            }
            if (expanded) {
                Text(
                    if (useTagalog) item.answerTl else item.answerEn,
                    style = MaterialTheme.typography.bodySmall,
                    color = IcsColors.TextSecondary,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
        }
    }
}
