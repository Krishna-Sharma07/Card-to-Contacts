import {
  callingCodeForRegion,
  longestKnownCallingCodePrefix,
} from '../src/services/countryCallingCodes';

describe('callingCodeForRegion', () => {
  it('returns the calling code for a known region', () => {
    expect(callingCodeForRegion('IN')).toBe('+91');
    expect(callingCodeForRegion('US')).toBe('+1');
    expect(callingCodeForRegion('GB')).toBe('+44');
  });

  it('is case-insensitive', () => {
    expect(callingCodeForRegion('in')).toBe('+91');
  });

  it('returns undefined for an unrecognized region', () => {
    expect(callingCodeForRegion('ZZ')).toBeUndefined();
  });

  it('returns undefined when no region is given', () => {
    expect(callingCodeForRegion(undefined)).toBeUndefined();
    expect(callingCodeForRegion('')).toBeUndefined();
  });
});

describe('longestKnownCallingCodePrefix', () => {
  it('picks the real 2-digit code instead of an unassigned 3-digit prefix', () => {
    expect(longestKnownCallingCodePrefix('917977636041')).toBe('+91');
  });

  it('picks a 1-digit code correctly', () => {
    expect(longestKnownCallingCodePrefix('15551234567')).toBe('+1');
  });

  it('picks a 3-digit code when that is the real one', () => {
    expect(longestKnownCallingCodePrefix('2331234567')).toBe('+233');
  });

  it('returns undefined for digits matching no known code', () => {
    expect(longestKnownCallingCodePrefix('0001234567')).toBeUndefined();
  });
});
