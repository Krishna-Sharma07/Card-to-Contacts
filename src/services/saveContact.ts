import { PermissionsAndroid } from 'react-native';
import Contacts from 'react-native-contacts';
import type { Contact, PostalAddress } from 'react-native-contacts';

export type ContactForm = {
  name: string;
  title: string;
  company: string;
  phones: string[];
  countryCode: string;
  email: string;
  website: string;
  address: string;
};

// A phone already printed with its own country code (starts with "+") is
// left untouched; only bare local numbers get the form's country code
// applied, so a per-number code on the card always wins.
function applyCountryCode(number: string, countryCode: string): string {
  if (number.startsWith('+') || !countryCode.trim()) {
    return number;
  }
  return `${countryCode.trim()} ${number}`;
}

function splitName(fullName: string): { givenName: string; familyName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { givenName: '', familyName: '' };
  }
  const [givenName, ...rest] = parts;
  return { givenName, familyName: rest.join(' ') };
}

function buildPostalAddress(formattedAddress: string): PostalAddress {
  return {
    label: 'work',
    formattedAddress,
    street: formattedAddress,
    pobox: '',
    neighborhood: '',
    city: '',
    region: '',
    state: '',
    postCode: '',
    country: '',
  };
}

// react-native-contacts reads the photo straight off disk (BitmapFactory.decodeFile),
// which doesn't understand a "file://" URI scheme, only a bare filesystem path.
function toFilePath(uri?: string): string | undefined {
  if (!uri) {
    return undefined;
  }
  return uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
}

async function ensureContactsPermission(): Promise<void> {
  const results = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
    PermissionsAndroid.PERMISSIONS.WRITE_CONTACTS,
  ]);
  const granted = (permission: string) =>
    results[permission as keyof typeof results] === PermissionsAndroid.RESULTS.GRANTED;

  if (
    !granted(PermissionsAndroid.PERMISSIONS.READ_CONTACTS) ||
    !granted(PermissionsAndroid.PERMISSIONS.WRITE_CONTACTS)
  ) {
    throw new Error('Contacts permission was denied.');
  }
}

export async function saveContactFromForm(
  form: ContactForm,
  photoUri?: string,
): Promise<Contact> {
  await ensureContactsPermission();

  const { givenName, familyName } = splitName(form.name);
  const phoneNumbers = form.phones
    .map(number => number.trim())
    .filter(Boolean)
    .map(number => applyCountryCode(number, form.countryCode))
    .map(number => ({ label: 'mobile', number }));

  return Contacts.addContact({
    givenName,
    familyName,
    company: form.company || null,
    jobTitle: form.title,
    phoneNumbers,
    emailAddresses: form.email ? [{ label: 'work', email: form.email }] : [],
    urlAddresses: form.website ? [{ label: 'work', url: form.website }] : [],
    postalAddresses: form.address ? [buildPostalAddress(form.address)] : [],
    thumbnailPath: toFilePath(photoUri),
  });
}
