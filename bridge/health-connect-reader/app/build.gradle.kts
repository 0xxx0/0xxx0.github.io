plugins {
    id("com.android.application")
}

android {
    namespace = "io.github.field.bodybridge"
    compileSdk = 36
    defaultConfig {
        applicationId = "io.github.field.bodybridge"
        minSdk = 28
        targetSdk = 36
        versionCode = 1
        versionName = "0.1"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.activity:activity-ktx:1.13.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.11.0")
    implementation("androidx.health.connect:connect-client:1.1.0")
}
