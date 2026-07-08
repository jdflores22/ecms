package com.ecms.trucker.data.model

import kotlinx.serialization.Serializable

@Serializable
data class AuthResponse(
    val accessToken: String,
    val refreshToken: String,
    val expiresAt: String,
    val user: UserDto,
)

@Serializable
data class UserDto(
    val id: Int,
    val username: String,
    val email: String,
    val fullName: String,
    val role: String,
    val shippingLineId: Int? = null,
    val depotId: Int? = null,
    val profilePhoto: String? = null,
    val allowedPages: List<String>? = null,
)

@Serializable
data class LoginRequest(val username: String, val password: String)

@Serializable
data class RefreshRequest(val refreshToken: String)

@Serializable
data class SignUpRequest(
    val username: String,
    val email: String,
    val password: String,
    val fullName: String,
    val role: String = "Trucker",
)

@Serializable
data class ForgotPasswordRequest(val emailOrUsername: String)

@Serializable
data class ResetPasswordRequest(val token: String, val newPassword: String)

@Serializable
data class MessageResponse(val message: String, val resetToken: String? = null)

@Serializable
data class ProfileDto(
    val id: Int,
    val username: String,
    val email: String,
    val fullName: String,
    val role: String,
    val status: String,
    val shippingLineId: Int? = null,
    val shippingLineName: String? = null,
    val depotId: Int? = null,
    val depotName: String? = null,
    val profilePhoto: String? = null,
    val createdAt: String,
)

@Serializable
data class UpdateProfileRequest(val email: String, val fullName: String)

@Serializable
data class ChangePasswordRequest(val currentPassword: String, val newPassword: String)

@Serializable
data class TruckerDashboardDto(
    val upcomingReturns: Int = 0,
    val pendingPayments: Int = 0,
    val confirmedReturns: Int = 0,
    val completedReturns: Int = 0,
    val totalRequests: Int = 0,
    val pendingRequests: Int = 0,
    val approvedRequests: Int = 0,
    val rejectedRequests: Int = 0,
    val completedPreAdviceReturns: Int = 0,
    val draftWithdrawals: Int = 0,
    val issuedWithdrawalsAwaitingUpload: Int = 0,
    val submittedWithdrawals: Int = 0,
    val approvedWithdrawals: Int = 0,
    val widgets: DashboardWidgetsDto? = null,
)

@Serializable
data class DashboardWidgetsDto(
    val expiringWithin48Hours: Int = 0,
    val stuckOver24HoursInReview: Int = 0,
    val depotTurnaroundHours: Double = 0.0,
    val topRejectedReasons: List<DashboardRejectedReasonDto> = emptyList(),
)

@Serializable
data class DashboardRejectedReasonDto(
    val reason: String,
    val count: Int,
)

@Serializable
data class PreAdviceDto(
    val id: Int,
    val referenceNo: String,
    val truckerId: Int,
    val truckerName: String,
    val shippingLineId: Int,
    val shippingLineName: String,
    val containerId: Int,
    val containerNo: String,
    val containerSize: String,
    val containerType: String,
    val status: String,
    val demurrageValidUntil: String? = null,
    val remarks: String? = null,
    val createdAt: String,
    val complianceRemarks: String? = null,
    val complianceRequestedAt: String? = null,
    val hasDamageReport: Boolean = false,
    val hasQrBooking: Boolean = false,
    val qrCode: String? = null,
    val qrBookingId: Int? = null,
    val logicteckStatus: String? = null,
)

@Serializable
data class PreAdviceLookupsDto(
    val shippingLines: List<ShippingLineLookupDto>,
    val containerSizes: List<SizeLookupDto>,
    val containerTypes: List<ContainerTypeLookupDto>,
)

@Serializable
data class ShippingLineLookupDto(val id: Int, val name: String, val code: String)

@Serializable
data class SizeLookupDto(val id: Int, val label: String)

@Serializable
data class ContainerTypeLookupDto(val id: Int, val code: String, val label: String)

@Serializable
data class DepotLookupDto(val id: Int, val name: String)

@Serializable
data class CreatePreAdviceRequest(
    val shippingLineId: Int,
    val containerNo: String,
    val containerSizeId: Int,
    val containerTypeId: Int,
    val remarks: String? = null,
)

@Serializable
data class CancelPreAdviceRequest(val reason: String? = null)

@Serializable
data class DuplicateCheckResponse(
    val isDuplicate: Boolean,
    val referenceNo: String? = null,
    val status: String? = null,
    val truckerName: String? = null,
)

