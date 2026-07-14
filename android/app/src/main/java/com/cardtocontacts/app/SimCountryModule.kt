package com.cardtocontacts.app

import android.content.Context
import android.telephony.TelephonyManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

// getSimCountryIso() needs no permission -- it just reads the SIM's
// registered network country, which is a far more reliable guess at a
// scanned card's country than the device's language/region setting (that
// can be set to anything regardless of where the SIM/phone number is from).
class SimCountryModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "SimCountry"

  @ReactMethod
  fun getSimCountryIso(promise: Promise) {
    val telephonyManager =
      reactApplicationContext.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
    promise.resolve(telephonyManager?.simCountryIso?.uppercase().orEmpty())
  }
}
