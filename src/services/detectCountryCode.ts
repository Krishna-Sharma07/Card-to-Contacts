import { getCountry } from 'react-native-localize';
import { callingCodeForRegion } from './countryCallingCodes';

// Best-effort default only: based on the phone's configured region setting,
// not its actual physical location. The user can always overwrite it.
export function detectDefaultCountryCode(): string {
  try {
    return callingCodeForRegion(getCountry()) ?? '';
  } catch {
    return '';
  }
}
