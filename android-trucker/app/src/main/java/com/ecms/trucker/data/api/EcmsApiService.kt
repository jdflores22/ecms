package com.ecms.trucker.data.api

import com.ecms.trucker.data.model.*
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.http.*

interface EcmsApiService {
    // Auth
    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): AuthResponse

    @POST("auth/signup")
    suspend fun signUp(@Body body: SignUpRequest): AuthResponse

    @POST("auth/refresh")
    suspend fun refresh(@Body body: RefreshRequest): AuthResponse

    @POST("auth/logout")
    suspend fun logout(@Body body: RefreshRequest)

    @POST("auth/forgot-password")
    suspend fun forgotPassword(@Body body: ForgotPasswordRequest): MessageResponse

    @POST("auth/reset-password")
    suspend fun resetPassword(@Body body: ResetPasswordRequest): MessageResponse

    // Profile
    @GET("profile")
    suspend fun getProfile(): ProfileDto

    @PUT("profile")
    suspend fun updateProfile(@Body body: UpdateProfileRequest): ProfileDto

    @POST("profile/change-password")
    suspend fun changePassword(@Body body: ChangePasswordRequest): MessageResponse

    @Multipart
    @POST("profile/photo")
    suspend fun uploadProfilePhoto(@Part photo: MultipartBody.Part): ProfileDto

    @DELETE("profile/photo")
    suspend fun removeProfilePhoto(): ProfileDto

    // Dashboard
    @GET("dashboard/trucker")
    suspend fun getTruckerDashboard(): TruckerDashboardDto

    // Pre-forecast
    @GET("preforecast")
    suspend fun listPreAdvices(): List<PreAdviceDto>

    @GET("preforecast/{id}")
    suspend fun getPreAdvice(@Path("id") id: Int): PreAdviceDto

    @GET("preforecast/lookups")
    suspend fun getPreAdviceLookups(): PreAdviceLookupsDto

    @GET("preforecast/check-duplicate")
    suspend fun checkPreAdviceDuplicate(
        @Query("containerNo") containerNo: String,
        @Query("containerSizeId") containerSizeId: Int,
        @Query("containerTypeId") containerTypeId: Int,
        @Query("excludePreAdviceId") excludePreAdviceId: Int? = null,
    ): DuplicateCheckResponse

    @POST("preforecast")
    suspend fun createPreAdvice(@Body body: CreatePreAdviceRequest): PreAdviceDto

    @PUT("preforecast/{id}")
    suspend fun updatePreAdvice(@Path("id") id: Int, @Body body: CreatePreAdviceRequest): PreAdviceDto

    @DELETE("preforecast/{id}")
    suspend fun deletePreAdvice(@Path("id") id: Int)

    @POST("preforecast/{id}/submit")
    suspend fun submitPreAdvice(@Path("id") id: Int): PreAdviceDto

    @POST("preforecast/{id}/cancel")
    suspend fun cancelPreAdvice(@Path("id") id: Int, @Body body: CancelPreAdviceRequest): PreAdviceDto

    @GET("preforecast/{id}/documents")
    suspend fun getPreAdviceDocuments(@Path("id") id: Int): List<PreAdviceDocumentDto>

    @Multipart
    @POST("preforecast/{id}/documents")
    suspend fun uploadPreAdviceDocument(
        @Path("id") id: Int,
        @Part file: MultipartBody.Part,
        @Part("category") category: RequestBody,
        @Part("comment") comment: RequestBody?,
    ): PreAdviceDocumentDto

    @DELETE("preforecast/{preAdviceId}/documents/{docId}")
    suspend fun deletePreAdviceDocument(
        @Path("preAdviceId") preAdviceId: Int,
        @Path("docId") docId: Int,
    )

    // Schedules
    @GET("schedules")
    suspend fun listSchedules(): List<ScheduleDto>

    @GET("schedules/{id}")
    suspend fun getSchedule(@Path("id") id: Int): ScheduleDto

    @GET("schedules/by-preforecast/{preAdviceId}")
    suspend fun getScheduleByPreAdvice(@Path("preAdviceId") preAdviceId: Int): ScheduleDto

    // Payments
    @GET("payments/mine")
    suspend fun getMyPayments(): List<PaymentDto>

    @GET("payments/due/count")
    suspend fun getPaymentDueCount(): CountResponse

    @GET("payments/settings")
    suspend fun getPaymentSettings(): PaymentSettingsDto

    @GET("payments/by-schedule/{scheduleId}")
    suspend fun getPaymentBySchedule(@Path("scheduleId") scheduleId: Int): PaymentDto?

    @Multipart
    @POST("payments/upload")
    suspend fun uploadPaymentProof(
        @Part("scheduleId") scheduleId: RequestBody,
        @Part proof: MultipartBody.Part,
        @Part("proofReferenceNo") proofReferenceNo: RequestBody?,
        @Part("proofTransactionAt") proofTransactionAt: RequestBody?,
    ): PaymentDto

    // QR
    @GET("qr/{bookingId}")
    suspend fun getQrBooking(@Path("bookingId") bookingId: Int): QrBookingDto

    @GET("qr/schedule/{scheduleId}")
    suspend fun getQrBySchedule(@Path("scheduleId") scheduleId: Int): QrBookingDto

    @POST("qr/{bookingId}/book-logicteck")
    suspend fun bookLogicteck(@Path("bookingId") bookingId: Int): BookLogicteckResponse

    // Withdrawals
    @GET("withdrawals")
    suspend fun listWithdrawals(): List<WithdrawalDto>

    @GET("withdrawals/{id}")
    suspend fun getWithdrawal(@Path("id") id: Int): WithdrawalDto

    @GET("withdrawals/form-config")
    suspend fun getWithdrawalFormConfig(): WithdrawalFormConfigDto

    @GET("withdrawals/check-atw-number")
    suspend fun checkAtwNumber(
        @Query("atwNumber") atwNumber: String,
        @Query("excludeWithdrawalId") excludeWithdrawalId: Int? = null,
    ): AtwCheckResponse

    @GET("withdrawals/check-yard")
    suspend fun checkYard(
        @Query("depotId") depotId: Int,
        @Query("containerNo") containerNo: String,
        @Query("containerSizeId") containerSizeId: Int,
        @Query("containerTypeId") containerTypeId: Int,
    ): YardCheckResponse

    @GET("withdrawals/check-duplicate")
    suspend fun checkWithdrawalDuplicate(
        @Query("currentDepotId") currentDepotId: Int,
        @Query("containerNo") containerNo: String,
        @Query("containerSizeId") containerSizeId: Int,
        @Query("containerTypeId") containerTypeId: Int,
        @Query("excludeWithdrawalId") excludeWithdrawalId: Int? = null,
    ): DuplicateCheckResponse

    @GET("withdrawals/pending-action/count")
    suspend fun getWithdrawalPendingActionCount(): CountResponse

    @POST("withdrawals")
    suspend fun createWithdrawal(@Body body: CreateWithdrawalRequest): WithdrawalDto

    @PUT("withdrawals/{id}")
    suspend fun updateWithdrawal(@Path("id") id: Int, @Body body: CreateWithdrawalRequest): WithdrawalDto

    @DELETE("withdrawals/{id}")
    suspend fun deleteWithdrawal(@Path("id") id: Int)

    @POST("withdrawals/{id}/submit")
    suspend fun submitWithdrawal(@Path("id") id: Int): WithdrawalDto

    @GET("withdrawals/{id}/documents")
    suspend fun getWithdrawalDocuments(@Path("id") id: Int): List<WithdrawalDocumentDto>

    @Multipart
    @POST("withdrawals/{id}/documents")
    suspend fun uploadWithdrawalDocument(
        @Path("id") id: Int,
        @Part file: MultipartBody.Part,
        @Part("documentType") documentType: RequestBody,
    ): WithdrawalDocumentDto

    @GET("withdrawals/{id}/gate-pass")
    suspend fun getWithdrawalGatePass(@Path("id") id: Int): WithdrawalGatePassDto

    // Demurrage
    @GET("demurrage-billing")
    suspend fun listDemurrageBillings(): List<DemurrageBillingDto>

    @GET("demurrage-billing/{id}")
    suspend fun getDemurrageBilling(@Path("id") id: Int): DemurrageBillingDto

    @GET("demurrage-billing/check-block")
    suspend fun checkDemurrageBlock(
        @Query("containerNo") containerNo: String,
        @Query("shippingLineId") shippingLineId: Int,
        @Query("containerSizeId") containerSizeId: Int,
        @Query("containerTypeId") containerTypeId: Int,
    ): DemurrageBlockCheckDto

    @Multipart
    @POST("demurrage-billing/{id}/upload-proof")
    suspend fun uploadDemurrageProof(
        @Path("id") id: Int,
        @Part proof: MultipartBody.Part,
        @Part("proofReferenceNo") proofReferenceNo: RequestBody?,
        @Part("proofTransactionAt") proofTransactionAt: RequestBody?,
    ): DemurrageBillingDto

    // Reports
    @GET("reports/returns/daily")
    suspend fun getDailyReturnsReport(
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
        @Query("depotId") depotId: Int? = null,
    ): DailyReturnReportDto

    @GET("reports/returns/monthly")
    suspend fun getMonthlyReturnsReport(
        @Query("year") year: Int? = null,
        @Query("depotId") depotId: Int? = null,
    ): MonthlyReturnReportDto

    // Notifications
    @GET("notifications")
    suspend fun getNotifications(
        @Query("page") page: Int = 1,
        @Query("pageSize") pageSize: Int = 20,
        @Query("unreadOnly") unreadOnly: Boolean? = null,
    ): NotificationPageDto

    @GET("notifications/unread-count")
    suspend fun getUnreadNotificationCount(): CountResponse

    @POST("notifications/{id}/read")
    suspend fun markNotificationRead(@Path("id") id: Int)

    @POST("notifications/read-all")
    suspend fun markAllNotificationsRead()

    // Roles
    @GET("roles/access")
    suspend fun getAllowedPages(): AllowedPagesResponse
}
