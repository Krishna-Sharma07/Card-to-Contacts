import Contacts from 'react-native-contacts';
import type { Contact, PostalAddress } from 'react-native-contacts';

export type ContactForm = {
  name: string;
  title: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  address: string;
};

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

async function ensureContactsPermission(): Promise<void> {
  const existing = await Contacts.checkPermission();
  if (existing === 'authorized' || existing === 'limited') {
    return;
  }
  const requested = await Contacts.requestPermission();
  if (requested !== 'authorized' && requested !== 'limited') {
    throw new Error('Contacts permission was denied.');
  }
}

export async function saveContactFromForm(form: ContactForm): Promise<Contact> {
  await ensureContactsPermission();

  const { givenName, familyName } = splitName(form.name);

  return Contacts.addContact({
    givenName,
    familyName,
    company: form.company || null,
    jobTitle: form.title,
    phoneNumbers: form.phone ? [{ label: 'mobile', number: form.phone }] : [],
    emailAddresses: form.email ? [{ label: 'work', email: form.email }] : [],
    urlAddresses: form.website ? [{ label: 'work', url: form.website }] : [],
    postalAddresses: form.address ? [buildPostalAddress(form.address)] : [],
  });
}
