package io.github.field.bodybridge

import android.app.Activity
import android.os.Bundle
import android.widget.ScrollView
import android.widget.TextView

class PermissionsRationaleActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val body = TextView(this).apply {
            textSize = 16f
            setPadding(dp(22), dp(28), dp(22), dp(28))
            text = """
BODY / HEALTH CONNECT — local privacy boundary

WHY THESE TWO PERMISSIONS
• Sleep: export recent sleep-session timing/duration into BODY / FIT.
• Heart rate: export recent source samples into BODY / FIT.

WHAT THIS APP DOES
• Reads only after you grant Health Connect access.
• Reads only while you use the app in the foreground.
• Builds a local 0xxx0/body-sensor-bundle/v0.1 JSON packet.
• Saves a file only when you explicitly choose SAVE JSON.

WHAT THIS APP DOES NOT DO
• No INTERNET permission.
• No analytics, account, cloud upload or advertising.
• No background Health Connect read permission.
• No Health Connect write permissions.
• No medication, diagnosis or treatment authority.
• No silent transfer into BODY / FIT.

You can revoke Health Connect access at any time in Health Connect settings.
            """.trimIndent()
        }
        setContentView(ScrollView(this).apply { addView(body) })
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt()
}
