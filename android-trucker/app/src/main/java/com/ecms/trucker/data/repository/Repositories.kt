package com.ecms.trucker.data.repository

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import com.ecms.trucker.data.api.EcmsApiService
import com.ecms.trucker.data.api.AuthInterceptor
import com.ecms.trucker.data.api.userMessage
import com.ecms.trucker.data.local.TokenStore
import com.ecms.trucker.data.model.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.io.FileOutputStream

class AuthRepository(
    private val api: EcmsApiService,
    private val tokenStore: TokenStore,
    private val authInterceptor: AuthInterceptor,
) {
    val authState = tokenStore.authState

    suspend fun login(username: String, password: String): Result<UserDto> {
        return try {
            val response = api.login(LoginRequest(username, password))
            if (!response.user.role.equals("Trucker", ignoreCase = true)) {
                tokenStore.clear()
                authInterceptor.resetSession()
                return Result.failure(IllegalStateException("This app is for trucker accounts only."))
            }
            tokenStore.saveAuth(response.accessToken, response.refreshToken, response.user)
            authInterceptor.resetSession()
            Result.success(response.user)
        } catch (error: Throwable) {
            tokenStore.clear()
            authInterceptor.resetSession()
            Result.failure(IllegalStateException(error.userMessage("Login failed.")))
        }
    }

    suspend fun signUp(
        username: String,
        email: String,
        password: String,
        fullName: String,
    ): Result<UserDto> {
        return try {
            val response = api.signUp(SignUpRequest(username, email, password, fullName))
            tokenStore.saveAuth(response.accessToken, response.refreshToken, response.user)
            authInterceptor.resetSession()
            Result.success(response.user)
        } catch (error: Throwable) {
            tokenStore.clear()
            authInterceptor.resetSession()
            Result.failure(IllegalStateException(error.userMessage("Sign up failed.")))
        }
    }

    suspend fun logout() {
        val refresh = tokenStore.getRefreshToken()
        if (refresh != null) {
            runCatching { api.logout(RefreshRequest(refresh)) }
        }
        tokenStore.clear()
        authInterceptor.resetSession()
    }

    suspend fun forgotPassword(emailOrUsername: String): Result<String> = runCatching {
        api.forgotPassword(ForgotPasswordRequest(emailOrUsername)).message
    }.recoverCatching { error ->
        throw IllegalStateException(error.userMessage("Failed to send reset link."))
    }

    suspend fun resetPassword(token: String, newPassword: String): Result<String> = runCatching {
        api.resetPassword(ResetPasswordRequest(token, newPassword)).message
    }.recoverCatching { error ->
        throw IllegalStateException(error.userMessage("Failed to reset password."))
    }
}

