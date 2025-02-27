package com.example.tradex

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.widget.Toast
import kotlinx.coroutines.*
import org.java_websocket.client.WebSocketClient
import org.java_websocket.handshake.ServerHandshake
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL

class AppBlockerService : AccessibilityService() {

    private lateinit var sharedPreferences: SharedPreferences
    private val backendUrl = "http://172.20.10.2:5000" 
    private var webSocketClient: WebSocketClient? = null
    private val deviceId = ""

    override fun onServiceConnected() {
        super.onServiceConnected()
        sharedPreferences = getSharedPreferences("BlockedAppsPrefs", Context.MODE_PRIVATE)

        // Send installed apps to backend
        val appUsageHelper = AppUsageHelper(this)
        CoroutineScope(Dispatchers.IO).launch {
            val usageStats = appUsageHelper.getAppUsageStats()
            appUsageHelper.sendInstalledAppsToBackend(usageStats, deviceId)
        }

        // Fetch blocked apps from backend
        fetchBlockedAppsFromBackend()

        // Connect to WebSocket server
        setupWebSocketConnection(deviceId)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null || event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val packageName = event.packageName?.toString()
        if (packageName != null && isAppBlocked(packageName)) {
            blockApp(packageName)
        }
    }

    private fun fetchBlockedAppsFromBackend() {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                
                val url = URL("$backendUrl/device/$deviceId/block-apps")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"

                val responseCode = connection.responseCode
                if (responseCode == HttpURLConnection.HTTP_OK) {
                    val response = connection.inputStream.bufferedReader().use { it.readText() }
                    val blockedApps = JSONArray(response)
                    saveBlockedApps(blockedApps)
                } else {
                    Log.e("AppBlockerService", "Failed to fetch blocked apps. Code: $responseCode")
                }
            } catch (e: Exception) {
                Log.e("AppBlockerService", "Error fetching blocked apps: ${e.message}", e)
            }
        }
    }

    private fun saveBlockedApps(blockedApps: JSONArray) {
        val editor = sharedPreferences.edit()
        val blockedAppsSet = mutableSetOf<String>()
        for (i in 0 until blockedApps.length()) {
            val app = blockedApps.getJSONObject(i)
            val packageName = app.getString("packageName")
            blockedAppsSet.add(packageName)
        }
        editor.putStringSet("BlockedApps", blockedAppsSet)
        editor.apply()
    }

    private fun isAppBlocked(packageName: String): Boolean {
        val blockedApps = sharedPreferences.getStringSet("BlockedApps", emptySet()) ?: emptySet()
        return blockedApps.contains(packageName)
    }

    private fun blockApp(packageName: String) {
        Toast.makeText(this, "Blocking $packageName due to time limit.", Toast.LENGTH_LONG).show()
        Log.i("AppBlockerService", "Blocking app: $packageName")
        val intent = Intent(this, BlockActivity::class.java).apply {
            putExtra("PACKAGE_NAME", packageName)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        startActivity(intent)
    }

    private fun setupWebSocketConnection(deviceId: String) {
        val webSocketUrl = "ws://172.20.10.2:5001?deviceId=$deviceId&client=mobile" 
        val uri = URI(webSocketUrl)
        webSocketClient = object : WebSocketClient(uri) {
            override fun onOpen(handshakedata: ServerHandshake?) {
                Log.i("WebSocket", "Connected to WebSocket with deviceId: $deviceId")
            }

            override fun onMessage(message: String?) {
                message?.let {
                    Log.i("WebSocket", "Message received: $message")
                    try {
                        val jsonMessage = JSONObject(it)
                        when (jsonMessage.getString("action")) {
                            "block" -> {
                                val blockedApps = jsonMessage.getJSONArray("apps")
                                handleBlockedApps(blockedApps)
                            }
                            "unblock" -> {
                                val unblockedApps = jsonMessage.getJSONArray("apps")
                                handleUnblockedApps(unblockedApps)
                            }
                            else -> Log.w("WebSocket", "Unknown action in message: $it")
                        }
                    } catch (e: Exception) {
                        Log.e("WebSocket", "Error processing message: ${e.message}")
                    }
                }
            }

            override fun onClose(code: Int, reason: String?, remote: Boolean) {
                Log.i("WebSocket", "WebSocket connection closed: $reason. Reconnecting...")
                reconnectWebSocket(deviceId)
            }

            override fun onError(ex: Exception?) {
                Log.e("WebSocket", "WebSocket error: ${ex?.message}. Reconnecting...")
                reconnectWebSocket(deviceId)
            }
        }
        webSocketClient?.connect()
    }

    private fun reconnectWebSocket(deviceId: String) {
        // Wait 5 seconds and then try to reconnect
        CoroutineScope(Dispatchers.IO).launch {
            delay(5000)
            Log.i("WebSocket", "Reconnecting WebSocket for device: $deviceId")
            setupWebSocketConnection(deviceId)
        }
    }

    private fun handleBlockedApps(blockedApps: JSONArray) {
        // Process the blocked apps and store them in SharedPreferences
        saveBlockedApps(blockedApps)
        Log.i("WebSocket", "Processed blocked apps: $blockedApps")
    }

    private fun handleUnblockedApps(unblockApps: JSONArray) {
        // Remove unblocked apps from SharedPreferences
        val blockedApps = sharedPreferences.getStringSet("BlockedApps", emptySet())?.toMutableSet()
        for (i in 0 until unblockApps.length()) {
            val packageName = unblockApps.getString(i)
            blockedApps?.remove(packageName)
        }
        sharedPreferences.edit().putStringSet("BlockedApps", blockedApps).apply()
        Log.i("WebSocket", "Processed unblocked apps: $unblockApps")
    }

    override fun onInterrupt() {
        Log.w("AppBlockerService", "Accessibility service interrupted.")
        webSocketClient?.close()
    }
}
