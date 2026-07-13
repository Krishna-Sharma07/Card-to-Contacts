import { longestKnownCallingCodePrefix } from './countryCallingCodes';

// A line of OCR'd text paired with its printed height (from the recognizer's
// bounding box, in image pixels). Optional almost everywhere below because
// tests and other callers may only have plain text with no layout info.
export type OcrLine = {
  text: string;
  height: number;
};

export type ParsedCardFields = {
  name?: string;
  title?: string;
  company?: string;
  phones: string[];
  email?: string;
  website?: string;
  address?: string;
};

const EMAIL_REGEX = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+/g;

// OCR sometimes drops the "@" glyph entirely and reads it as a stray capital
// letter dropped into an otherwise-lowercase word, e.g. "hello@site.com"
// comes back as "helloGsite.com". That shape -- lowercase run, single
// uppercase letter, lowercase run ending in a dotted TLD -- is distinctive
// enough on a business card to safely restore the "@" before the normal
// email extraction below runs.
const GARBLED_AT_REGEX = /\b([a-z0-9._%+-]{2,})([A-Z])([a-z0-9-]+(?:\.[a-z0-9-]+)+)\b/g;

function recoverGarbledAtSymbols(text: string): string {
  return text.replace(GARBLED_AT_REGEX, (_match, local, _capital, domain) => `${local}@${domain}`);
}

// OCR often garbles a character next to the "@" (e.g. misreads the domain's
// "." as ","), which makes a well-formed email fail EMAIL_REGEX entirely.
// Any token that contains exactly one "@" is almost certainly an email, so
// fall back to this looser match to catch those cases too.
const LOOSE_EMAIL_TOKEN_REGEX = /\S*@\S*/g;

// OCR sometimes splits a domain across a stray space (e.g.
// "info@LTDTAPES.com" comes back as "info@LTD TAPES.com"). The "@" token
// alone ("info@LTD") correctly fails the real-email check below, but the
// leftover "TAPES.com" continuation would otherwise still look like a
// standalone website to WEBSITE_REGEX. Match the whole broken span --
// including one same-line continuation word -- purely so it can be scrubbed
// from the text before website detection runs.
const BROKEN_EMAIL_SPAN_REGEX = /\S*@\S*(?:[ \t]+\S*\.[a-zA-Z]{2,})?/g;

const WEBSITE_REGEX =
  /\b(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}(?:\/[^\s]*)?\b/g;

const PHONE_REGEX =
  /(?:\+\d{1,3}[ .-]?)?\(?\d{2,4}\)?[ .-]?\d{3,4}[ .-]?\d{3,4}(?:[ .-]?\d{2,4})?/g;

const COMPANY_KEYWORDS =
  /\b(inc|llc|ltd|corp|co|company|group|solutions|enterprises|technologies|technology|industries|partners|associates|consulting)\b\.?/i;

const TITLE_KEYWORDS =
  /\b(manager|director|engineer|ceo|cto|cfo|coo|president|founder|owner|executive|officer|sales|marketing|consultant|representative|specialist|analyst|designer|developer|architect|coordinator|supervisor|vice president|vp)\b/i;

const ADDRESS_KEYWORDS =
  /\b(street|st\.?|avenue|ave\.?|road|rd\.?|boulevard|blvd\.?|drive|dr\.?|suite|ste\.?|floor|fl\.?|lane|ln\.?|way|plaza|building|bldg\.?)\b/i;

function digitCount(value: string): number {
  return (value.match(/\d/g) || []).length;
}

// Pulls a leading "+<code>" off a phone number already carrying its own
// country code, e.g. "+91 9876543210" -> "+91". Used to prefer whatever the
// card actually printed over a guess based on the device's own region.
// OCR frequently drops the space after the code (e.g. "+917977636041"), so
// this can't just grab up to 3 digits -- it has to check which prefix is an
// actual known calling code (see longestKnownCallingCodePrefix).
export function extractPhoneCountryCode(phone: string): string | undefined {
  const digitsAfterPlus = phone.trim().match(/^\+(\d{1,3})/)?.[1];
  return digitsAfterPlus ? longestKnownCallingCodePrefix(digitsAfterPlus) : undefined;
}

