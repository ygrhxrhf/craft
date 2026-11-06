/**
 * G144 — email access has two levels: individual addresses (comma-separated bulk paste) and an
 * email-domain allowlist. The copy is verbatim from `feature-catalog.md`.
 *
 * The parsing lives here so both the panel and the server action agree on what an entry means:
 * addresses are lower-cased and de-duplicated, domains are stored as bare suffixes (no `@`), and
 * invalid entries are rejected as a list so the panel can show the official failure sentence.
 */

export const ADD_EMAILS_PLACEHOLDER = '添加单个电子邮件或粘贴逗号分隔的列表';
export const ADD_EMAIL_DOMAIN = '添加电子邮件域';
export const ADD_EMAIL_ACCESS_FAIL = '无法添加电子邮件访问权限';
export const ADD_EMAIL_DOMAIN_ACCESS_FAIL = '无法添加邮箱域名访问权限';

/** `全部 [0] 个电子邮件地址` — the aggregate line above the two lists. */
export function allEmailAddresses(count: number): string {
  return `全部 ${count} 个电子邮件地址`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;

export interface AccessLists {
  emails: string[];
  domains: string[];
}

/** Split a pasted list on commas, semicolons or newlines (people paste all three). */
export function splitAccessList(value: string): string[] {
  return value
    .split(/[,;\n\r]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return EMAIL_RE.test(email) ? email : null;
}

export function normalizeDomain(value: string): string | null {
  const domain = value.trim().toLowerCase().replace(/^@/, '');
  return DOMAIN_RE.test(domain) ? domain : null;
}

/** Divide a pasted list into valid/invalid addresses, preserving the first valid occurrence. */
export function parseEmails(value: string): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const entry of splitAccessList(value)) {
    const email = normalizeEmail(entry);
    if (!email) invalid.push(entry);
    else if (!valid.includes(email)) valid.push(email);
  }
  return { valid, invalid };
}

export function parseDomains(value: string): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const entry of splitAccessList(value)) {
    const domain = normalizeDomain(entry);
    if (!domain) invalid.push(entry);
    else if (!valid.includes(domain)) valid.push(domain);
  }
  return { valid, invalid };
}

/** Read the two JSON columns defensively; a non-array or non-string entry is dropped. */
export function readAccessLists(raw: { allowedEmails?: unknown; allowedDomains?: unknown }): AccessLists {
  const list = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
  return { emails: list(raw.allowedEmails), domains: list(raw.allowedDomains) };
}