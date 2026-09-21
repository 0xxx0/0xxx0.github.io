package io.github.field.bodybridge

import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.Duration
import java.time.Instant

class MainActivity : ComponentActivity() {
    private lateinit var statusView: TextView
    private lateinit var exportButton: Button
    private lateinit var saveButton: Button
    private lateinit var summaryView: TextView
    private var pendingBundle: String? = null

    private val permissions = setOf(
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(HeartRateRecord::class),
    )

    private val permissionLauncher =
        registerForActivityResult(PermissionController.createRequestPermissionResultContract()) {
            refreshStatus()
        }

    private val createDocument =
        registerForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
            if (uri != null) saveBundle(uri)
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(buildUi())
        refreshStatus()
    }

    override fun onResume() {
        super.onResume()
        if (::statusView.isInitialized) refreshStatus()
    }

    private fun buildUi(): View {
        fun text(value: String, size: Float = 14f, bold: Boolean = false): TextView =
            TextView(this).apply {
                this.text = value
                textSize = size
                if (bold) setTypeface(typeface, Typeface.BOLD)
                setPadding(0, dp(6), 0, dp(6))
            }

        fun button(label: String, click: () -> Unit): Button =
            Button(this).apply {
                text = label
                isAllCaps = false
                setOnClickListener { click() }
            }

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(24), dp(18), dp(28))
            gravity = Gravity.CENTER_HORIZONTAL
        }

        root.addView(text("BODY / HEALTH CONNECT", 24f, true))
        root.addView(text("READ ONLY · SLEEP + HEART RATE · LOCAL JSON", 11f, true))
        root.addView(text(
            "No network permission. No background reads. No Health Connect writes. " +
                "Nothing leaves the phone unless you explicitly save the JSON file.",
            13f
        ))

        statusView = text("Checking Health Connect…", 13f, true)
        root.addView(statusView)

        root.addView(button("Request sleep + heart-rate access") {
            if (HealthConnectClient.getSdkStatus(this) == HealthConnectClient.SDK_AVAILABLE) {
                permissionLauncher.launch(permissions)
            } else {
                refreshStatus()
            }
        })

        root.addView(button("Open Health Connect") {
            if (HealthConnectClient.getSdkStatus(this) == HealthConnectClient.SDK_AVAILABLE) {
                startActivity(HealthConnectClient.getHealthConnectManageDataIntent(this))
            }
        })

        exportButton = button("Build last-36-hours BODY / FIT bundle") { buildBundle() }
        exportButton.isEnabled = false
        root.addView(exportButton)

        saveButton = button("Save JSON") {
            val name = "body-sensor-bundle-" + Instant.now().toString()
                .replace(":", "-")
                .replace(".", "-") + ".json"
            createDocument.launch(name)
        }
        saveButton.isEnabled = false
        root.addView(saveButton)

        summaryView = text("No bundle built yet.", 12f)
        summaryView.setTextIsSelectable(true)
        root.addView(summaryView)

        root.addView(text(
            "Import the saved file at BODY / FIT → SENSE → IMPORT JSON FILE. " +
                "The bridge exports the existing 0xxx0/body-sensor-bundle/v0.1 envelope.",
            12f
        ))
        return ScrollView(this).apply { addView(root) }
    }

    private fun refreshStatus() {
        lifecycleScope.launch {
            when (HealthConnectClient.getSdkStatus(this@MainActivity)) {
                HealthConnectClient.SDK_AVAILABLE -> {
                    val client = HealthConnectClient.getOrCreate(this@MainActivity)
                    val granted = runCatching {
                        client.permissionController.getGrantedPermissions()
                    }.getOrDefault(emptySet())
                    val ready = granted.containsAll(permissions)
                    statusView.text = if (ready) {
                        "READY · sleep + heart rate granted"
                    } else {
                        "WAITING · grant sleep + heart rate only"
                    }
                    exportButton.isEnabled = ready
                }
                HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> {
                    statusView.text = "Health Connect provider update required."
                    exportButton.isEnabled = false
                }
                else -> {
                    statusView.text =
                        "Health Connect unavailable. Requires Android 9+ with a supported provider."
                    exportButton.isEnabled = false
                }
            }
        }
    }

    private fun buildBundle() {
        exportButton.isEnabled = false
        statusView.text = "READING · foreground only…"
        lifecycleScope.launch {
            try {
                val client = HealthConnectClient.getOrCreate(this@MainActivity)
                val granted = client.permissionController.getGrantedPermissions()
                if (!granted.containsAll(permissions)) {
                    pendingBundle = null
                    saveButton.isEnabled = false
                    statusView.text = "Permission changed. Grant sleep + heart rate again."
                    return@launch
                }

                val end = Instant.now()
                val start = end.minus(Duration.ofHours(36))
                val result = withContext(Dispatchers.IO) {
                    HealthBundleExporter.build(client, start, end)
                }
                pendingBundle = result.json
                saveButton.isEnabled = true
                statusView.text = "BUILT · local memory only"
                summaryView.text = buildString {
                    appendLine("window: " + result.start + " → " + result.end)
                    appendLine("sleep sessions: " + result.sleepSessions)
                    appendLine("heart-rate samples: " + result.heartRateSamples)
                    appendLine("observations: " + result.observations)
                    if (result.heartRateTruncated) {
                        appendLine(
                            "heart rate: TRUNCATED to " +
                                HealthBundleExporter.MAX_HEART_RATE_SAMPLES +
                                " newest samples"
                        )
                    }
                    append("next: SAVE JSON → BODY / FIT import")
                }
            } catch (e: SecurityException) {
                pendingBundle = null
                saveButton.isEnabled = false
                statusView.text = "READ BLOCKED · permission unavailable/revoked"
                summaryView.text = e.message ?: e.javaClass.simpleName
            } catch (e: Exception) {
                pendingBundle = null
                saveButton.isEnabled = false
                statusView.text = "READ FAILED · no data was exported"
                summaryView.text = e.message ?: e.javaClass.simpleName
            } finally {
                refreshStatus()
            }
        }
    }

    private fun saveBundle(uri: Uri) {
        val json = pendingBundle ?: return
        lifecycleScope.launch(Dispatchers.IO) {
            runCatching {
                contentResolver.openOutputStream(uri, "wt")?.bufferedWriter().use { writer ->
                    requireNotNull(writer) { "Could not open destination" }
                    writer.write(json)
                }
            }.onSuccess {
                runOnUiThread { statusView.text = "SAVED · explicit local file" }
            }.onFailure { error ->
                runOnUiThread {
                    statusView.text = "SAVE FAILED"
                    summaryView.text = error.message ?: error.javaClass.simpleName
                }
            }
        }
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt()
}
