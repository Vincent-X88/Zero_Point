package com.example.tradex

import android.app.usage.UsageStats
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Build
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.io.OutputStreamWriter
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

class AppUsageHelper(val context: Context) {

    private val usageStatsManager: UsageStatsManager =
        context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    private val urlBackend = "http://172.20.10.2:5000/api"

    // Get the app usage statistics for the past 24 hours
    fun getAppUsageStats(): List<AppUsageStats> {
        val endTime = System.currentTimeMillis()
        val startTime = endTime - 24 * 60 * 60 * 1000 // 24 hours ago

        // Query the usage stats
        val stats = usageStatsManager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY, startTime, endTime
        )

        // Sort the results based on the last time used
        val sortedStats = stats.filter { it.totalTimeInForeground > 0 }
            .sortedByDescending { it.lastTimeUsed }

        // Log the app usage data in a readable format
        sortedStats.forEach {
            Log.d("AppUsageHelper", "Package: ${it.packageName}, Time Spent: ${formatTime(it.totalTimeInForeground)}, Last Used: ${formatDate(it.lastTimeUsed)}")
        }

        return sortedStats.map {
            AppUsageStats(
                packageName = it.packageName,
                timeSpentInForeground = it.totalTimeInForeground,
                lastTimeUsed = it.lastTimeUsed
            )
        }
    }

    fun sendAppUsageDataToBackend(appUsageStats: List<AppUsageStats>) {
        // Create the JSON data to send
        val jsonArray = JSONArray()
        for (stat in appUsageStats) {
            val jsonObject = JSONObject()
            jsonObject.put("packageName", stat.packageName)
            jsonObject.put("timeSpentInForeground", stat.timeSpentInForeground)
            jsonObject.put("lastTimeUsed", stat.lastTimeUsed)
            jsonArray.put(jsonObject)
        }

        
        Log.d("AppUsageHelper", "Sending app usage data to backend: $jsonArray")

        
        sendToBackend(jsonArray)
    }

    private fun sendToBackend(jsonArray: JSONArray) {
        val url = URL("$urlBackend/app_usage_data")
        val connection = url.openConnection() as HttpURLConnection

        try {
            connection.apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json")
                doOutput = true
            }

            // Send the JSON data to the backend
            val outputStream = OutputStreamWriter(connection.outputStream)
            outputStream.write(jsonArray.toString())
            outputStream.flush()
            outputStream.close()

            val responseCode = connection.responseCode
            Log.d("AppUsageHelper", "Response Code: $responseCode")
        } catch (e: Exception) {
            Log.e("AppUsageHelper", "Error sending data to backend: ${e.message}", e)
        }
    }

    // Format the time spent in foreground (in milliseconds) into a readable format (hh:mm:ss)
    private fun formatTime(milliseconds: Long): String {
        val hours = TimeUnit.MILLISECONDS.toHours(milliseconds)
        val minutes = TimeUnit.MILLISECONDS.toMinutes(milliseconds) % 60
        val seconds = TimeUnit.MILLISECONDS.toSeconds(milliseconds) % 60
        return String.format("%02d:%02d:%02d", hours, minutes, seconds)
    }

    // Format the last used timestamp into a readable date format
    private fun formatDate(timestamp: Long): String {
        val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())
        return dateFormat.format(Date(timestamp))
    }

    fun sendInstalledAppsToBackend(apps: List<AppUsageStats>, deviceId: String) {
        if (apps.isEmpty()) {
            Log.w("AppUsageHelper", "No apps to send, skipping request.")
            return
        }

        // Create the JSON object with the key "apps"
        val jsonObject = JSONObject().apply {
            put("apps", JSONArray().apply {
                apps.forEach { app ->
                    val appJson = JSONObject().apply {
                        put("packageName", app.packageName)
                        put("timeSpentInForeground", app.timeSpentInForeground)
                        put("lastTimeUsed", app.lastTimeUsed)
                    }
                    put(appJson) // Add each app to the apps array
                    Log.d("AppUsageHelper", "Adding app to JSON: $appJson")
                }
            })
        }

        Log.d("AppUsageHelper", "Final JSON payload: $jsonObject")

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val url = URL("$urlBackend/mobile/device/$deviceId/apps")
                val connection = url.openConnection() as HttpURLConnection
                connection.apply {
                    requestMethod = "POST"
                    setRequestProperty("Content-Type", "application/json")
                    doOutput = true
                }

                
                connection.outputStream.bufferedWriter().use { it.write(jsonObject.toString()) }
                val responseCode = connection.responseCode

                withContext(Dispatchers.Main) {
                    if (responseCode == HttpURLConnection.HTTP_OK) {
                        Log.i("AppUsageHelper", "Successfully sent apps to backend.")
                    } else {
                        val errorStream = connection.errorStream?.bufferedReader()?.use { it.readText() }
                        Log.e("AppUsageHelper", "Failed to send apps. Code: $responseCode, Error: $errorStream")
                    }
                }
            } catch (e: Exception) {
                Log.e("AppUsageHelper", "Error sending apps: ${e.message}", e)
            }
        }
    }




}

data class AppUsageStats(
    val packageName: String,
    val timeSpentInForeground: Long, // Time in milliseconds
    val lastTimeUsed: Long // Timestamp
)
