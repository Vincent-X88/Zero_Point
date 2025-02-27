package com.example.tradex

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log


class LockScreenHelper(private val context: Context) {

    private val devicePolicyManager = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    private val adminComponent = ComponentName(context, MyDeviceAdminReceiver::class.java)
    private val PIN = "1234" // Replace with the desired PIN

    private val TAG = "Lockscreenservice"

    fun lockScreen() {
        if (devicePolicyManager.isAdminActive(adminComponent)) {
            devicePolicyManager.lockNow()
            Log.i(TAG, "Lock device has been executed completely")
        } else {
            requestAdminPermission()
        }
    }

    private fun requestAdminPermission() {
        val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN)
        intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent)
        intent.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, "Enable admin to lock the screen.")
        context.startActivity(intent)
    }
}
