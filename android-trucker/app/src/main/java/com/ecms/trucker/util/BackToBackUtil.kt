package com.ecms.trucker.util

import com.ecms.trucker.data.model.PreAdviceDocumentDto
import com.ecms.trucker.data.model.PreAdviceDto

enum class PreAdviceIdentityUnit {
    Primary,
    Companion,
}

fun PreAdviceDocumentDto.identityUnitOrPrimary(): PreAdviceIdentityUnit =
    if (identityUnit.equals("Companion", true)) PreAdviceIdentityUnit.Companion else PreAdviceIdentityUnit.Primary

fun photoMapKey(unit: PreAdviceIdentityUnit, category: String): String =
    "${unit.name}:$category"

fun isTwentyFootContainerSize(sizeLabel: String?): Boolean {
    val normalized = sizeLabel?.trim()?.uppercase() ?: return false
    return normalized == "20" || normalized.startsWith("20 ") || normalized.contains("20FT") || normalized == "20FT"
}

fun PreAdviceDto.isBackToBackActive(): Boolean =
    isBackToBack && !backToBackCompanionContainerNo.isNullOrBlank()

fun PreAdviceDto.companionContainerNoOrNull(): String? =
    backToBackCompanionContainerNo?.trim()?.takeIf { it.isNotBlank() }

fun PreAdviceDto.containerHeadline(): String {
    if (!isBackToBackActive()) return containerNo
    return "$containerNo + ${companionContainerNoOrNull()}"
}

fun PreAdviceDto.paymentSubtitleLine(): String =
    "${shippingLineName} · ${containerHeadline()}"

fun containerUnitRoleLabel(unit: PreAdviceIdentityUnit, backToBack: Boolean): String = when {
    !backToBack -> if (unit == PreAdviceIdentityUnit.Primary) "Container" else "Companion"
    unit == PreAdviceIdentityUnit.Primary -> "Container A"
    else -> "Container B"
}

fun docsForUnit(docs: List<PreAdviceDocumentDto>, unit: PreAdviceIdentityUnit): List<PreAdviceDocumentDto> =
    docs.filter { it.identityUnitOrPrimary() == unit }

fun docsByCategoryForUnit(
    docs: List<PreAdviceDocumentDto>,
    unit: PreAdviceIdentityUnit,
): Map<String, PreAdviceDocumentDto> =
    docsForUnit(docs, unit).associateBy { it.category.orEmpty() }

