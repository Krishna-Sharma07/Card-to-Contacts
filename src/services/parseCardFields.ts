export type ParsedCardFields = {
  name?: string;
  title?: string;
  company?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
};

const EMAIL_REGEX = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+/g;

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

function isNameLike(line: string): boolean {
  const words = line.trim().split(/\s+/);
  if (words.length < 1 || words.length > 4) {
    return false;
  }
  return words.every(word => /^[A-Z][a-zA-Z'.-]*$/.test(word));
}

export function parseCardFields(rawText: string): ParsedCardFields {
  const emails = rawText.match(EMAIL_REGEX) || [];
  let textWithoutEmails = rawText;
  emails.forEach(email => {
    textWithoutEmails = textWithoutEmails.replace(email, '');
  });

  const websites = (textWithoutEmails.match(WEBSITE_REGEX) || [])
    .map(site => site.trim())
    .filter(Boolean);

  const phoneCandidates = rawText.match(PHONE_REGEX) || [];
  const phones = phoneCandidates
    .map(candidate => candidate.trim())
    .filter(candidate => {
      const digits = digitCount(candidate);
      return digits >= 7 && digits <= 15;
    });

  const matchedSpans = [...emails, ...websites, ...phones];
  const lines = rawText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(line => !matchedSpans.some(span => span && line.includes(span)));

  let company: string | undefined;
  let title: string | undefined;
  let name: string | undefined;
  const addressLines: string[] = [];

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
    if (!name && isNameLike(line)) {
      name = line;
    }
  }

  if (!name) {
    name = lines.find(
      line => line !== company && line !== title && !addressLines.includes(line),
    );
  }

  return {
    name,
    title,
    company,
    phone: phones[0],
    email: emails[0],
    website: websites[0],
    address: addressLines.length > 0 ? addressLines.join(', ') : undefined,
  };
}
