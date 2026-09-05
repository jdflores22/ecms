import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
}

val localProperties = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}

fun releaseSigningConfigured(): Boolean {
    val path = localProperties.getProperty("RELEASE_STORE_FILE")?.trim()
    return !path.isNullOrEmpty() &&
        !localProperties.getProperty("RELEASE_STORE_PASSWORD").isNullOrBlank() &&
        !localProperties.getProperty("RELEASE_KEY_ALIAS").isNullOrBlank() &&
        !localProperties.getProperty("RELEASE_KEY_PASSWORD").isNullOrBlank() &&
        rootProject.file(path).exists()
}

val firebaseEnabled = file("google-services.json").exists()
if (firebaseEnabled) {
    apply(plugin = "com.google.gms.google-services")
}

android {
    namespace = "com.ecms.trucker"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.ecms.trucker"
        minSdk = 26
        targetSdk = 35
        versionCode = 18
        versionName = "1.18.0"

        val apiBaseUrl = localProperties.getProperty("API_BASE_URL")
            ?: "https://your-ecms-domain.com/api"
        buildConfigField("String", "API_BASE_URL", "\"$apiBaseUrl\"")
        buildConfigField("boolean", "FIREBASE_ENABLED", firebaseEnabled.toString())
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }

    signingConfigs {
        create("release") {
            if (releaseSigningConfigured()) {
                val storePath = localProperties.getProperty("RELEASE_STORE_FILE")!!.trim()
                storeFile = rootProject.file(storePath)
                storePassword = localProperties.getProperty("RELEASE_STORE_PASSWORD")
                keyAlias = localProperties.getProperty("RELEASE_KEY_ALIAS")
                keyPassword = localProperties.getProperty("RELEASE_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            isShrinkResources = false
            isDebuggable = false
            if (releaseSigningConfigured()) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
        debug {
            versionNameSuffix = "-debug"
        }
    }
}

gradle.taskGraph.whenReady {
    val needsReleaseSigning = allTasks.any {
        it.name == "assembleRelease" || it.name == "bundleRelease" || it.name == "packageRelease"
    }
    if (needsReleaseSigning && !releaseSigningConfigured()) {
        error(
            """
            Release signing is not configured.

            1. Run:  android-trucker\scripts\create-release-keystore.ps1
            2. Then: android-trucker\scripts\build-release-apk.ps1

            Or set RELEASE_STORE_FILE, RELEASE_STORE_PASSWORD, RELEASE_KEY_ALIAS, and
            RELEASE_KEY_PASSWORD in android-trucker/local.properties (see local.properties.example).
            """.trimIndent(),
        )
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.12.01")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.navigation:navigation-compose:2.8.5")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.datastore:datastore-preferences:1.1.1")

    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
    implementation("com.jakewharton.retrofit:retrofit2-kotlinx-serialization-converter:1.0.0")

    implementation("io.coil-kt:coil-compose:2.7.0")
    implementation("com.google.zxing:core:3.5.3")

    val cameraX = "1.4.1"
    implementation("androidx.camera:camera-camera2:$cameraX")
    implementation("androidx.camera:camera-lifecycle:$cameraX")
    implementation("androidx.camera:camera-view:$cameraX")
    implementation("com.google.mlkit:barcode-scanning:17.3.0")
    implementation("com.google.mlkit:text-recognition:16.0.1")

    implementation(platform("com.google.firebase:firebase-bom:33.7.0"))
    implementation("com.google.firebase:firebase-messaging-ktx")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.9.0")

    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
