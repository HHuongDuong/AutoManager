package com.automanager.mobile

import android.app.Application
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.uimanager.ViewManager

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              add(DeviceLocationPackage())
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}

class DeviceLocationPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(DeviceLocationModule(reactContext))
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}

class DeviceLocationModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "DeviceLocationModule"

  @ReactMethod
  fun getCurrentLocation(options: ReadableMap?, promise: Promise) {
    val locationManager =
      reactApplicationContext.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
        ?: run {
          promise.reject("LOCATION_UNAVAILABLE", "Location service is unavailable.")
          return
        }

    val hasFinePermission = ContextCompat.checkSelfPermission(
      reactApplicationContext,
      android.Manifest.permission.ACCESS_FINE_LOCATION
    ) == PackageManager.PERMISSION_GRANTED
    val hasCoarsePermission = ContextCompat.checkSelfPermission(
      reactApplicationContext,
      android.Manifest.permission.ACCESS_COARSE_LOCATION
    ) == PackageManager.PERMISSION_GRANTED

    if (!hasFinePermission && !hasCoarsePermission) {
      promise.reject("LOCATION_PERMISSION_DENIED", "Location permission denied.")
      return
    }

    val timeoutMs = if (options?.hasKey("timeoutMs") == true) {
      options.getInt("timeoutMs").toLong()
    } else {
      15000L
    }
    val maximumAgeMs = if (options?.hasKey("maximumAgeMs") == true) {
      options.getInt("maximumAgeMs").toLong()
    } else {
      10000L
    }

    val providers = listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)
      .filter { provider ->
        try {
          locationManager.isProviderEnabled(provider)
        } catch (_: Exception) {
          false
        }
      }

    if (providers.isEmpty()) {
      promise.reject("LOCATION_DISABLED", "Location services are disabled.")
      return
    }

    val lastKnownLocation = providers
      .mapNotNull { provider ->
        try {
          locationManager.getLastKnownLocation(provider)
        } catch (_: SecurityException) {
          null
        }
      }
      .maxByOrNull { it.time }

    if (lastKnownLocation != null && System.currentTimeMillis() - lastKnownLocation.time <= maximumAgeMs) {
      promise.resolve(lastKnownLocation.toWritableMap())
      return
    }

    val handler = Handler(Looper.getMainLooper())
    val listeners = mutableListOf<LocationListener>()
    var isResolved = false

    fun cleanup() {
      listeners.forEach { listener ->
        try {
          locationManager.removeUpdates(listener)
        } catch (_: Exception) {
          // ignore cleanup errors
        }
      }
    }

    val timeoutRunnable = Runnable {
      if (isResolved) return@Runnable
      isResolved = true
      cleanup()
      promise.reject("LOCATION_TIMEOUT", "Timed out while waiting for a location fix.")
    }

    providers.forEach { provider ->
      val listener = object : LocationListener {
        override fun onLocationChanged(location: Location) {
          if (isResolved) return
          isResolved = true
          handler.removeCallbacks(timeoutRunnable)
          cleanup()
          promise.resolve(location.toWritableMap())
        }

        override fun onProviderEnabled(providerName: String) = Unit

        override fun onProviderDisabled(providerName: String) = Unit

        override fun onStatusChanged(providerName: String?, status: Int, extras: Bundle?) = Unit
      }

      listeners.add(listener)
      locationManager.requestLocationUpdates(provider, 0L, 0f, listener, Looper.getMainLooper())
    }

    handler.postDelayed(timeoutRunnable, timeoutMs)
  }

  private fun Location.toWritableMap() = Arguments.createMap().apply {
    putDouble("latitude", latitude)
    putDouble("longitude", longitude)
  }
}