// Legal-entity suffixes are often parenthesized ("Century Distributors (P)
// Ltd."), and a bare "(P)" fails the per-word shape check below since it
// doesn't start with a letter. Ignore short parenthetical asides when
// judging a line's shape, without discarding them from the returned text.
function stripParentheticals(line: string): string {
  return line
    .replace(/\([^)]{0,10}\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function candidateWords(line: string): string[] {
  return stripParentheticals(line).split(/\s+/).filter(Boolean);
}

function isNameLike(line: string): boolean {
  const words = candidateWords(line);
  if (words.length < 1 || words.length > 4) {
    return false;
  }
  return words.every(word => /^[A-Z][a-zA-Z'.-]*$/.test(word));
}

// Business cards commonly print the person's name in all caps, distinct from
// a mixed-case tagline/subtitle line (e.g. a "Real Estate" line under the
// company name). Prefer that signal over the first title-case line found.
function isAllCapsName(line: string): boolean {
  const words = candidateWords(line);
  if (words.length < 1 || words.length > 4) {
    return false;
  }
  return words.every(word => /^[A-Z][A-Z'.-]*$/.test(word));
}

// The tallest printed text on a card is virtually always its headline (the
// person's or company's name) -- designers make it the most visually
// prominent thing there. That's a far more reliable signal than word casing,
// which can't tell a stylized brand mark ("J-NX") from the actual name.
function tallestLine(candidates: string[], ocrLines: OcrLine[]): string | undefined {
  const heightByText = new Map<string, number>();
  for (const line of ocrLines) {
    const key = line.text.trim();
    const existing = heightByText.get(key);
    if (existing === undefined || line.height > existing) {
      heightByText.set(key, line.height);
    }
  }

  let best: { candidate: string; height: number } | undefined;
  for (const candidate of candidates) {
    const height = heightByText.get(candidate);
    if (height && (!best || height > best.height)) {
      best = { candidate, height };
    }
  }
  return best?.candidate;
}

// A single stray word -- a certification mark, a unit ("3M"), a garbled
// logo ("LTT" from a misread stylized "LTD") -- is common noise on a card
// and can legitimately be the tallest printed thing on it (oversized brand
// wordmarks are common). An actual name is almost always 2+ words, so treat
// any multi-word candidate as strictly more trustworthy before ever
// comparing heights.
function pickBestNameCandidate(candidates: string[], ocrLines: OcrLine[]): string | undefined {
  const multiWord = candidates.filter(candidate => candidateWords(candidate).length >= 2);
  const pool = multiWord.length > 0 ? multiWord : candidates;
  return tallestLine(pool, ocrLines) ?? pool.find(isAllCapsName) ?? pool[0];
}

export function parseCardFields(rawText: string, ocrLines: OcrLine[] = []): ParsedCardFields {
  const text = recoverGarbledAtSymbols(rawText);

  const strictEmails = text.match(EMAIL_REGEX) || [];

  const looseEmailCandidates = (text.match(LOOSE_EMAIL_TOKEN_REGEX) || [])
    .map(token => token.replace(/^[(["'{]+/, '').replace(/[)\]"'{}.,;:]+$/, ''))
    .filter(token => {
      if ((token.match(/@/g) || []).length !== 1) {
        return false;
      }
      const [local, domain] = token.split('@');
      // A bare word with no dot/comma (the usual OCR stand-in for a dot) has
      // no TLD-like structure at all -- almost certainly not actually an
      // email, just some other "@"-adjacent OCR noise (e.g. a stray
      // "info@LTD" fragment from a misread multi-word domain).
      return local.length > 0 && domain.length > 0 && /[.,]/.test(domain);
    });

  const emails = Array.from(new Set([...strictEmails, ...looseEmailCandidates]));

  // Scrub every "@"-adjacent span, not just the ones that qualified as real
  // emails -- a rejected fragment is still OCR noise around an "@" and
  // shouldn't leave a stray domain-looking remnant for WEBSITE_REGEX to pick up.
  const brokenEmailSpans = text.match(BROKEN_EMAIL_SPAN_REGEX) || [];

  let textWithoutEmails = text;
  Array.from(new Set([...emails, ...brokenEmailSpans])).forEach(span => {
    textWithoutEmails = textWithoutEmails.replace(span, '');
  });

  const websites = (textWithoutEmails.match(WEBSITE_REGEX) || [])
    .map(site => site.trim())
    .filter(Boolean);

  const phoneCandidates = text.match(PHONE_REGEX) || [];
  const phones = Array.from(
    new Set(
      phoneCandidates
        .map(candidate => candidate.trim())
        .filter(candidate => {
          const digits = digitCount(candidate);
          return digits >= 7 && digits <= 15;
        }),
    ),
  );

  const matchedSpans = [...emails, ...websites, ...phones];
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(line => !matchedSpans.some(span => span && line.includes(span)));

  let company: string | undefined;
  let title: string | undefined;
  const addressLines: string[] = [];
  const nameCandidates: string[] = [];

  for (const line of lines) {
    if (!company && COMPANY_KEYWORDS.test(line)) {
      company = line;
      continue;
    }
    if (!title && TITLE_KEYWORDS.test(line)) {
      title = line;
      continue;
    }
    if (ADDRESS_KEYWORDS.test(line) || /^\d+\s+\S/.test(line)) {
      addressLines.push(line);
      continue;
    }
    if (isNameLike(line)) {
      nameCandidates.push(line);
    }
  }

  const name =
    pickBestNameCandidate(nameCandidates, ocrLines) ??
    lines.find(line => line !== company && line !== title && !addressLines.includes(line));

  return {
    name,
    title,
    company,
    phones,
    email: emails[0],
    website: websites[0],
    address: addressLines.length > 0 ? addressLines.join(', ') : undefined,
  };
}
