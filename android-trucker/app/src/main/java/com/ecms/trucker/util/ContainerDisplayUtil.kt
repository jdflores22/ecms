package com.ecms.trucker.util

import com.ecms.trucker.data.model.PreAdviceDto
import com.ecms.trucker.data.model.ScheduleDto
import com.ecms.trucker.data.model.WithdrawalDto
import com.ecms.trucker.data.repository.TruckerRepository

fun primaryContainerLabel(containerNo: String?, fallback: String): String =
    containerNo?.trim()?.takeIf { it.isNotBlank() } ?: fallback

fun referenceWithMeta(referenceNo: String, meta: String? = null): String =
    if (meta.isNullOrBlank()) referenceNo else "$referenceNo · $meta"

suspend fun TruckerRepository.preAdviceContainerById(): Map<Int, String> =
    runCatching { listPreAdvices().associate { it.id to it.containerNo } }.getOrDefault(emptyMap())

fun ScheduleDto.containerHeadline(containerByPreAdviceId: Map<Int, String>): String =
    primaryContainerLabel(containerByPreAdviceId[preAdviceId], referenceNo)

fun ScheduleDto.containerListSubtitle(
    containerByPreAdviceId: Map<Int, String>,
    extra: String,
): String {
    val container = containerByPreAdviceId[preAdviceId]
    return if (!container.isNullOrBlank()) {
        referenceWithMeta(referenceNo, extra)
    } else {
        extra
    }
}

fun PreAdviceDto.listTitle(): String = containerNo

fun PreAdviceDto.listSubtitle(): String = referenceWithMeta(referenceNo, shippingLineName)

fun withdrawalListHeadline(w: WithdrawalDto): String =
    w.lines.firstOrNull()?.containerNo?.takeIf { it.isNotBlank() }
        ?: w.containerSummary.takeIf { it.isNotBlank() && it != "—" }
        ?: w.referenceNo

fun withdrawalListSubtitle(w: WithdrawalDto): String =
    referenceWithMeta(w.referenceNo, w.atwNumber)
