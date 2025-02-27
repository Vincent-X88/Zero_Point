package com.example.tradex

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class AppUsageWorker(val context: Context, workerParams: WorkerParameters) : CoroutineWorker(context, workerParams) {

    private val sharedPreferences: SharedPreferences =
        context.getSharedPreferences("BlockedAppsPrefs", Context.MODE_PRIVATE)

    override suspend fun doWork(): Result {
        return withContext(Dispatchers.IO) {
            try {
                val appUsageHelper = AppUsageHelper(context)
                val usageStats = appUsageHelper.getAppUsageStats()

                // Define the time limit: 1 hour (3600000 ms)
                val timeLimit = 3600000L
                val blockedApps = mutableSetOf<String>()

                for (stat in usageStats) {
                    if (stat.timeSpentInForeground > timeLimit) {
                        Log.d("AppUsageWorker", "App ${stat.packageName} exceeded time limit.")
                        blockedApps.add(stat.packageName)
                    }
                }

                // Save blocked apps to SharedPreferences
                saveBlockedApps(blockedApps)

                Result.success()
            } catch (e: Exception) {
                Log.e("AppUsageWorker", "Error during doWork: ${e.message}", e)
                Result.failure()
            }
        }
    }

    private fun saveBlockedApps(blockedApps: Set<String>) {
        sharedPreferences.edit().apply {
            putStringSet("BlockedApps", blockedApps)
            apply()
        }
    }
}
