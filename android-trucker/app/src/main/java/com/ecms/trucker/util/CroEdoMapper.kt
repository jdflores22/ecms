package com.ecms.trucker.util

import com.ecms.trucker.data.model.CroEdoVerificationLineDto
import java.util.Locale
import com.ecms.trucker.data.model.PreAdviceLookupsDto

data class MappedCroForm(
    val shippingLineId: Int,
    val containerNo: String,
    val containerSizeId: Int,
    val containerTypeId: Int,
)

private fun norm(value: String) = value.trim().uppercase(Locale.US).replace("'", "")

fun mapCroLineToForm(
    lookups: PreAdviceLookupsDto,
    shippingLineId: Int?,
    shippingLineName: String?,
    line: CroEdoVerificationLineDto,
): Result<MappedCroForm> {
    val shippingLine = when {
        shippingLineId != null -> lookups.shippingLines.find { it.id == shippingLineId }
        else -> null
    } ?: shippingLineName?.let { name ->
        lookups.shippingLines.find { line ->
            norm(line.name) == norm(name) ||
                norm(line.code) == norm(name) ||
                norm(name).contains(norm(line.name))
        }
    }

    if (shippingLine == null) {
        return Result.failure(
            IllegalStateException(
                "Shipping line from CRO/eDO could not be matched (${shippingLineName ?: "unknown"}).",
            ),
        )
    }

    val size = lookups.containerSizes.find { size ->
        val label = norm(size.label)
        val cro = norm(line.size)
        label == cro || label.startsWith(cro) || cro.startsWith(label)
    }
    if (size == null) {
        return Result.failure(
            IllegalStateException("Container size from CRO/eDO could not be matched (${line.size})."),
        )
    }

    val type = lookups.containerTypes.find { type ->
        norm(type.code) == norm(line.type) || norm(type.label) == norm(line.type)
    }
    if (type == null) {
        return Result.failure(
            IllegalStateException("Container type from CRO/eDO could not be matched (${line.type})."),
        )
    }

    return Result.success(
        MappedCroForm(
            shippingLineId = shippingLine.id,
            containerNo = line.containerNumber.trim().uppercase(Locale.US),
            containerSizeId = size.id,
            containerTypeId = type.id,
        ),
    )
}
