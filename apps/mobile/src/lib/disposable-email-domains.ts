/**
 * Keep in sync with `web/src/lib/auth/disposable-email-domains.ts` (lowercased hostnames).
 */
const DISPOSABLE: ReadonlySet<string> = new Set(
  [
    "mailinator.com",
    "mailinator2.com",
    "guerrillamail.com",
    "guerrillamailblock.com",
    "grr.la",
    "pokemail.net",
    "10minutemail.com",
    "10minutemail.net",
    "yopmail.com",
    "yopmail.net",
    "yopmail.fr",
    "tempmail.com",
    "tempmail.net",
    "tempmailo.com",
    "tempmail.org",
    "tempmail.ninja",
    "throwawaymail.com",
    "trashmail.com",
    "trashmail.de",
    "trashmail.net",
    "disposablemail.com",
    "getnada.com",
    "moakt.com",
    "maildrop.cc",
    "mohmal.com",
    "mohmal.im",
    "fakemailgenerator.com",
    "fakermail.com",
    "armyspy.com",
    "cuvox.de",
    "rhyta.com",
    "gustr.com",
    "pwp.lv",
    "fakemails.click",
    "mailsac.com",
    "mail.gw",
    "mailslurp.com",
    "mailslurp.org",
    "mailslurp.in",
    "boun.cr",
    "bouncr.com",
    "dispostable.com",
    "mintemail.com",
    "mvrht.com",
    "inboxkitten.com",
    "harakirimail.com",
    "melt.li",
    "meltmail.com",
    "deadaddress.com",
    "spam4.me",
    "spamgourmet.com",
    "sneakemail.com",
    "mailmetrash.com",
    "mailhazard.com",
    "mfsa.ru",
    "faketemp.email",
    "crazymailing.com",
    "dropmail.me",
    "tmail.ws",
    "tmailor.com",
    "tmpmail.com",
    "tmpmail.org",
    "tmpmail.net",
    "e4ward.com",
    "mfsa.com",
  ].map((d) => d.toLowerCase().trim()),
);

export function getEmailDomain(email: string): string | null {
  const s = email.trim().toLowerCase();
  const at = s.lastIndexOf("@");
  if (at < 1 || at === s.length - 1) return null;
  return s.slice(at + 1);
}

export function isDisposableEmailDomain(email: string): boolean {
  const domain = getEmailDomain(email);
  if (!domain) return false;
  if (DISPOSABLE.has(domain)) return true;
  const parts = domain.split(".");
  for (let n = 2; n <= parts.length; n += 1) {
    const parent = parts.slice(-n).join(".");
    if (DISPOSABLE.has(parent)) return true;
  }
  return false;
}
