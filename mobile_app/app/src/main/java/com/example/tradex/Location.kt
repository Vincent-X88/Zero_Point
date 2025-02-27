package com.example.tradex

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import org.java_websocket.client.WebSocketClient
import org.java_websocket.handshake.ServerHandshake
import org.json.JSONObject
import java.net.URI

class LocationService : Service() {

    private var webSocketClient: WebSocketClient? = null
    private val TAG = "LocationService"
    private val deviceId = "" 
    private val webSocketUrl = ""
    private val channelId = "location_service_channel"
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private var handler: Handler? = null

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        handler = Handler(mainLooper)
        setupNotificationChannel()
        startForeground(1, createNotification("Location Service is running"))
        setupWebSocketConnection()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    private fun getDeviceLocation(callback: (JSONObject?) -> Unit) {
        if (ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            Log.e(TAG, "Location permission not granted")
            callback(null)
            return
        }

        fusedLocationClient.lastLocation.addOnSuccessListener { location ->
            if (location != null) {
                callback(JSONObject().apply {
                    put("latitude", location.latitude)
                    put("longitude", location.longitude)
                })
            } else {
                val locationRequest = LocationRequest.Builder(
                    Priority.PRIORITY_HIGH_ACCURACY, 1000L
                ).build()

                val locationCallback = object : LocationCallback() {
                    override fun onLocationResult(locationResult: LocationResult) {
                        fusedLocationClient.removeLocationUpdates(this)
                        val updatedLocation = locationResult.lastLocation
                        if (updatedLocation != null) {
                            callback(JSONObject().apply {
                                put("latitude", updatedLocation.latitude)
                                put("longitude", updatedLocation.longitude)
                            })
                        } else {
                            callback(null)
                        }
                    }
                }

                fusedLocationClient.requestLocationUpdates(
                    locationRequest,
                    locationCallback,
                    handler!!.looper
                )
            }
        }.addOnFailureListener {
            Log.e(TAG, "Error retrieving location: ${it.message}")
            callback(null)
        }
    }

    private fun setupWebSocketConnection() {
        val uri = URI(webSocketUrl)
        webSocketClient = object : WebSocketClient(uri) {
            override fun onOpen(handshakedata: ServerHandshake?) {
                Log.i(TAG, "Connected to WebSocket with deviceId: $deviceId")
            }

            override fun onMessage(message: String?) {
                message?.let {
                    Log.i(TAG, "Message received: $message")
                    try {
                        val jsonMessage = JSONObject(it)
                        val action = jsonMessage.getString("action")
                        when (action) {
                            "locationUpdate" -> {
                                getDeviceLocation { location ->
                                    if (location != null) {
                                        webSocketClient?.send(JSONObject().apply {
                                            put("action", "locationUpdate")
                                            put("deviceId", deviceId)
                                            put("location", location)
                                        }.toString())
                                        Log.i(TAG, "Location sent: $location")
                                    } else {
                                        Log.e(TAG, "Location not available")
                                    }
                                }
                            }
                            "lock" -> lockDevice()
                            "unlock" -> unlockDevice()
                            else -> Log.w(TAG, "Unhandled action: $action")
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Error processing message: ${e.message}")
                    }
                }
            }

            override fun onClose(code: Int, reason: String?, remote: Boolean) {
                Log.i(TAG, "WebSocket connection closed: $reason")
            }

            override fun onError(ex: Exception?) {
                Log.e(TAG, "WebSocket error: ${ex?.message}")
            }
        }
        webSocketClient?.connect()
    }

    private fun setupNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Location Service",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun createNotification(contentText: String): Notification {
        return NotificationCompat.Builder(this, channelId)
            .setContentTitle("Location Service")
            .setContentText(contentText)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        webSocketClient?.close()
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    private fun lockDevice() {
        Log.i(TAG, "lock device has been called")
        val lockScreenHelper = LockScreenHelper(this)
        lockScreenHelper.lockScreen()
    }

    private fun unlockDevice() {
        stopLockActivity()
    }

    private fun stopLockActivity() {
        val intent = Intent(this, LockActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        intent.putExtra("unlock", true)
        startActivity(intent)
    }
}