@Serializable
data class PreAdviceDocumentDto(
    val id: Int,
    val preAdviceId: Int,
    val category: String? = null,
    val categoryLabel: String? = null,
    val comment: String? = null,
    val fileName: String,
    val filePath: String,
    val contentType: String,
    val fileSize: Long,
    val uploadedByName: String,
    val createdAt: String,
)

@Serializable
data class ScheduleDto(
    val id: Int,
    val preAdviceId: Int,
    val referenceNo: String,
    val depotId: Int,
    val depotName: String,
    val date: String,
    val time: String,
    val slotNo: Int,
    val status: String,
    val truckerId: Int? = null,
    val truckerName: String? = null,
    val depotRemarks: String? = null,
)

@Serializable
data class PaymentDto(
    val id: Int,
    val scheduleId: Int,
    val truckerId: Int,
    val truckerName: String,
    val amount: Double,
    val proofFile: String? = null,
    val proofReferenceNo: String? = null,
    val proofPaymentId: String? = null,
    val proofQrphInvoiceNo: String? = null,
    val proofTransactionAt: String? = null,
    val proofProvider: String? = null,
    val status: String,
    val paidAt: String? = null,
)

@Serializable
data class PaymentSettingsDto(val returnFeeAmount: Double, val updatedAt: String)

@Serializable
data class CountResponse(val count: Int)

@Serializable
data class QrBookingDto(
    val id: Int,
    val scheduleId: Int,
    val qrCode: String,
    val payload: QrPayloadDto,
    val generatedAt: String,
    val isUsed: Boolean,
    val logicteckBookedAt: String? = null,
    val logicteckStatus: String,
)

@Serializable
data class QrPayloadDto(
    val bookingId: String,
    val containerNo: String,
    val shippingLine: String,
    val depot: String,
    val scheduleDate: String,
    val scheduleTime: String,
    val trucker: String,
    val validateUrl: String? = null,
)

@Serializable
data class BookLogicteckResponse(
    val success: Boolean,
    val message: String,
    val booking: QrBookingDto? = null,
    val externalReference: String? = null,
    val portalUrl: String? = null,
)

@Serializable
data class WithdrawalDto(
    val id: Int,
    val referenceNo: String,
    val atwNumber: String,
    val truckerId: Int,
    val truckerName: String,
    val shippingLineId: Int,
    val shippingLineName: String,
    val currentDepotId: Int,
    val currentDepotName: String,
    val destination: String,
    val issueDate: String,
    val expirationDate: String,
    val purpose: String,
    val status: String,
    val remarks: String? = null,
    val createdAt: String,
    val submittedAt: String? = null,
    val hasAtwDocument: Boolean = false,
    val reviewRemarks: String? = null,
    val containerCount: Int = 0,
    val containerSummary: String = "",
    val lines: List<WithdrawalLineDto> = emptyList(),
    val bookingNumber: String? = null,
    val bookedAt: String? = null,
    val assignedDepotId: Int? = null,
    val assignedDepotName: String? = null,
    val cyAssignedAt: String? = null,
    val pickupSchedule: WithdrawalScheduleDto? = null,
    val truckingCompany: String? = null,
    val plateNumber: String? = null,
    val driverName: String? = null,
)

@Serializable
data class WithdrawalScheduleDto(
    val id: Int,
    val withdrawalRequestId: Int,
    val referenceNo: String,
    val depotId: Int,
    val depotName: String,
    val date: String,
    val time: String,
    val slotNo: Int,
    val status: String,
    val truckerId: Int? = null,
    val truckerName: String? = null,
    val depotRemarks: String? = null,
    val containerSummary: String,
)

@Serializable
data class WithdrawalLineDto(
    val id: Int,
    val lineNo: Int,
    val containerId: Int,
    val containerNo: String,
    val containerSizeId: Int,
    val containerSize: String,
    val containerTypeId: Int,
    val containerType: String,
    val lineStatus: String,
)

@Serializable
data class WithdrawalFormConfigDto(
    val shippingLines: List<ShippingLineLookupDto>,
    val containerSizes: List<SizeLookupDto>,
    val containerTypes: List<ContainerTypeLookupDto>,
    val depots: List<DepotLookupDto>,
    val destinations: List<DestinationDto>,
    val shippingLineRules: List<ShippingLineRuleDto>,
)

@Serializable
data class DestinationDto(val label: String, val category: String)

@Serializable
data class ShippingLineRuleDto(
    val shippingLineId: Int,
    val defaultValidityDays: Int,
    val maxContainersPerBatch: Int,
    val contractDepotIds: List<Int>,
)

