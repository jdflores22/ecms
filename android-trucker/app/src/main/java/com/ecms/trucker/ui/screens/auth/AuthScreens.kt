package com.ecms.trucker.ui.screens.auth

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.ecms.trucker.R
import com.ecms.trucker.data.repository.AuthRepository
import com.ecms.trucker.ui.components.IcsAuthCard
import com.ecms.trucker.ui.components.IcsAuthScreenLayout
import com.ecms.trucker.ui.components.IcsOutlinedField
import com.ecms.trucker.ui.components.IcsPrimaryButton
import com.ecms.trucker.ui.theme.IcsColors

@Composable
fun LoginScreen(
    authRepository: AuthRepository,
    onLoggedIn: () -> Unit,
    onSignUp: () -> Unit,
    onForgotPassword: () -> Unit,
) {
    val loginFailedMessage = stringResource(R.string.auth_login_failed)
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    IcsAuthScreenLayout {
        IcsAuthCard(
            title = stringResource(R.string.auth_sign_in_title),
            subtitle = stringResource(R.string.auth_sign_in_subtitle),
        ) {
            IcsOutlinedField(username, { username = it }, stringResource(R.string.auth_username_or_email))
            Spacer(Modifier.height(12.dp))
            IcsOutlinedField(password, { password = it }, stringResource(R.string.auth_password), password = true)

            error?.let {
                Spacer(Modifier.height(8.dp))
                Text(it, color = IcsColors.Error, style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center)
            }

            Spacer(Modifier.height(20.dp))
            IcsPrimaryButton(
                text = stringResource(R.string.auth_sign_in_title),
                onClick = { loading = true; error = null },
                enabled = username.isNotBlank() && password.isNotBlank(),
                loading = loading,
            )

            LaunchedEffect(loading) {
                if (loading) {
                    authRepository.login(username.trim(), password)
                        .onSuccess { onLoggedIn() }
                        .onFailure { error = it.message ?: loginFailedMessage }
                    loading = false
                }
            }

            Column(
                Modifier.fillMaxWidth().padding(top = 12.dp),
                horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally,
            ) {
                TextButton(onClick = onForgotPassword) {
                    Text(stringResource(R.string.auth_forgot_password), color = IcsColors.Primary)
                }
                TextButton(onClick = onSignUp) {
                    Text(stringResource(R.string.auth_create_trucker_account), color = IcsColors.Primary)
                }
            }
        }
    }
}

@Composable
fun SignUpScreen(
    authRepository: AuthRepository,
    onSignedUp: () -> Unit,
    onBack: () -> Unit,
) {
    val signUpFailedMessage = stringResource(R.string.auth_sign_up_failed)
    var username by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var fullName by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    IcsAuthScreenLayout(onBack = onBack) {
        IcsAuthCard(
            title = stringResource(R.string.auth_create_account_title),
            subtitle = stringResource(R.string.auth_create_account_subtitle),
        ) {
            IcsOutlinedField(username, { username = it }, stringResource(R.string.auth_username))
            Spacer(Modifier.height(8.dp))
            IcsOutlinedField(email, { email = it }, stringResource(R.string.auth_email))
            Spacer(Modifier.height(8.dp))
            IcsOutlinedField(fullName, { fullName = it }, stringResource(R.string.auth_full_name))
            Spacer(Modifier.height(8.dp))
            IcsOutlinedField(password, { password = it }, stringResource(R.string.auth_password_min_8), password = true)
            error?.let {
                Spacer(Modifier.height(8.dp))
                Text(it, color = IcsColors.Error, style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center)
            }
            Spacer(Modifier.height(16.dp))
            IcsPrimaryButton(
                text = stringResource(R.string.auth_sign_up),
                onClick = { loading = true },
                enabled = username.isNotBlank() && email.isNotBlank() && fullName.isNotBlank() && password.length >= 8,
                loading = loading,
            )
        }
    }

    LaunchedEffect(loading) {
        if (loading) {
            authRepository.signUp(username.trim(), email.trim(), password, fullName.trim())
                .onSuccess { onSignedUp() }
                .onFailure { error = it.message ?: signUpFailedMessage; loading = false }
        }
    }
}

@Composable
fun ForgotPasswordScreen(
    authRepository: AuthRepository,
    onBack: () -> Unit,
) {
    var emailOrUsername by remember { mutableStateOf("") }
    var message by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }

    IcsAuthScreenLayout(onBack = onBack) {
        IcsAuthCard(
            title = stringResource(R.string.auth_reset_password_title),
            subtitle = stringResource(R.string.auth_reset_password_subtitle),
        ) {
            IcsOutlinedField(emailOrUsername, { emailOrUsername = it }, stringResource(R.string.auth_email_or_username))
            message?.let {
                Spacer(Modifier.height(8.dp))
                Text(it, color = IcsColors.Success, style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center)
            }
            error?.let {
                Spacer(Modifier.height(8.dp))
                Text(it, color = IcsColors.Error, style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center)
            }
            Spacer(Modifier.height(16.dp))
            IcsPrimaryButton(
                text = stringResource(R.string.auth_send_reset_link),
                onClick = { loading = true },
                enabled = emailOrUsername.isNotBlank(),
                loading = loading,
            )
        }
    }

    LaunchedEffect(loading) {
        if (loading) {
            authRepository.forgotPassword(emailOrUsername.trim())
                .onSuccess { message = it; error = null }
                .onFailure { error = it.message }
            loading = false
        }
    }
}
