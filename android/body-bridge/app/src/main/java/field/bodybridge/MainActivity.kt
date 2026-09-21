package field.bodybridge

import android.os.Bundle
import android.view.ViewGroup
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
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.metadata.Device
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.time.Duration
import java.time.Instant

class MainActivity : ComponentActivity() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var client: HealthConnectClient? = null
    private var lastPacket: String? = null

    private lateinit var status: TextView
    private lateinit var readButton: Button
    private lateinit var exportButton: Button

    private val requiredPermissions = setOf(
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(HeartRateRecord::class),
    )

    private val permissionLauncher = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) { granted ->
        status.text = if (granted.containsAll(requiredPermissions)) {
            "READ permission granted · ready for bounded proof"
        } else {
            "Sleep + Heart Rate read permission not fully granted"
        }
    }

    private val documentLauncher = registerForActivityResult(
        ActivityResultContracts.CreateDocument("application/json")
    ) { uri ->
        val packet = lastPacket ?: return@registerForActivityResult
        if (uri == null) return@registerForActivityResult
        scope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    contentResolver.openOutputStream(uri, "w")!!.bufferedWriter().use { writer -> writer.write(packet) }
                }
            }.onSuccess {
                status.text = "Exported local JSON · no upload / no write-back"
            }.onFailure { err ->
                status.text = "Export failed · " + (err.message ?: err.javaClass.simpleName)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(buildUi())
        initHealthConnect()
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    private fun buildUi(): ScrollView {
        val pad = 40
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad, pad, pad)
        }
        fun button(label: String, action: () -> Unit) = Button(this).apply {
            text = label
            setOnClickListener { action() }
            root.addView(this, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        }

        root.addView(TextView(this).apply {
            text = "BODY BRIDGE"
            textSize = 32f
        })
        root.addView(TextView(this).apply {
            text = "Health Connect → bounded raw export → BODY / FIT"
            textSize = 16f
        })
        status = TextView(this).apply {
            text = "Checking Health Connect…"
            textSize = 17f
            setPadding(0, 32, 0, 32)
        }
        root.addView(status)

        button("1 · GRANT SLEEP + HEART RATE READ") {
            if (client == null) initHealthConnect() else permissionLauncher.launch(requiredPermissions)
        }
        readButton = Button(this).apply {
            text = "2 · READ 48H SLEEP + HR INSIDE SLEEP"
            isEnabled = false
            setOnClickListener { readBoundedProof() }
        }
        root.addView(readButton, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)

        exportButton = Button(this).apply {
            text = "3 · EXPORT LOCAL JSON"
            isEnabled = false
            setOnClickListener {
                documentLauncher.launch("body-health-connect-" + Instant.now().toString().take(10) + ".json")
            }
        }
        root.addView(exportButton, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)

        root.addView(TextView(this).apply {
            setPadding(0, 36, 0, 0)
            text = """
                APERTURE
                • requested types: SLEEP + HEART RATE only
                • time aperture: previous 48 hours
                • HR aperture: only intervals belonging to returned sleep sessions
                • transport: explicit local JSON document
                • no cloud, background polling, scoring, diagnosis, or write-back
            """.trimIndent()
        })
        return ScrollView(this).apply { addView(root) }
    }

    private fun initHealthConnect() {
        when (HealthConnectClient.getSdkStatus(this)) {
            HealthConnectClient.SDK_AVAILABLE -> {
                client = HealthConnectClient.getOrCreate(this)
                readButton.isEnabled = true
                status.text = "Health Connect available · grant the two read permissions"
            }
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> {
                status.text = "Health Connect provider needs an update"
                readButton.isEnabled = false
            }
            else -> {
                status.text = "Health Connect unavailable on this device/profile"
                readButton.isEnabled = false
            }
        }
    }

    private fun readBoundedProof() {
        val c = client ?: return
        scope.launch {
            readButton.isEnabled = false
            exportButton.isEnabled = false
            status.text = "Reading bounded window…"
            try {
                val granted = withContext(Dispatchers.IO) { c.permissionController.getGrantedPermissions() }
                if (!granted.containsAll(requiredPermissions)) {
                    status.text = "Grant Sleep + Heart Rate read permission first"
                    permissionLauncher.launch(requiredPermissions)
                    return@launch
                }
                val packet = withContext(Dispatchers.IO) { buildPacket(c) }
                lastPacket = packet.toString(2)
                exportButton.isEnabled = true
                val records = packet.getJSONArray("records")
                var sleeps = 0
                var heartRecords = 0
                var heartSamples = 0
                for (i in 0 until records.length()) {
                    val r = records.getJSONObject(i)
                    when (r.getString("type")) {
                        "SleepSessionRecord" -> sleeps++
                        "HeartRateRecord" -> {
                            heartRecords++
                            heartSamples += r.getJSONArray("samples").length()
                        }
                    }
                }
                status.text = "READY · " + sleeps + " sleep session(s) · " + heartRecords + " HR record(s) · " + heartSamples + " HR sample(s)"
            } catch (e: Exception) {
                lastPacket = null
                status.text = "Read failed · " + e.javaClass.simpleName + ": " + (e.message ?: "")
            } finally {
                readButton.isEnabled = true
            }
        }
    }

    private suspend fun buildPacket(c: HealthConnectClient): JSONObject {
        val end = Instant.now()
        val start = end.minus(Duration.ofHours(48))
        val sleeps = readAll<SleepSessionRecord>(c, start, end)
        val records = JSONArray()

        sleeps.forEach { sleep ->
            records.put(sleepJson(sleep))
            readAll<HeartRateRecord>(c, sleep.startTime, sleep.endTime).forEach { hr ->
                records.put(heartRateJson(hr))
            }
        }

        return JSONObject().apply {
            put("schema", "0xxx0/health-connect-export/v0.1")
            put("exported_at", Instant.now().toString())
            put("window", JSONObject().put("start", start.toString()).put("end", end.toString()))
            put("aperture", JSONObject()
                .put("record_types", JSONArray(listOf("SleepSessionRecord", "HeartRateRecord")))
                .put("heart_rate_rule", "ONLY_INSIDE_RETURNED_SLEEP_SESSIONS")
                .put("background_read", false)
                .put("write_back", false)
            )
            put("records", records)
        }
    }

    private suspend inline fun <reified T : Record> readAll(
        c: HealthConnectClient,
        start: Instant,
        end: Instant,
    ): List<T> {
        val out = mutableListOf<T>()
        var token: String? = null
        do {
            val response = c.readRecords(
                ReadRecordsRequest<T>(
                    timeRangeFilter = TimeRangeFilter.between(start, end),
                    pageSize = 1000,
                    pageToken = token,
                )
            )
            out += response.records
            token = response.pageToken
        } while (token != null)
        return out
    }

    private fun sleepJson(r: SleepSessionRecord) = JSONObject().apply {
        put("type", "SleepSessionRecord")
        put("id", r.metadata.id)
        put("start_time", r.startTime.toString())
        put("end_time", r.endTime.toString())
        put("title", r.title ?: JSONObject.NULL)
        put("stages", JSONArray().apply {
            r.stages.forEach { stage ->
                put(JSONObject()
                    .put("stage_code", stage.stage)
                    .put("stage", sleepStageName(stage.stage))
                    .put("start_time", stage.startTime.toString())
                    .put("end_time", stage.endTime.toString())
                )
            }
        })
        put("metadata", metadataJson(r.metadata))
    }

    private fun heartRateJson(r: HeartRateRecord) = JSONObject().apply {
        put("type", "HeartRateRecord")
        put("id", r.metadata.id)
        put("start_time", r.startTime.toString())
        put("end_time", r.endTime.toString())
        put("samples", JSONArray().apply {
            r.samples.forEach { sample ->
                put(JSONObject().put("time", sample.time.toString()).put("bpm", sample.beatsPerMinute))
            }
        })
        put("metadata", metadataJson(r.metadata))
    }

    private fun metadataJson(m: Metadata) = JSONObject().apply {
        put("data_origin_package", m.dataOrigin.packageName)
        put("recording_method", recordingMethodName(m.recordingMethod))
        put("last_modified_time", m.lastModifiedTime.toString())
        put("device", m.device?.let { d ->
            JSONObject()
                .put("manufacturer", d.manufacturer ?: JSONObject.NULL)
                .put("model", d.model ?: JSONObject.NULL)
                .put("type", deviceTypeName(d.type))
                .put("type_code", d.type)
        } ?: JSONObject.NULL)
    }

    private fun recordingMethodName(v: Int) = when (v) {
        Metadata.RECORDING_METHOD_ACTIVELY_RECORDED -> "ACTIVE"
        Metadata.RECORDING_METHOD_AUTOMATICALLY_RECORDED -> "AUTOMATIC"
        Metadata.RECORDING_METHOD_MANUAL_ENTRY -> "MANUAL"
        else -> "UNKNOWN"
    }

    private fun deviceTypeName(v: Int) = when (v) {
        Device.TYPE_WATCH -> "WATCH"
        Device.TYPE_PHONE -> "PHONE"
        Device.TYPE_SCALE -> "SCALE"
        Device.TYPE_RING -> "RING"
        Device.TYPE_FITNESS_BAND -> "FITNESS_BAND"
        Device.TYPE_CHEST_STRAP -> "CHEST_STRAP"
        else -> "UNKNOWN"
    }

    private fun sleepStageName(v: Int) = when (v) {
        SleepSessionRecord.STAGE_TYPE_AWAKE -> "AWAKE"
        SleepSessionRecord.STAGE_TYPE_SLEEPING -> "SLEEPING"
        SleepSessionRecord.STAGE_TYPE_OUT_OF_BED -> "OUT_OF_BED"
        SleepSessionRecord.STAGE_TYPE_AWAKE_IN_BED -> "AWAKE_IN_BED"
        SleepSessionRecord.STAGE_TYPE_LIGHT -> "LIGHT"
        SleepSessionRecord.STAGE_TYPE_DEEP -> "DEEP"
        SleepSessionRecord.STAGE_TYPE_REM -> "REM"
        else -> "UNKNOWN"
    }
}
