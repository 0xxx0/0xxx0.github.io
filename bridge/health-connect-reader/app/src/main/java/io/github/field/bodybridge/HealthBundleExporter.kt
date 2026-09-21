package io.github.field.bodybridge

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.metadata.Device
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import org.json.JSONArray
import org.json.JSONObject
import java.time.Duration
import java.time.Instant

object HealthBundleExporter {
    const val MAX_HEART_RATE_SAMPLES = 5000
    private const val ADAPTER_SCHEMA = "0xxx0/body-fit-health-connect-adapter/v0.1"

    data class ExportResult(
        val json: String,
        val start: Instant,
        val end: Instant,
        val sleepSessions: Int,
        val heartRateSamples: Int,
        val observations: Int,
        val heartRateTruncated: Boolean,
    )

    suspend fun build(client: HealthConnectClient, start: Instant, end: Instant): ExportResult {
        require(start < end) { "start must precede end" }

        val sleeps = readSleep(client, start, end)
        val heartRecords = readHeartRate(client, start, end)
        val observations = JSONArray()
        sleeps.sortedBy { it.startTime }.forEach { observations.put(sleepObservation(it)) }

        val allHeartSamples = heartRecords.flatMap { record ->
            record.samples.map { sample -> record to sample }
        }.sortedBy { it.second.time }

        val truncated = allHeartSamples.size > MAX_HEART_RATE_SAMPLES
        val retainedHeartSamples = if (truncated) {
            allHeartSamples.takeLast(MAX_HEART_RATE_SAMPLES)
        } else {
            allHeartSamples
        }
        retainedHeartSamples.forEach { (record, sample) ->
            observations.put(heartObservation(record, sample))
        }

        val bundle = JSONObject()
            .put("schema", "0xxx0/body-sensor-bundle/v0.1")
            .put("generated_at", Instant.now().toString())
            .put("adapter", JSONObject()
                .put("schema", ADAPTER_SCHEMA)
                .put("implementation", "BODY Health Connect Reader 0.1")
                .put("read_only", true)
                .put("background_read", false)
                .put("network_transport", false))
            .put("window", JSONObject()
                .put("start", start.toString())
                .put("end", end.toString())
                .put("hours", Duration.between(start, end).toHours()))
            .put("selection", JSONArray(listOf("SleepSessionRecord", "HeartRateRecord")))
            .put("limits", JSONObject()
                .put("max_heart_rate_samples", MAX_HEART_RATE_SAMPLES)
                .put("heart_rate_truncated", truncated)
                .put("source_heart_rate_samples", allHeartSamples.size)
                .put("exported_heart_rate_samples", retainedHeartSamples.size))
            .put("observations", observations)

        return ExportResult(
            json = bundle.toString(2),
            start = start,
            end = end,
            sleepSessions = sleeps.size,
            heartRateSamples = retainedHeartSamples.size,
            observations = observations.length(),
            heartRateTruncated = truncated,
        )
    }

    private suspend fun readSleep(
        client: HealthConnectClient,
        start: Instant,
        end: Instant,
    ): List<SleepSessionRecord> {
        val out = mutableListOf<SleepSessionRecord>()
        var pageToken: String? = null
        do {
            val response = client.readRecords(
                ReadRecordsRequest(
                    recordType = SleepSessionRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(start, end),
                    pageToken = pageToken,
                )
            )
            out += response.records
            pageToken = response.pageToken
        } while (!pageToken.isNullOrEmpty())
        return out
    }

    private suspend fun readHeartRate(
        client: HealthConnectClient,
        start: Instant,
        end: Instant,
    ): List<HeartRateRecord> {
        val out = mutableListOf<HeartRateRecord>()
        var pageToken: String? = null
        do {
            val response = client.readRecords(
                ReadRecordsRequest(
                    recordType = HeartRateRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(start, end),
                    pageToken = pageToken,
                )
            )
            out += response.records
            pageToken = response.pageToken
        } while (!pageToken.isNullOrEmpty())
        return out
    }

