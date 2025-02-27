package com.example.tradex

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Intent

import android.os.Bundle
import android.widget.Button

import androidx.appcompat.app.AppCompatActivity

class LockActivity : AppCompatActivity() {



    private lateinit var devicePolicyManager: DevicePolicyManager
    private lateinit var adminComponent: ComponentName

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        devicePolicyManager = getSystemService(DEVICE_POLICY_SERVICE) as DevicePolicyManager
        adminComponent = ComponentName(this, MyDeviceAdminReceiver::class.java)


    }

    private fun requestAdminPermission() {
        if (!devicePolicyManager.isAdminActive(adminComponent)) {
            val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN)
            intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent)
            intent.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, "Enable admin to lock the screen.")
            startActivityForResult(intent, 1)
        }
    }


}
