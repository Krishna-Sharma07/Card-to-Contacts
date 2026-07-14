import { PermissionsAndroid } from 'react-native';
import {
  findExistingContactByPhone,
  saveContactFromForm,
  updateContactFromForm,
} from '../src/services/saveContact';
import Contacts from 'react-native-contacts';

jest.mock('react-native-contacts', () => ({
  __esModule: true,
  default: {
    addContact: jest.fn(),
    updateContact: jest.fn(),
    getContactsByPhoneNumber: jest.fn(),
  },
}));

const mockAddContact = Contacts.addContact as jest.Mock;
const mockUpdateContact = Contacts.updateContact as jest.Mock;
const mockGetContactsByPhoneNumber = Contacts.getContactsByPhoneNumber as jest.Mock;

// PermissionsAndroid.requestMultiple's typing maps every possible Android
// permission, not just the ones requested, so a literal result object can
// never satisfy it structurally -- cast through the real return type instead.
function contactsPermissionResult(
  read: string,
  write: string,
): Awaited<ReturnType<typeof PermissionsAndroid.requestMultiple>> {
  return {
    [PermissionsAndroid.PERMISSIONS.READ_CONTACTS]: read,
    [PermissionsAndroid.PERMISSIONS.WRITE_CONTACTS]: write,
  } as unknown as Awaited<ReturnType<typeof PermissionsAndroid.requestMultiple>>;
}

const baseForm = {
  name: 'Jane Doe',
  title: 'Sales Manager',
  company: 'Acme Inc.',
  phones: ['555-123-4567'],
  countryCode: '',
  email: 'jane@acme.com',
  website: 'www.acme.com',
  address: '123 Main Street',
};

describe('saveContactFromForm', () => {
  beforeEach(() => {
    mockAddContact.mockReset();
    mockAddContact.mockResolvedValue({ recordID: '1' });
    mockUpdateContact.mockReset();
    mockUpdateContact.mockResolvedValue(undefined);
    mockGetContactsByPhoneNumber.mockReset();
    mockGetContactsByPhoneNumber.mockResolvedValue([]);
    jest
      .spyOn(PermissionsAndroid, 'requestMultiple')
      .mockResolvedValue(
        contactsPermissionResult(
          PermissionsAndroid.RESULTS.GRANTED,
          PermissionsAndroid.RESULTS.GRANTED,
        ),
      );
  });

  it('saves a contact when permission is granted', async () => {
    await saveContactFromForm(baseForm);

    expect(mockAddContact).toHaveBeenCalledWith(
      expect.objectContaining({
        givenName: 'Jane',
        familyName: 'Doe',
        company: 'Acme Inc.',
        jobTitle: 'Sales Manager',
        phoneNumbers: [{ label: 'mobile', number: '555-123-4567' }],
        emailAddresses: [{ label: 'work', email: 'jane@acme.com' }],
        urlAddresses: [{ label: 'work', url: 'www.acme.com' }],
      }),
    );
  });

  it('saves every non-blank phone number found on the card', async () => {
    await saveContactFromForm({
      ...baseForm,
      phones: ['555-123-4567', '', '  555-999-8888  '],
    });

    expect(mockAddContact).toHaveBeenCalledWith(
      expect.objectContaining({
        phoneNumbers: [
          { label: 'mobile', number: '555-123-4567' },
          { label: 'mobile', number: '555-999-8888' },
        ],
      }),
    );
  });

  it('applies the country code to bare local numbers', async () => {
    await saveContactFromForm({
      ...baseForm,
      countryCode: '+91',
      phones: ['9876543210'],
    });

    expect(mockAddContact).toHaveBeenCalledWith(
      expect.objectContaining({
        phoneNumbers: [{ label: 'mobile', number: '+91 9876543210' }],
      }),
    );
  });

  it('does not double up a country code the card already printed on a number', async () => {
    await saveContactFromForm({
      ...baseForm,
      countryCode: '+91',
      phones: ['+44 20 7946 0958'],
    });

    expect(mockAddContact).toHaveBeenCalledWith(
      expect.objectContaining({
        phoneNumbers: [{ label: 'mobile', number: '+44 20 7946 0958' }],
      }),
    );
  });

  it('leaves numbers as-is when no country code is set', async () => {
    await saveContactFromForm({ ...baseForm, countryCode: '', phones: ['9876543210'] });

    expect(mockAddContact).toHaveBeenCalledWith(
      expect.objectContaining({
        phoneNumbers: [{ label: 'mobile', number: '9876543210' }],
      }),
    );
  });

  it('passes the card photo as the contact thumbnail, stripping the file:// scheme', async () => {
    await saveContactFromForm(baseForm, 'file:///data/user/0/app/cache/front.jpg');

    expect(mockAddContact).toHaveBeenCalledWith(
      expect.objectContaining({
        thumbnailPath: '/data/user/0/app/cache/front.jpg',
      }),
    );
  });

  it('omits the thumbnail when no photo uri is given', async () => {
    await saveContactFromForm(baseForm);

    expect(mockAddContact).toHaveBeenCalledWith(
      expect.objectContaining({ thumbnailPath: undefined }),
    );
  });

  it('throws when read permission is denied and never saves a contact', async () => {
    jest
      .spyOn(PermissionsAndroid, 'requestMultiple')
      .mockResolvedValue(
        contactsPermissionResult(
          PermissionsAndroid.RESULTS.DENIED,
          PermissionsAndroid.RESULTS.GRANTED,
        ),
      );

    await expect(saveContactFromForm(baseForm)).rejects.toThrow(
      'Contacts permission was denied.',
    );
    expect(mockAddContact).not.toHaveBeenCalled();
  });

  it('throws when write permission is denied and never saves a contact', async () => {
    jest
      .spyOn(PermissionsAndroid, 'requestMultiple')
      .mockResolvedValue(
        contactsPermissionResult(
          PermissionsAndroid.RESULTS.GRANTED,
          PermissionsAndroid.RESULTS.DENIED,
        ),
      );

    await expect(saveContactFromForm(baseForm)).rejects.toThrow(
      'Contacts permission was denied.',
    );
    expect(mockAddContact).not.toHaveBeenCalled();
  });

  it('splits a single-word name into given name only', async () => {
    await saveContactFromForm({ ...baseForm, name: 'Madonna' });

    expect(mockAddContact).toHaveBeenCalledWith(
      expect.objectContaining({ givenName: 'Madonna', familyName: '' }),
    );
  });

  it('omits phone, email, website, and address when blank', async () => {
    await saveContactFromForm({
      name: 'Jane Doe',
      title: '',
      company: '',
      phones: [],
      countryCode: '',
      email: '',
      website: '',
      address: '',
    });

    expect(mockAddContact).toHaveBeenCalledWith(
      expect.objectContaining({
        phoneNumbers: [],
        emailAddresses: [],
        urlAddresses: [],
        postalAddresses: [],
        company: null,
      }),
    );
  });
});

