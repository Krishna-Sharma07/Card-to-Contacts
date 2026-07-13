import { saveContactFromForm } from '../src/services/saveContact';
import Contacts from 'react-native-contacts';

jest.mock('react-native-contacts', () => ({
  __esModule: true,
  default: {
    checkPermission: jest.fn(),
    requestPermission: jest.fn(),
    addContact: jest.fn(),
  },
}));

const mockCheckPermission = Contacts.checkPermission as jest.Mock;
const mockRequestPermission = Contacts.requestPermission as jest.Mock;
const mockAddContact = Contacts.addContact as jest.Mock;

const baseForm = {
  name: 'Jane Doe',
  title: 'Sales Manager',
  company: 'Acme Inc.',
  phone: '555-123-4567',
  email: 'jane@acme.com',
  website: 'www.acme.com',
  address: '123 Main Street',
};

describe('saveContactFromForm', () => {
  beforeEach(() => {
    mockCheckPermission.mockReset();
    mockRequestPermission.mockReset();
    mockAddContact.mockReset();
    mockAddContact.mockResolvedValue({ recordID: '1' });
  });

  it('saves a contact when permission is already authorized', async () => {
    mockCheckPermission.mockResolvedValue('authorized');

    await saveContactFromForm(baseForm);

    expect(mockRequestPermission).not.toHaveBeenCalled();
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

  it('requests permission when not yet granted', async () => {
    mockCheckPermission.mockResolvedValue('denied');
    mockRequestPermission.mockResolvedValue('authorized');

    await saveContactFromForm(baseForm);

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(mockAddContact).toHaveBeenCalledTimes(1);
  });

  it('throws when permission is denied and never saves a contact', async () => {
    mockCheckPermission.mockResolvedValue('denied');
    mockRequestPermission.mockResolvedValue('denied');

    await expect(saveContactFromForm(baseForm)).rejects.toThrow(
      'Contacts permission was denied.',
    );
    expect(mockAddContact).not.toHaveBeenCalled();
  });

  it('splits a single-word name into given name only', async () => {
    mockCheckPermission.mockResolvedValue('authorized');

    await saveContactFromForm({ ...baseForm, name: 'Madonna' });

    expect(mockAddContact).toHaveBeenCalledWith(
      expect.objectContaining({ givenName: 'Madonna', familyName: '' }),
    );
  });

  it('omits phone, email, website, and address when blank', async () => {
    mockCheckPermission.mockResolvedValue('authorized');

    await saveContactFromForm({
      name: 'Jane Doe',
      title: '',
      company: '',
      phone: '',
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
