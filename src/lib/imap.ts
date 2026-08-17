import { ImapFlow } from "imapflow";
import { simpleParser, type ParsedMail } from "mailparser";

// Reads the shared mailbox that receives the Netflix emails (same inbox your imap.php used).
function getConfig() {
  const host = process.env.IMAP_HOST;
  const user = process.env.IMAP_USER;
  const pass = process.env.IMAP_PASSWORD;
  if (!host || !user || !pass) {
    throw new Error("Mailbox is not configured. Set IMAP_HOST, IMAP_USER and IMAP_PASSWORD.");
  }
  const port = parseInt(process.env.IMAP_PORT || "993", 10);
  const secure = (process.env.IMAP_SECURE || "true").toLowerCase() !== "false";
  return { host, port, secure, auth: { user, pass } };
}

async function withClient<T>(fn: (client: ImapFlow) => Promise<T>): Promise<T> {
  const client = new ImapFlow({
    ...getConfig(),
    logger: false,
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 25_000,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    try {
      await client.logout();
    } catch {
      /* ignore */
    }
  }
}

// The mailbox is shared, so we must not trust a "Netflix" display name alone — a spoofed
// message could otherwise poison the returned code/link. Only accept mail whose PARSED
// sender address is on a netflix.com domain.
function isFromNetflix(parsed: ParsedMail): boolean {
  const from = parsed.from;
  const list = from && Array.isArray(from.value) ? from.value : [];
  for (const a of list) {
    const addr = (a.address || "").toLowerCase().trim();
    const at = addr.lastIndexOf("@");
    if (at === -1) continue;
    const domain = addr.slice(at + 1);
    if (domain === "netflix.com" || domain.endsWith(".netflix.com")) return true;
  }
  return false;
}

type Extractor = (html: string, text: string) => string | null;

// Finds the newest genuine Netflix email addressed to `email` since `sinceMs`, runs `extract` on it.
async function findNewest(email: string, sinceMs: number, extract: Extractor): Promise<string | null> {
  return withClient(async (client) => {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const uids =
        (await client.search({ from: "Netflix", to: email, since: new Date(sinceMs) }, { uid: true })) || [];
      if (!uids.length) return null;
      const ordered = [...uids].sort((a, b) => b - a); // newest first
      for (const uid of ordered) {
        const msg = await client.fetchOne(uid, { source: true }, { uid: true });
        if (!msg || !msg.source) continue;
        const parsed = await simpleParser(msg.source as Buffer);
        if (!isFromNetflix(parsed)) continue; // reject spoofed / non-Netflix senders
        const html = typeof parsed.html === "string" ? parsed.html : "";
        const text = parsed.text || "";
        const found = extract(html, text);
        if (found) return found;
      }
      return null;
    } finally {
      lock.release();
    }
  });
}

function decodeEntities(s: string): string {
  return (s || "")
    .replace(/&amp;/gi, "&")
    .replace(/&#0*61;/g, "=")
    .replace(/&#x0*3d;/gi, "=")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/g, "'");
}

// Matches the classic reset link (/password?...) AND the newer one-time sign-in link (/ilum?code=...).
const NETFLIX_LINK = /https:\/\/www\.netflix\.com\/(?:password|ilum)\?[^\s"'<>\]]+/i;

export async function fetchResetLink(email: string): Promise<string | null> {
  const since = Date.now() - 24 * 60 * 60 * 1000;
  return findNewest(email, since, (html, text) => {
    for (const body of [text, decodeEntities(html)]) {
      if (!body) continue;
      const m = body.match(NETFLIX_LINK);
      if (m) return m[0];
    }
    return null;
  });
}

export async function fetchSignInCode(email: string): Promise<string | null> {
  const since = Date.now() - 2 * 60 * 60 * 1000;
  return findNewest(email, since, (html, text) => extractCode(html, text));
}

function isYear(code: string): boolean {
  return /^20\d{2}$/.test(code);
}

// Mirrors the PHP logic: prefer a 4-digit number sitting on its own between tags,
// then fall back to any standalone 4-digit number that isn't a year.
function extractCode(html: string, text: string): string | null {
  const source = html || text || "";
  const cleaned = source
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");

  for (const m of cleaned.matchAll(/>\s*(\d{4})\s*</g)) {
    if (!isYear(m[1])) return m[1];
  }

  const hasHtml = /<html|<body/i.test(source);
  const haystack = hasHtml ? cleaned.replace(/<[^>]+>/g, " ") : text || cleaned;
  for (const m of haystack.matchAll(/(?<!\d)(\d{4})(?!\d)/g)) {
    if (!isYear(m[1])) return m[1];
  }
  return null;
}
