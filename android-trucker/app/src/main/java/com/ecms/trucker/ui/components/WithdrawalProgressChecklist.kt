package com.ecms.trucker.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.outlined.RadioButtonUnchecked
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ecms.trucker.R
import com.ecms.trucker.ui.theme.IcsColors

data class WithdrawalProgressItem(
    val key: String,
    val label: String,
    val done: Boolean,
)

@Composable
fun WithdrawalProgressChecklist(
    items: List<WithdrawalProgressItem>,
    modifier: Modifier = Modifier,
) {
    val doneCount = items.count { it.done }
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        color = IcsColors.Surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, IcsColors.Divider),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(
                stringResource(R.string.withdrawal_wizard_progress, doneCount, items.size),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
            )
            items.forEach { item ->
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Icon(
                        imageVector = if (item.done) Icons.Default.CheckCircle else Icons.Outlined.RadioButtonUnchecked,
                        contentDescription = null,
                        tint = if (item.done) IcsColors.Success else IcsColors.TextSecondary,
                        modifier = Modifier.size(18.dp),
                    )
                    Text(
                        item.label,
                        style = MaterialTheme.typography.bodySmall,
                        color = if (item.done) MaterialTheme.colorScheme.onSurface else IcsColors.TextSecondary,
                    )
                }
            }
        }
    }
}
