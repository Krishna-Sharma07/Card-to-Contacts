import { NativeModules } from 'react-native';
import { getCountry } from 'react-native-localize';
import { callingCodeForRegion } from './countryCallingCodes';

const { SimCountry } = NativeModules;

// Best-effort default only, tried in order:
// 1. The SIM's registered network country -- matches the phone's actual
//    country regardless of how the device's language/region setting is
//    configured, and needs no permission to read.
// 2. The device's configured region setting, for SIM-less devices (e.g. a
//    WiFi-only tablet) or when the carrier doesn't report one.
// The user can always overwrite the result.
export async function detectDefaultCountryCode(): Promise<string> {
  try {
    const simRegion: string | undefined = await SimCountry?.getSimCountryIso?.();
    const simCode = callingCodeForRegion(simRegion);
    if (simCode) {
      return simCode;
    }
  } catch {
    // fall through to the locale-based guess below
  }

  try {
    return callingCodeForRegion(getCountry()) ?? '';
  } catch {
    return '';
  }
}