@Serializable
data class WithdrawalLineInput(
    val containerNo: String,
    val containerSizeId: Int,
    val containerTypeId: Int,
)

@Serializable
data class CreateWithdrawalRequest(
    val atwNumber: String,
    val shippingLineId: Int,
    val lines: List<WithdrawalLineInput>,
    val currentDepotId: Int,
    val destination: String,
    val issueDate: String,
    val expirationDate: String,
    val remarks: String? = null,
)

@Serializable
data class WithdrawalDocumentDto(
    val id: Int,
    val withdrawalRequestId: Int,
    val documentType: String,
    val fileName: String,
    val filePath: String,
    val contentType: String,
    val fileSize: Long,
    val createdAt: String,
)

@Serializable
data class WithdrawalGatePassDto(
    val gateCode: String,
    val qrPayload: String,
    val referenceNo: String,
    val atwNumber: String,
    val containerSummary: String,
    val expiresOn: String,
    val currentDepotName: String,
    val destination: String,
)

@Serializable
data class AtwCheckResponse(
    val isTaken: Boolean,
    val referenceNo: String? = null,
    val status: String? = null,
)

@Serializable
data class YardCheckResponse(
    val isInYard: Boolean,
    val source: String? = null,
    val message: String? = null,
)

@Serializable
data class DemurrageBillingDto(
    val id: Int,
    val referenceNo: String,
    val preAdviceId: Int,
    val preAdviceReferenceNo: String,
    val shippingLineId: Int,
    val shippingLineName: String,
    val truckerId: Int,
    val truckerName: String,
    val containerNo: String,
    val containerSize: String,
    val containerType: String,
    val demurrageValidUntil: String,
    val expiredOn: String,
    val daysOverdue: Int,
    val demurrageAmount: Double,
    val detentionAmount: Double,
    val totalAmount: Double,
    val feeLines: List<DemurrageFeeLineDto> = emptyList(),
    val status: String,
    val proofFile: String? = null,
    val proofReferenceNo: String? = null,
    val proofTransactionAt: String? = null,
    val paidAt: String? = null,
    val createdAt: String,
)

@Serializable
data class DemurrageFeeLineDto(
    val id: Int,
    val description: String,
    val amount: Double,
    val sortOrder: Int,
)

@Serializable
data class DemurrageBlockCheckDto(
    val isBlocked: Boolean,
    val message: String? = null,
    val billing: DemurrageBillingDto? = null,
)

@Serializable
data class DailyReturnReportDto(
    val from: String,
    val to: String,
    val rows: List<DailyReturnReportRowDto>,
    val totalScheduled: Int,
    val totalCompleted: Int,
)

@Serializable
data class DailyReturnReportRowDto(
    val date: String,
    val scheduled: Int,
    val confirmed: Int,
    val completed: Int,
    val cancelled: Int,
)

@Serializable
data class MonthlyReturnReportDto(
    val year: Int,
    val rows: List<MonthlyReturnReportRowDto>,
    val totalScheduled: Int,
    val totalCompleted: Int,
)

@Serializable
data class MonthlyReturnReportRowDto(
    val year: Int,
    val month: Int,
    val label: String,
    val scheduled: Int,
    val confirmed: Int,
    val completed: Int,
    val cancelled: Int,
)

@Serializable
data class NotificationPageDto(
    val items: List<NotificationDto>,
    val total: Int,
    val unreadCount: Int,
    val page: Int,
    val pageSize: Int,
)

@Serializable
data class NotificationDto(
    val id: Int,
    val title: String,
    val message: String,
    val category: String,
    val linkPath: String? = null,
    val isRead: Boolean,
    val createdAt: String,
    val referenceNo: String? = null,
    val actorName: String? = null,
)

@Serializable
data class RegisterPushTokenRequest(
    val token: String,
    val platform: String = "android",
    val deviceName: String? = null,
)

@Serializable
data class UnregisterPushTokenRequest(val token: String)

@Serializable
data class AllowedPagesResponse(val allowedPages: List<String>)

@Serializable
data class TruckerNewsFeedItemDto(
    val id: Int,
    val title: String,
    val imagePath: String? = null,
    val publishedAt: String? = null,
)

@Serializable
data class TruckerNewsDetailDto(
    val id: Int,
    val title: String,
    val body: String,
    val imagePath: String? = null,
    val isPublished: Boolean = false,
    val publishedAt: String? = null,
    val createdByName: String,
    val createdAt: String,
)
