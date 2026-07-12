import { parseCardFields } from '../src/services/parseCardFields';

describe('parseCardFields', () => {
  it('extracts name, title, company, phone, email, and website from a typical card', () => {
    const text = [
      'Jane Doe',
      'Senior Sales Manager',
      'Acme Solutions Inc.',
      '+1 (555) 123-4567',
      'jane.doe@acme.com',
      'www.acme.com',
    ].join('\n');

    const result = parseCardFields(text);

    expect(result.name).toBe('Jane Doe');
    expect(result.title).toBe('Senior Sales Manager');
    expect(result.company).toBe('Acme Solutions Inc.');
    expect(result.phone).toBe('+1 (555) 123-4567');
    expect(result.email).toBe('jane.doe@acme.com');
    expect(result.website).toBe('www.acme.com');
  });

  it('extracts a street address on its own line', () => {
    const text = ['John Smith', '123 Main Street', 'Springfield, IL'].join('\n');

    const result = parseCardFields(text);

    expect(result.address).toContain('123 Main Street');
  });

  it('does not confuse a phone number with a website or email', () => {
    const text = ['Acme Inc.', '555-123-4567'].join('\n');

    const result = parseCardFields(text);

    expect(result.phone).toBe('555-123-4567');
    expect(result.email).toBeUndefined();
    expect(result.website).toBeUndefined();
  });

  it('returns undefined fields when nothing is recognizable', () => {
    const result = parseCardFields('');

    expect(result).toEqual({
      name: undefined,
      title: undefined,
      company: undefined,
      phone: undefined,
      email: undefined,
      website: undefined,
      address: undefined,
    });
  });

  it('picks the first email and phone when multiple are present', () => {
    const text = [
      'Jane Doe',
      'jane@acme.com',
      'jane.doe@personal.com',
      '555-111-2222',
      '555-333-4444',
    ].join('\n');

    const result = parseCardFields(text);

    expect(result.email).toBe('jane@acme.com');
    expect(result.phone).toBe('555-111-2222');
  });
});
