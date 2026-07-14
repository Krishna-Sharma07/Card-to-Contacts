import { NativeModules } from 'react-native';
import { getCountry } from 'react-native-localize';
import { detectDefaultCountryCode } from '../src/services/detectCountryCode';

jest.mock('react-native-localize', () => ({
  getCountry: jest.fn(),
}));

jest.mock('react-native', () => ({
  NativeModules: {
    SimCountry: {
      getSimCountryIso: jest.fn(),
    },
  },
}));

const mockGetCountry = getCountry as jest.Mock;
const mockGetSimCountryIso = NativeModules.SimCountry.getSimCountryIso as jest.Mock;

describe('detectDefaultCountryCode', () => {
  beforeEach(() => {
    mockGetCountry.mockReset();
    mockGetSimCountryIso.mockReset();
  });

  it('prefers the SIM-reported country over the device region setting', async () => {
    mockGetSimCountryIso.mockResolvedValue('IN');
    mockGetCountry.mockReturnValue('GB');

    await expect(detectDefaultCountryCode()).resolves.toBe('+91');
  });

  it('falls back to the device region when the SIM reports nothing (e.g. no SIM installed)', async () => {
    mockGetSimCountryIso.mockResolvedValue('');
    mockGetCountry.mockReturnValue('IN');

    await expect(detectDefaultCountryCode()).resolves.toBe('+91');
  });

  it('falls back to the device region when the native module throws', async () => {
    mockGetSimCountryIso.mockRejectedValue(new Error('native module unavailable'));
    mockGetCountry.mockReturnValue('IN');

    await expect(detectDefaultCountryCode()).resolves.toBe('+91');
  });

  it('falls back to an empty string for an unrecognized region', async () => {
    mockGetSimCountryIso.mockResolvedValue('');
    mockGetCountry.mockReturnValue('ZZ');

    await expect(detectDefaultCountryCode()).resolves.toBe('');
  });

  it('falls back to an empty string when the device region cannot be read either', async () => {
    mockGetSimCountryIso.mockResolvedValue('');
    mockGetCountry.mockImplementation(() => {
      throw new Error('native module unavailable');
    });

    await expect(detectDefaultCountryCode()).resolves.toBe('');
  });
});
