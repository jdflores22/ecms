package com.ecms.trucker.util

import com.ecms.trucker.data.model.PaymentDto
import com.ecms.trucker.data.model.ReturnPaymentOptionsDto

fun truckerPaymentDisplayAmount(
    payment: PaymentDto?,
    options: ReturnPaymentOptionsDto?,
    uploadNeeded: Boolean,
    configuredReturnFee: Double,
): Double {
    if (payment != null && !(options?.pilotTestingActive == true && uploadNeeded)) {
        return payment.amount
    }
    val effective = options?.effectiveReturnFeeAmount
    if (effective != null && effective.isFinite() && effective >= 0) return effective
    return configuredReturnFee
}
