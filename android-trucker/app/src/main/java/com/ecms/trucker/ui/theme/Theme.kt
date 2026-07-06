package com.ecms.trucker.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val IcsLightColors = lightColorScheme(
    primary = IcsColors.Primary,
    onPrimary = IcsColors.OnPrimary,
    primaryContainer = Color(0xFFDCEEFF),
    onPrimaryContainer = IcsColors.PrimaryDark,
    secondary = IcsColors.Accent,
    onSecondary = Color.White,
    background = IcsColors.Background,
    onBackground = IcsColors.OnSurface,
    surface = IcsColors.Surface,
    onSurface = IcsColors.OnSurface,
    onSurfaceVariant = IcsColors.TextSecondary,
    outline = IcsColors.Divider,
    error = IcsColors.Error,
)

private val IcsShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(10.dp),
    medium = RoundedCornerShape(12.dp),
    large = RoundedCornerShape(16.dp),
    extraLarge = RoundedCornerShape(24.dp),
)

private val IcsTypography = Typography(
    headlineLarge = TextStyle(fontWeight = FontWeight.Bold, fontSize = 28.sp, color = IcsColors.Primary),
    headlineMedium = TextStyle(fontWeight = FontWeight.Bold, fontSize = 22.sp, color = IcsColors.Primary),
    headlineSmall = TextStyle(fontWeight = FontWeight.Bold, fontSize = 18.sp, color = IcsColors.Primary),
    titleLarge = TextStyle(fontWeight = FontWeight.Bold, fontSize = 20.sp),
    titleMedium = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 16.sp),
    titleSmall = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 14.sp),
    bodyLarge = TextStyle(fontSize = 16.sp),
    bodyMedium = TextStyle(fontSize = 14.sp),
    bodySmall = TextStyle(fontSize = 12.sp, color = IcsColors.TextSecondary),
    labelLarge = TextStyle(fontWeight = FontWeight.Bold, fontSize = 14.sp),
    labelMedium = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 12.sp),
    labelSmall = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 11.sp,
        letterSpacing = 0.5.sp,
        color = IcsColors.TextSecondary,
    ),
)

@Composable
fun EcmsTruckerTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = IcsLightColors,
        typography = IcsTypography,
        shapes = IcsShapes,
        content = content,
    )
}
