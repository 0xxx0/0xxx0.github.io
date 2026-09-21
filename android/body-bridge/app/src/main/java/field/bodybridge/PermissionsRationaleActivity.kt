package field.bodybridge

import android.app.Activity
import android.os.Bundle
import android.widget.TextView

class PermissionsRationaleActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(
            TextView(this).apply {
                textSize = 18f
                setPadding(48, 48, 48, 48)
                text = """
                    BODY BRIDGE · LOCAL READ-ONLY PROOF

                    Reads only Sleep and Heart Rate records you explicitly grant through Health Connect.

                    The app reads the last 48 hours of sleep sessions, then reads heart-rate records only inside those sleep intervals.

                    Data is not uploaded, transmitted, scored, diagnosed, or written back to Health Connect. Export happens only when you choose a local JSON document.
                """.trimIndent()
            }
        )
    }
}
