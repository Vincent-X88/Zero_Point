package com.example.tradex

import android.content.Context
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkRequest
import java.util.concurrent.TimeUnit

class WorkManagerHelper(val context: Context) {

    fun scheduleAppUsageTracking() {
        val appUsageWorkRequest: WorkRequest = OneTimeWorkRequestBuilder<AppUsageWorker>()
            .setInitialDelay(1, TimeUnit.DAYS) // Delay the first execution by 1 day
            .build()

        WorkManager.getInstance(context).enqueue(appUsageWorkRequest)
    }
}
