import { extractPhoneCountryCode, parseCardFields } from '../src/services/parseCardFields';

describe('extractPhoneCountryCode', () => {
  it('pulls the leading country code off a number that has one', () => {
    expect(extractPhoneCountryCode('+91 9876543210')).toBe('+91');
    expect(extractPhoneCountryCode('+1 (555) 123-4567')).toBe('+1');
  });

  it('returns undefined for a number with no country code', () => {
    expect(extractPhoneCountryCode('9876543210')).toBeUndefined();
  });

  it('correctly separates the code from the local number when OCR drops the space', () => {
    // Real OCR output from a scanned card: "+91 7977636041" came back with
    // no space, so a naive "grab up to 3 digits" would wrongly read "+917".
    expect(extractPhoneCountryCode('+917977636041')).toBe('+91');
    expect(extractPhoneCountryCode('+15551234567')).toBe('+1');
  });
});

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
    expect(result.phones).toEqual(['+1 (555) 123-4567']);
    expect(result.email).toBe('jane.doe@acme.com');
    expect(result.website).toBe('www.acme.com');
  });

  it('keeps a printed country code so the number stays fully dialable internationally', () => {
    const text = ['Jane Doe', '+91 9876543210'].join('\n');

    const result = parseCardFields(text);

    expect(result.phones).toEqual(['+91 9876543210']);
  });

  it('extracts a street address on its own line', () => {
    const text = ['John Smith', '123 Main Street', 'Springfield, IL'].join('\n');

    const result = parseCardFields(text);

    expect(result.address).toContain('123 Main Street');
  });

  it('folds a city/state/zip continuation line into the address instead of dropping it', () => {
    const text = ['John Smith', '123 Main Street', 'Springfield, IL 62701'].join('\n');

    const result = parseCardFields(text);

    expect(result.address).toBe('123 Main Street, Springfield, IL 62701');
  });

  it('does not drop the last digit of a space-separated phone number (e.g. Indian mobile format)', () => {
    const text = ['Jane Doe', '98765 43210'].join('\n');

    const result = parseCardFields(text);

    expect(result.phones).toEqual(['98765 43210']);
  });

  it('recognizes an Indian-style address that leads with a plot/building number instead of a bare digit', () => {
    // Real OCR output from a scanned card: neither line has a street
    // keyword, and "M-18," starts with a letter, not a digit, so it was
    // silently dropped instead of being recognized as an address.
    const text = [
      'ANAND ELECTRICALS (INDIA)',
      'M-18, Mahalaxmi Market, Bhagirath Palace,',
      'Delhi-110006',
    ].join('\n');

    const result = parseCardFields(text);

    expect(result.address).toBe('M-18, Mahalaxmi Market, Bhagirath Palace, Delhi-110006');
  });

  it('does not confuse a phone number with a website or email', () => {
    const text = ['Acme Inc.', '555-123-4567'].join('\n');

    const result = parseCardFields(text);

    expect(result.phones).toEqual(['555-123-4567']);
    expect(result.email).toBeUndefined();
    expect(result.website).toBeUndefined();
  });

  it('returns undefined fields when nothing is recognizable', () => {
    const result = parseCardFields('');

    expect(result).toEqual({
      name: undefined,
      title: undefined,
      company: undefined,
      phones: [],
      email: undefined,
      website: undefined,
      address: undefined,
    });
  });

  it('picks the first email and collects every phone number when multiple are present', () => {
    const text = [
      'Jane Doe',
      'jane@acme.com',
      'jane.doe@personal.com',
      '555-111-2222',
      '555-333-4444',
    ].join('\n');

    const result = parseCardFields(text);

    expect(result.email).toBe('jane@acme.com');
    expect(result.phones).toEqual(['555-111-2222', '555-333-4444']);
  });

  it('prefers an all-caps printed name over a mixed-case tagline under the company name', () => {
    const text = [
      'Liceria & Co.',
      'Real Estate',
      'MORGAN MAXWELL',
      'General Manager',
      '+123-456-7890',
      'hello@reallygreatsite.com',
      'www.reallygreatsite.com',
      '123 Anywhere St, Any City, ST 12345',
    ].join('\n');

    const result = parseCardFields(text);

    expect(result.name).toBe('MORGAN MAXWELL');
    expect(result.company).toBe('Liceria & Co.');
    expect(result.title).toBe('General Manager');
  });

  it('recognizes a malformed address as an email as long as it contains an "@"', () => {
    // Simulates OCR misreading the "." in the domain as a "," -- the strict
    // email regex won't match "acme,com", but the "@" is still a strong signal.
    const text = ['Jane Doe', 'jane.doe@acme,com'].join('\n');

    const result = parseCardFields(text);

    expect(result.email).toBe('jane.doe@acme,com');
  });

  it('does not treat a bare "@" with no local or domain part as an email', () => {
    const text = ['Jane Doe', 'Find us @ the conference'].join('\n');

    const result = parseCardFields(text);

    expect(result.email).toBeUndefined();
  });

  it('prefers a strict email match but still recognizes a second malformed one', () => {
    const text = ['jane@acme.com', 'backup contact: jane,doe@acme.com'].join('\n');

    const result = parseCardFields(text);

    expect(result.email).toBe('jane@acme.com');
  });

  it('recovers an "@" that OCR dropped and read as a stray capital letter', () => {
    // Real OCR output from a scanned card: "hello@reallygreatsite.com" came
    // back with the "@" glyph misread as a "G".
    const text = [
      'MORGAN MAXWELL',
      '+123-456-7890',
      'helloGreallygreatsite.com',
      'www.reallygreatsite.com',
    ].join('\n');

    const result = parseCardFields(text);

    expect(result.email).toBe('hello@reallygreatsite.com');
    expect(result.website).toBe('www.reallygreatsite.com');
  });

  it('does not mistake a normal capitalized word for a dropped "@"', () => {
    const text = ['Jane Doe', 'www.AcmeSolutions.com'].join('\n');

    const result = parseCardFields(text);

    expect(result.email).toBeUndefined();
  });

  it('picks the most prominent (tallest) printed line as the name, not a small logo mark', () => {
    // Real card: a tiny "J-NX" brand logo in a corner, and a large red
    // underlined "Rishabh Overseas" headline. Word-casing alone can't tell
    // these apart -- both look like plausible names -- but their printed
    // size makes the actual headline obvious.
    const text = ['J-NX', 'Rishabh Overseas', '+91 7977636041'].join('\n');
    const ocrLines = [
      { text: 'J-NX', height: 18 },
      { text: 'Rishabh Overseas', height: 42 },
      { text: '+91 7977636041', height: 20 },
    ];

    const result = parseCardFields(text, ocrLines);

    expect(result.name).toBe('Rishabh Overseas');
  });

  it('still prefers the tallest candidate even when it is the all-caps one', () => {
    const text = ['Liceria & Co.', 'Real Estate', 'MORGAN MAXWELL'].join('\n');
    const ocrLines = [
      { text: 'Liceria & Co.', height: 20 },
      { text: 'Real Estate', height: 16 },
      { text: 'MORGAN MAXWELL', height: 30 },
    ];

    const result = parseCardFields(text, ocrLines);

    expect(result.name).toBe('MORGAN MAXWELL');
  });

  it('falls back to the all-caps heuristic when no height data is available for the candidates', () => {
    const text = ['Real Estate', 'MORGAN MAXWELL'].join('\n');

    const result = parseCardFields(text, []);

    expect(result.name).toBe('MORGAN MAXWELL');
  });

  it('prefers the multi-word company name over a taller single-word logo garble', () => {
    // Real card: a giant stylized "LTD" logo OCR'd as the nonsense word
    // "LTT" -- genuinely the tallest text on the card -- alongside the
    // actual business name "Century Distributors (P) Ltd." in a smaller
    // (but still multi-word) font. A single stray word should never win
    // over a real multi-word candidate just because it happens to be a
    // giant logo mark.
    const text = [
      'LTD TAPES',
      'LTT',
      'STRONG SECURE STYLISH TAPES',
      'NITTO',
      'Century Distributors (P) Ltd.',
    ].join('\n');
    const ocrLines = [
      { text: 'LTD TAPES', height: 20 },
      { text: 'LTT', height: 80 },
      { text: 'STRONG SECURE STYLISH TAPES', height: 14 },
      { text: 'NITTO', height: 16 },
      { text: 'Century Distributors (P) Ltd.', height: 28 },
    ];

    const result = parseCardFields(text, ocrLines);

    expect(result.name).toBe('Century Distributors (P) Ltd.');
  });

  it('tolerates a short parenthetical suffix like "(P)" in an otherwise name-shaped line', () => {
    // Two distinct company-keyword lines: the first claims the `company`
    // slot, freeing the second to be evaluated as a name candidate, where
    // the "(P)" would otherwise disqualify it from isNameLike entirely.
    const text = ['Acme Corp.', 'Century Distributors (P) Ltd.'].join('\n');

    const result = parseCardFields(text);

    expect(result.company).toBe('Acme Corp.');
    expect(result.name).toBe('Century Distributors (P) Ltd.');
  });

  it('does not treat a bare word with no dot-like separator as an email domain', () => {
    // Real OCR output: "info@LTDTAPES.com" came back with a stray space,
    // "info@LTD TAPES.com". The "info@LTD" fragment has no TLD-like
    // structure and shouldn't be extracted as an email (or strip "TAPES.com"
    // out of the text, contaminating website detection).
    const text = ['info@LTD TAPES.com', 'Website: www.realsite.com'].join('\n');

    const result = parseCardFields(text);

    expect(result.email).toBeUndefined();
    expect(result.website).toBe('www.realsite.com');
  });
});
