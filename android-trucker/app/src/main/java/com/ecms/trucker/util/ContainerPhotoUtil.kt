package com.ecms.trucker.util

import android.net.Uri
import com.ecms.trucker.data.model.PreAdviceDocumentDto
import com.ecms.trucker.data.model.PreAdviceDto

/** Standard 8 views + CSC plate; CRO/eDO when not linked via ICS QR verify. */
val STANDARD_CONTAINER_VIEW_CATEGORIES = listOf(
    "Flooring",
    "RightSideIn",
    "LeftSideIn",
    "Back",
    "Backdoor",
    "Front",
    "LeftSideOut",
    "RightSideOut",
)

const val CSC_PLATE_CATEGORY = "CscPlate"
const val CRO_EDO_CATEGORY = "CroEdo"

fun requiredCategoriesForUnit(item: PreAdviceDto, unit: PreAdviceIdentityUnit): List<String> {
    val categories = STANDARD_CONTAINER_VIEW_CATEGORIES + CSC_PLATE_CATEGORY
    val needsCroEdo = when (unit) {
        PreAdviceIdentityUnit.Primary -> item.croEdoReferenceNo.isNullOrBlank()
        PreAdviceIdentityUnit.Companion -> true
    }
    return if (needsCroEdo) categories + CRO_EDO_CATEGORY else categories
}

fun requiredPhotoCountPerUnit(item: PreAdviceDto, unit: PreAdviceIdentityUnit): Int =
    requiredCategoriesForUnit(item, unit).size

fun requiredPhotoTotal(item: PreAdviceDto): Int {
    var total = requiredPhotoCountPerUnit(item, PreAdviceIdentityUnit.Primary)
    if (item.isBackToBackActive()) {
        total += requiredPhotoCountPerUnit(item, PreAdviceIdentityUnit.Companion)
    }
    return total
}

fun countUploadedRequiredPhotos(
    item: PreAdviceDto,
    docs: List<PreAdviceDocumentDto>,
    pendingPhotos: Map<String, Uri>,
    unit: PreAdviceIdentityUnit,
): Int {
    val byCategory = docsByCategoryForUnit(docs, unit)
    return requiredCategoriesForUnit(item, unit).count { category ->
        byCategory[category] != null || pendingPhotos.containsKey(photoMapKey(unit, category))
    }
}

fun countAllUploadedRequiredPhotos(
    item: PreAdviceDto,
    docs: List<PreAdviceDocumentDto>,
    pendingPhotos: Map<String, Uri>,
): Int {
    var count = countUploadedRequiredPhotos(item, docs, pendingPhotos, PreAdviceIdentityUnit.Primary)
    if (item.isBackToBackActive()) {
        count += countUploadedRequiredPhotos(item, docs, pendingPhotos, PreAdviceIdentityUnit.Companion)
    }
    return count
}

fun missingRequiredPhotoLabels(
    item: PreAdviceDto,
    docs: List<PreAdviceDocumentDto>,
    pendingPhotos: Map<String, Uri>,
    unit: PreAdviceIdentityUnit,
): List<String> {
    val byCategory = docsByCategoryForUnit(docs, unit)
    return requiredCategoriesForUnit(item, unit).filter { category ->
        byCategory[category] == null && !pendingPhotos.containsKey(photoMapKey(unit, category))
    }
}