    private fun sleepObservation(record: SleepSessionRecord): JSONObject {
        val metadata = record.metadata
        val provenance = baseProvenance(metadata, "SleepSessionRecord")
            .put("start_time", record.startTime.toString())
            .put("end_time", record.endTime.toString())
            .putNullable("start_zone_offset", record.startZoneOffset?.toString())
            .putNullable("end_zone_offset", record.endZoneOffset?.toString())
            .put("stage_count", record.stages.size)
            .put("stages", JSONArray().apply {
                record.stages.forEach { stage ->
                    put(JSONObject()
                        .put("start_time", stage.startTime.toString())
                        .put("end_time", stage.endTime.toString())
                        .put("stage", stage.stage))
                }
            })

        return baseObservation(
            metadata = metadata,
            recordType = "SleepSessionRecord",
            observedProperty = "sleep.duration",
            value = Duration.between(record.startTime, record.endTime).toMinutes(),
            unit = "min",
            phenomenonTime = record.startTime,
            derivedness = "D3",
        ).put("provenance", provenance)
    }

    private fun heartObservation(
        record: HeartRateRecord,
        sample: HeartRateRecord.Sample,
    ): JSONObject {
        val metadata = record.metadata
        val provenance = baseProvenance(metadata, "HeartRateRecord")
            .put("record_start_time", record.startTime.toString())
            .put("record_end_time", record.endTime.toString())
            .put("sample_time", sample.time.toString())

        return baseObservation(
            metadata = metadata,
            recordType = "HeartRateRecord",
            observedProperty = "heart_rate",
            value = sample.beatsPerMinute,
            unit = "bpm",
            phenomenonTime = sample.time,
            derivedness = "D0",
        ).put("provenance", provenance)
    }

    private fun baseObservation(
        metadata: Metadata,
        recordType: String,
        observedProperty: String,
        value: Any,
        unit: String?,
        phenomenonTime: Instant,
        derivedness: String,
    ): JSONObject =
        JSONObject()
            .put("schema", "0xxx0/body-sensor-observation/v0.1")
            .put("id", "hc:" + metadata.id + ":" + observedProperty + ":" + phenomenonTime)
            .put("source_id", sourceId(metadata, recordType))
            .put("source_class", sourceClass(metadata))
            .put("observed_property", observedProperty)
            .put("result", JSONObject().put("value", value).putNullable("unit", unit))
            .put("phenomenon_time", phenomenonTime.toString())
            .put("recorded_at", metadata.lastModifiedTime.toString())
            .put("acquisition_method", "health-connect:" + recordingMethod(metadata.recordingMethod))
            .put("availability", "LAST_KNOWN")
            .put("source_ref", metadata.id)
            .put("feature_of_interest", JSONObject().put("kind", "WHOLE_BODY"))
            .put("derivedness", derivedness)

    private fun baseProvenance(metadata: Metadata, recordType: String): JSONObject =
        JSONObject()
            .put("adapter_schema", ADAPTER_SCHEMA)
            .put("record_type", recordType)
            .put("data_origin_package", metadata.dataOrigin.packageName)
            .put("recording_method", recordingMethod(metadata.recordingMethod))
            .put("recording_method_code", metadata.recordingMethod)
            .put("health_connect_record_id", metadata.id)
            .put("last_modified_time", metadata.lastModifiedTime.toString())
            .put("device", JSONObject().apply {
                val device = metadata.device
                if (device == null) {
                    put("present", false)
                } else {
                    put("present", true)
                    put("type", device.type)
                    putNullable("manufacturer", device.manufacturer)
                    putNullable("model", device.model)
                }
            })

    private fun sourceId(metadata: Metadata, recordType: String): String =
        "hc:" + metadata.dataOrigin.packageName + ":" + recordType

    private fun sourceClass(metadata: Metadata): String =
        when (metadata.device?.type) {
            Device.TYPE_WATCH,
            Device.TYPE_FITNESS_BAND,
            Device.TYPE_RING,
            Device.TYPE_CHEST_STRAP -> "WEARABLE"
            Device.TYPE_PHONE -> "PHONE"
            else -> "IMPORT"
        }

    private fun recordingMethod(value: Int): String =
        when (value) {
            Metadata.RECORDING_METHOD_ACTIVELY_RECORDED -> "ACTIVELY_RECORDED"
            Metadata.RECORDING_METHOD_AUTOMATICALLY_RECORDED -> "AUTOMATICALLY_RECORDED"
            Metadata.RECORDING_METHOD_MANUAL_ENTRY -> "MANUAL_ENTRY"
            else -> "UNKNOWN"
        }

    private fun JSONObject.putNullable(key: String, value: Any?): JSONObject =
        put(key, value ?: JSONObject.NULL)
}
