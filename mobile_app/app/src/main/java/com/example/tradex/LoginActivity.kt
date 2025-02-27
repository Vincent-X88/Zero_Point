package com.example.tradex

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

// Data classes for sign in and device linking
data class SignInRequest(val email: String, val password: String)
data class User(val id: Int, val email: String)
data class SignInResponse(val message: String, val token: String, val user: User)

data class DeviceLinkRequest(val deviceName: String, val deviceIdentifier: String, val userId: Int)
data class LinkedDevice(val id: Int, val deviceName: String, val deviceIdentifier: String, val linkedAt: String, val userId: Int)
data class DeviceLinkResponse(val message: String, val device: LinkedDevice)

// Retrofit API interface
interface ApiService {
    @retrofit2.http.POST("auth/signin")
    fun signIn(@retrofit2.http.Body request: SignInRequest): Call<SignInResponse>

    @retrofit2.http.POST("devices/link")
    fun linkDevice(@retrofit2.http.Body request: DeviceLinkRequest): Call<DeviceLinkResponse>
}

// RetrofitClient singleton (adjust the BASE_URL accordingly)
object RetrofitClient {
    private const val BASE_URL = "" 

    val api: ApiService by lazy {
        retrofit2.Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(retrofit2.converter.gson.GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}

class LoginActivity : AppCompatActivity() {

    private lateinit var emailEditText: EditText
    private lateinit var passwordEditText: EditText
    private lateinit var signInButton: Button
    private lateinit var sharedPreferences: SharedPreferences

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login) // link to the XML layout

        emailEditText = findViewById(R.id.emailEditText)
        passwordEditText = findViewById(R.id.passwordEditText)
        signInButton = findViewById(R.id.signInButton)
        sharedPreferences = getSharedPreferences("appPrefs", Context.MODE_PRIVATE)

        signInButton.setOnClickListener {
            val email = emailEditText.text.toString().trim()
            val password = passwordEditText.text.toString().trim()
            if (email.isNotEmpty() && password.isNotEmpty()) {
                signIn(email, password)
            } else {
                Toast.makeText(this, "Please enter email and password", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun signIn(email: String, password: String) {
        RetrofitClient.api.signIn(SignInRequest(email, password)).enqueue(object : Callback<SignInResponse> {
            override fun onResponse(call: Call<SignInResponse>, response: Response<SignInResponse>) {
                if (response.isSuccessful && response.body() != null) {
                    val signInResponse = response.body()!!
                    val userId = signInResponse.user.id

                    // Retrieve device details
                    val deviceName = Build.MODEL
                    val deviceId = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID)

                    // Store device ID locally
                    sharedPreferences.edit().putString("device_id", deviceId).apply()

                    // Send device info to backend
                    linkDevice(userId, deviceName, deviceId)
                } else {
                    Toast.makeText(this@LoginActivity, "Sign in failed", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onFailure(call: Call<SignInResponse>, t: Throwable) {
                Toast.makeText(this@LoginActivity, "Network error", Toast.LENGTH_SHORT).show()
            }
        })
    }

    private fun linkDevice(userId: Int, deviceName: String, deviceId: String) {
        val request = DeviceLinkRequest(deviceName, deviceId, userId)
        RetrofitClient.api.linkDevice(request).enqueue(object : Callback<DeviceLinkResponse> {
            override fun onResponse(call: Call<DeviceLinkResponse>, response: Response<DeviceLinkResponse>) {
                if (response.isSuccessful) {
                    Toast.makeText(this@LoginActivity, "Device linked successfully", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this@LoginActivity, "Failed to link device", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onFailure(call: Call<DeviceLinkResponse>, t: Throwable) {
                Toast.makeText(this@LoginActivity, "Network error", Toast.LENGTH_SHORT).show()
            }
        })
    }
}
