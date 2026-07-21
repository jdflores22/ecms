package com.ecms.trucker.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ecms.trucker.R
import com.ecms.trucker.data.model.WithdrawalLineDto
import com.ecms.trucker.ui.theme.IcsColors
import com.ecms.trucker.ui.theme.icsHexAlpha

private val withdrawalSteps = listOf(
    "Draft" to R.string.status_draft,
    "Issued" to R.string.status_issued,
    "Submitted" to R.string.status_submitted,
    "UnderReview" to R.string.status_under_review,
    "Approved" to R.string.status_approved,
    "Released" to R.string.status_released,
)

private fun withdrawalStepIndex(status: String): Int {
    if (status.equals("Completed", true)) return withdrawalSteps.size
    if (status.equals("Rejected", true) || status.equals("Cancelled", true)) return -1
    return withdrawalSteps.indexOfFirst { it.first.equals(status, true) }.coerceAtLeast(0)
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun WithdrawalStatusTimeline(
    status: String,
    issuedByShippingLine: Boolean = status.equals("Issued", true) ||
        (status.equals("CyAssigned", true)),
    modifier: Modifier = Modifier,
) {
    val current = withdrawalStepIndex(status)
    val terminal = status.equals("Rejected", true) || status.equals("Cancelled", true)

    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            buildString {
                append(stringResource(R.string.timeline_status))
                if (issuedByShippingLine) append(" · ${stringResource(R.string.timeline_prefilled_shipping_line)}")
            },
            style = MaterialTheme.typography.labelSmall,
            color = IcsColors.TextSecondary,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(bottom = 8.dp),
        )
        if (terminal) {
            StatusChip(status)
        } else {
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                withdrawalSteps.forEachIndexed { index, (_, labelRes) ->
                    TimelineChip(stringResource(labelRes), index < current, index == current)
                }
                if (status.equals("Completed", true)) {
                    TimelineChip(stringResource(R.string.status_completed), done = true, active = false)
                }
            }
        }
    }
}

@Composable
private fun TimelineChip(label: String, done: Boolean, active: Boolean) {
    val (bg, fg, border) = when {
        active -> Triple(IcsColors.Primary, Color.White, IcsColors.Primary)
        done -> Triple(icsHexAlpha(IcsColors.Success, 0.12f), IcsColors.Success, icsHexAlpha(IcsColors.Success, 0.35f))
        else -> Triple(IcsColors.Surface, IcsColors.TextSecondary, IcsColors.Divider)
    }
    Surface(
        color = bg,
        shape = RoundedCornerShape(99.dp),
        border = BorderStroke(1.dp, border),
    ) {
        Text(
            label,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
            style = MaterialTheme.typography.labelSmall,
            color = fg,
            fontWeight = if (active || done) FontWeight.SemiBold else FontWeight.Normal,
        )
    }
}

@Composable
fun IcsInfoTile(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = IcsColors.SurfaceMuted,
    ) {
        Column(Modifier.padding(horizontal = 12.dp, vertical = 10.dp)) {
            Text(
                label.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = IcsColors.TextSecondary,
            )
            Text(
                value,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.SemiBold,
                color = IcsColors.OnSurface,
                modifier = Modifier.padding(top = 3.dp),
            )
        }
    }
}

@Composable
fun IcsInfoTileGrid(
    tiles: List<Pair<String, String>>,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        tiles.chunked(2).forEach { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { (label, value) ->
                    IcsInfoTile(label, value, Modifier.weight(1f))
                }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
    }
}

@Composable
fun IcsDetailHeader(
    referenceNo: String,
    status: String,
    modifier: Modifier = Modifier,
    belowStatus: @Composable (() -> Unit)? = null,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = icsHexAlpha(IcsColors.Primary, 0.06f),
        border = BorderStroke(1.dp, icsHexAlpha(IcsColors.Primary, 0.15f)),
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(
                stringResource(R.string.field_reference).uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = IcsColors.TextSecondary,
            )
            Spacer(Modifier.height(2.dp))
            Text(
                referenceNo,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = IcsColors.Primary,
            )
            Spacer(Modifier.height(10.dp))
            StatusChip(status)
            belowStatus?.let {
                Spacer(Modifier.height(14.dp))
                it()
            }
        }
    }
}

@Composable
fun IcsContainerLinesSection(
    lines: List<WithdrawalLineDto>,
    summary: String,
    modifier: Modifier = Modifier,
) {
    if (lines.isEmpty()) return
    IcsSectionCard(title = stringResource(R.string.section_container_lines), modifier = modifier) {
        if (summary.isNotBlank()) {
            Text(summary, style = MaterialTheme.typography.bodySmall, color = IcsColors.TextSecondary)
            Spacer(Modifier.height(8.dp))
        }
        lines.forEachIndexed { index, line ->
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    "${line.lineNo}. ${line.containerNo}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    "${line.containerSize}/${line.containerType}",
                    style = MaterialTheme.typography.bodySmall,
                    color = IcsColors.TextSecondary,
                )
            }
            if (line.lineStatus.isNotBlank()) {
                Spacer(Modifier.height(4.dp))
                StatusChip(line.lineStatus)
            }
            if (index < lines.lastIndex) {
                HorizontalDivider(Modifier.padding(vertical = 8.dp), color = IcsColors.Divider)
            }
        }
    }
}

@Composable
fun IcsDetailScaffoldContent(
    modifier: Modifier = Modifier,
    content: LazyListScope.() -> Unit,
) {
    LazyColumn(
        modifier = modifier.fillMaxSize().padding(horizontal = 16.dp),
        contentPadding = PaddingValues(vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        content = content,
    )
}
