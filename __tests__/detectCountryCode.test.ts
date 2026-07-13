import { getCountry } from 'react-native-localize';
import { detectDefaultCountryCode } from '../src/services/detectCountryCode';

jest.mock('react-native-localize', () => ({
  getCountry: jest.fn(),
}));

const mockGetCountry = getCountry as jest.Mock;

describe('detectDefaultCountryCode', () => {
  it('maps the device region to a calling code', () => {
    mockGetCountry.mockReturnValue('IN');

    expect(detectDefaultCountryCode()).toBe('+91');
  });

  it('falls back to an empty string for an unrecognized region', () => {
    mockGetCountry.mockReturnValue('ZZ');

    expect(detectDefaultCountryCode()).toBe('');
  });

  it('falls back to an empty string when the device region cannot be read', () => {
    mockGetCountry.mockImplementation(() => {
      throw new Error('native module unavailable');
    });

    expect(detectDefaultCountryCode()).toBe('');
  });
});