describe('updateContactFromForm', () => {
  beforeEach(() => {
    mockUpdateContact.mockReset();
    mockUpdateContact.mockResolvedValue(undefined);
    jest
      .spyOn(PermissionsAndroid, 'requestMultiple')
      .mockResolvedValue(
        contactsPermissionResult(
          PermissionsAndroid.RESULTS.GRANTED,
          PermissionsAndroid.RESULTS.GRANTED,
        ),
      );
  });

  it('updates the existing contact by recordID instead of creating a new one', async () => {
    await updateContactFromForm('42', baseForm);

    expect(mockUpdateContact).toHaveBeenCalledWith(
      expect.objectContaining({
        recordID: '42',
        givenName: 'Jane',
        familyName: 'Doe',
        phoneNumbers: [{ label: 'mobile', number: '555-123-4567' }],
      }),
    );
  });

  it('throws when permission is denied and never updates the contact', async () => {
    jest
      .spyOn(PermissionsAndroid, 'requestMultiple')
      .mockResolvedValue(
        contactsPermissionResult(
          PermissionsAndroid.RESULTS.DENIED,
          PermissionsAndroid.RESULTS.GRANTED,
        ),
      );

    await expect(updateContactFromForm('42', baseForm)).rejects.toThrow(
      'Contacts permission was denied.',
    );
    expect(mockUpdateContact).not.toHaveBeenCalled();
  });
});

describe('findExistingContactByPhone', () => {
  beforeEach(() => {
    mockGetContactsByPhoneNumber.mockReset();
    jest
      .spyOn(PermissionsAndroid, 'requestMultiple')
      .mockResolvedValue(
        contactsPermissionResult(
          PermissionsAndroid.RESULTS.GRANTED,
          PermissionsAndroid.RESULTS.GRANTED,
        ),
      );
  });

  it('returns null when no contact has a matching phone number', async () => {
    mockGetContactsByPhoneNumber.mockResolvedValue([]);

    const result = await findExistingContactByPhone(baseForm);

    expect(result).toBeNull();
  });

  it('returns the matching contact, applying the country code before searching', async () => {
    const existingContact = { recordID: '7', givenName: 'Jane' };
    mockGetContactsByPhoneNumber.mockImplementation(async (number: string) =>
      number === '+91 9876543210' ? [existingContact] : [],
    );

    const result = await findExistingContactByPhone({
      ...baseForm,
      countryCode: '+91',
      phones: ['9876543210'],
    });

    expect(result).toEqual(existingContact);
  });

  it('stops at the first phone number that has a match', async () => {
    mockGetContactsByPhoneNumber.mockImplementation(async (number: string) =>
      number === '555-999-8888' ? [{ recordID: '9' }] : [],
    );

    const result = await findExistingContactByPhone({
      ...baseForm,
      phones: ['555-111-1111', '555-999-8888'],
    });

    expect(result).toEqual({ recordID: '9' });
    expect(mockGetContactsByPhoneNumber).toHaveBeenCalledTimes(2);
  });

  it('throws when permission is denied', async () => {
    jest
      .spyOn(PermissionsAndroid, 'requestMultiple')
      .mockResolvedValue(
        contactsPermissionResult(
          PermissionsAndroid.RESULTS.DENIED,
          PermissionsAndroid.RESULTS.GRANTED,
        ),
      );

    await expect(findExistingContactByPhone(baseForm)).rejects.toThrow(
      'Contacts permission was denied.',
    );
  });
});