class TruckerRepository(
    private val api: EcmsApiService,
    private val context: Context,
) {
    suspend fun getDashboard(): TruckerDashboardDto = api.getTruckerDashboard()

    suspend fun listPreAdvices() = api.listPreAdvices()
    suspend fun getPreAdvice(id: Int) = api.getPreAdvice(id)
    suspend fun getPreAdviceLookups() = api.getPreAdviceLookups()
    suspend fun createPreAdvice(body: CreatePreAdviceRequest) = api.createPreAdvice(body)
    suspend fun updatePreAdvice(id: Int, body: CreatePreAdviceRequest) = api.updatePreAdvice(id, body)
    suspend fun deletePreAdvice(id: Int) = api.deletePreAdvice(id)
    suspend fun submitPreAdvice(id: Int) = api.submitPreAdvice(id)
    suspend fun cancelPreAdvice(id: Int, reason: String?) =
        api.cancelPreAdvice(id, CancelPreAdviceRequest(reason))
    suspend fun getPreAdviceDocuments(id: Int) = api.getPreAdviceDocuments(id)

    suspend fun uploadPreAdviceDocument(id: Int, uri: Uri, category: String, comment: String?) {
        val part = uriToMultipart(uri, "file")
        val categoryBody = category.toRequestBody("text/plain".toMediaTypeOrNull())
        val commentBody = comment?.toRequestBody("text/plain".toMediaTypeOrNull())
        api.uploadPreAdviceDocument(id, part, categoryBody, commentBody)
    }

    suspend fun deletePreAdviceDocument(preAdviceId: Int, docId: Int) =
        api.deletePreAdviceDocument(preAdviceId, docId)

    suspend fun listSchedules() = api.listSchedules()
    suspend fun getSchedule(id: Int) = api.getSchedule(id)
    suspend fun getScheduleByPreAdvice(preAdviceId: Int) = runCatching {
        api.getScheduleByPreAdvice(preAdviceId)
    }.getOrNull()

    suspend fun getMyPayments() = api.getMyPayments()

    suspend fun getPaymentSettings() = api.getPaymentSettings()
    suspend fun getPaymentBySchedule(scheduleId: Int) = api.getPaymentBySchedule(scheduleId)

    suspend fun uploadPaymentProof(
        scheduleId: Int,
        uri: Uri,
        referenceNo: String?,
        transactionAt: String?,
    ) {
        val proof = uriToMultipart(uri, "proof")
        val scheduleBody = scheduleId.toString().toRequestBody("text/plain".toMediaTypeOrNull())
        val refBody = referenceNo?.toRequestBody("text/plain".toMediaTypeOrNull())
        val atBody = transactionAt?.toRequestBody("text/plain".toMediaTypeOrNull())
        api.uploadPaymentProof(scheduleBody, proof, refBody, atBody)
    }

    suspend fun getQrBooking(bookingId: Int) = api.getQrBooking(bookingId)
    suspend fun getQrBySchedule(scheduleId: Int) = api.getQrBySchedule(scheduleId)
    suspend fun bookLogicteck(bookingId: Int) = api.bookLogicteck(bookingId)

    suspend fun listWithdrawals() = api.listWithdrawals()
    suspend fun getWithdrawal(id: Int) = api.getWithdrawal(id)
    suspend fun getWithdrawalFormConfig() = api.getWithdrawalFormConfig()
    suspend fun createWithdrawal(body: CreateWithdrawalRequest) = api.createWithdrawal(body)
    suspend fun updateWithdrawal(id: Int, body: CreateWithdrawalRequest) = api.updateWithdrawal(id, body)
    suspend fun deleteWithdrawal(id: Int) = api.deleteWithdrawal(id)
    suspend fun submitWithdrawal(id: Int) = api.submitWithdrawal(id)
    suspend fun getWithdrawalDocuments(id: Int) = api.getWithdrawalDocuments(id)
    suspend fun getWithdrawalGatePass(id: Int) = api.getWithdrawalGatePass(id)


    suspend fun uploadWithdrawalDocument(id: Int, uri: Uri) {
        val part = uriToMultipart(uri, "file")
        val docType = "AtwCertificate".toRequestBody("text/plain".toMediaTypeOrNull())
        api.uploadWithdrawalDocument(id, part, docType)
    }

    suspend fun listDemurrageBillings() = api.listDemurrageBillings()
    suspend fun getDemurrageBilling(id: Int) = api.getDemurrageBilling(id)
    suspend fun checkDemurrageBlock(
        containerNo: String,
        shippingLineId: Int,
        containerSizeId: Int,
        containerTypeId: Int,
    ) = api.checkDemurrageBlock(containerNo, shippingLineId, containerSizeId, containerTypeId)

    suspend fun uploadDemurrageProof(
        id: Int,
        uri: Uri,
        referenceNo: String?,
        transactionAt: String?,
    ) {
        val proof = uriToMultipart(uri, "proof")
        val refBody = referenceNo?.toRequestBody("text/plain".toMediaTypeOrNull())
        val atBody = transactionAt?.toRequestBody("text/plain".toMediaTypeOrNull())
        api.uploadDemurrageProof(id, proof, refBody, atBody)
    }

    suspend fun getDailyReturnsReport(from: String?, to: String?) =
        api.getDailyReturnsReport(from, to)

    suspend fun getMonthlyReturnsReport(year: Int?) =
        api.getMonthlyReturnsReport(year)

    suspend fun getProfile() = api.getProfile()
    suspend fun updateProfile(email: String, fullName: String) =
        api.updateProfile(UpdateProfileRequest(email, fullName))
    suspend fun changePassword(current: String, newPassword: String) =
        api.changePassword(ChangePasswordRequest(current, newPassword))

    suspend fun getNotifications(page: Int = 1) = api.getNotifications(page = page)
    suspend fun getUnreadNotificationCount() = api.getUnreadNotificationCount().count
    suspend fun markNotificationRead(id: Int) = api.markNotificationRead(id)
    suspend fun markAllNotificationsRead() = api.markAllNotificationsRead()

    private fun uriToMultipart(uri: Uri, fieldName: String): MultipartBody.Part {
        val contentResolver = context.contentResolver
        val mime = contentResolver.getType(uri) ?: "application/octet-stream"
        val fileName = queryDisplayName(uri) ?: uri.lastPathSegment ?: "upload"
        val safeName = fileName.replace(Regex("""[\\/:*?"<>|]"""), "_")
        val extension = safeName.substringAfterLast('.', "")
            .takeIf { it.isNotBlank() }
            ?.let { ".$it" }
            ?: ".bin"
        val tempFile = File.createTempFile("ecms_upload_", extension, context.cacheDir)

        val input = contentResolver.openInputStream(uri)
            ?: throw IllegalStateException("Unable to read selected file. Please choose another image.")
        input.use {
            FileOutputStream(tempFile).use { output -> input.copyTo(output) }
        }
        if (tempFile.length() <= 0L) {
            throw IllegalStateException("Selected file is empty. Please choose another image.")
        }
        val body = tempFile.asRequestBody(mime.toMediaTypeOrNull())
        return MultipartBody.Part.createFormData(fieldName, safeName, body)
    }

    private fun queryDisplayName(uri: Uri): String? {
        return context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)
            ?.use { cursor ->
                if (!cursor.moveToFirst()) return@use null
                val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (index < 0) null else cursor.getString(index)
            }
    }
}
