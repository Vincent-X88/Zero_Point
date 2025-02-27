package com.example.tradex

import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class BlockActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_block)

        val packageName = intent.getStringExtra("PACKAGE_NAME") ?: ""

        if (packageName.isNotEmpty()) {
            Toast.makeText(this, "Time limit exceeded for $packageName.", Toast.LENGTH_LONG).show()
            blockApp(packageName)
        } else {
            Toast.makeText(this, "No app data received.", Toast.LENGTH_SHORT).show()
        }
    }

    private fun blockApp(packageName: String) {
        try {
            val packageManager: PackageManager = packageManager
            val appInfo = packageManager.getApplicationInfo(packageName, 0)
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)

            if (launchIntent != null) {
                Toast.makeText(this, "Redirecting to block activity for $packageName.", Toast.LENGTH_SHORT).show()
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                startActivity(launchIntent)
            } else {
                // App has no launch intent
                Toast.makeText(this, "Launch intent not found for $packageName", Toast.LENGTH_SHORT).show()
            }
        } catch (e: PackageManager.NameNotFoundException) {
            Toast.makeText(this, "Package not found: $packageName", Toast.LENGTH_SHORT).show()
        }
    }
}
