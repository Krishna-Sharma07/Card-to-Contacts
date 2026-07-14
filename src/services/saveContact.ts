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

function buildContactFields(form: ContactForm, photoUri?: string): Partial<Contact> {
  const { givenName, familyName } = splitName(form.name);
  const phoneNumbers = form.phones
    .map(number => number.trim())
    .filter(Boolean)
    .map(number => applyCountryCode(number, form.countryCode))
    .map(number => ({ label: 'mobile', number }));

  return {
    givenName,
    familyName,
    company: form.company || null,
    jobTitle: form.title,
    phoneNumbers,
    emailAddresses: form.email ? [{ label: 'work', email: form.email }] : [],
    urlAddresses: form.website ? [{ label: 'work', url: form.website }] : [],
    postalAddresses: form.address ? [buildPostalAddress(form.address)] : [],
    thumbnailPath: toFilePath(photoUri),
  };
}

export async function saveContactFromForm(
  form: ContactForm,
  photoUri?: string,
): Promise<Contact> {
  await ensureContactsPermission();
  return Contacts.addContact(buildContactFields(form, photoUri));
}

export async function updateContactFromForm(
  recordID: string,
  form: ContactForm,
  photoUri?: string,
): Promise<void> {
  await ensureContactsPermission();
  return Contacts.updateContact({ ...buildContactFields(form, photoUri), recordID });
}

// Looks for a contact that already has one of the form's phone numbers, so the
// caller can offer to update it instead of silently creating a duplicate.
export async function findExistingContactByPhone(form: ContactForm): Promise<Contact | null> {
  await ensureContactsPermission();

  const numbers = form.phones
    .map(number => number.trim())
    .filter(Boolean)
    .map(number => applyCountryCode(number, form.countryCode));

  for (const number of numbers) {
    const matches = await Contacts.getContactsByPhoneNumber(number);
    if (matches.length > 0) {
      return matches[0];
    }
  }
  return null;
}
