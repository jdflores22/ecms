package com.ecms.trucker.ui.theme

import androidx.compose.ui.graphics.Color

object IcsColors {
    val Primary = Color(0xFF0B3D91)
    val PrimaryDark = Color(0xFF0A3580)
    val PrimaryLight = Color(0xFF0C4DA8)
    val Accent = Color(0xFF00A3E0)
    val Background = Color(0xFFF5F7FA)
    val Surface = Color.White
    val OnPrimary = Color.White
    val TextSecondary = Color(0xFF64748B)
    val Divider = Color(0xFFE2E8F0)
    val Success = Color(0xFF2E7D32)
    val Warning = Color(0xFFED6C02)
    val Error = Color(0xFFC62828)
    val Purple = Color(0xFF6A1B9A)
    val BlueStat = Color(0xFF1565C0)
    val CardShadow = Color(0x0F0F172A)
}

fun icsHexAlpha(color: Color, alpha: Float): Color {
    return color.copy(alpha = alpha)
}
