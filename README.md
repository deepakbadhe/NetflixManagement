# Netflix Management

A small web app (Next.js) that fetches **Netflix sign-in codes** and **password reset links**
from a shared IMAP mailbox, with login and an admin panel.

- **Login** with email + password.
- **Get Sign-in Code** — the latest Netflix sign-in code (last 2 hours).
- **Reset Link** — the Netflix password / one-time sign-in link (last 24 hours). Matches both
  the classic `.../password?...` links and the newer `.../ilum?code=...` links.
- **Admin panel** (`/admin`) — create users (the **username is their email**), reset passwords,
  and delete users.
- **Per-user email lock** — a normal user can only look up **their own** account email. Admins
  can look up any email.

The first admin account is created automatically on first run from the `ADMIN_EMAIL` /
`ADMIN_PASSWORD` environment variables.

---

## Deploy to Vercel (step by step)

1. Go to **vercel.com → Add New → Project** and import the GitHub repo
   `deepakbadhe/NetflixManagement`. Vercel auto-detects Next.js — no build settings to change.

2. (Database) In the project, open **Storage → Create Database → Postgres** and attach it.
   This automatically adds a `DATABASE_URL` / `POSTGRES_URL` for you. *(Or skip this and paste
   your own Postgres URL as `DATABASE_URL` in step 3.)*

3. Open **Settings → Environment Variables** and add:

   | Key | Example / notes |
   | --- | --- |
   | `SESSION_SECRET` | a long random string — run `openssl rand -hex 32` |
   | `ADMIN_EMAIL` | the email you'll log in with as admin |
   | `ADMIN_PASSWORD` | a strong password for that admin |
   | `IMAP_HOST` | your mailbox IMAP host (e.g. `imap.yourhost.com`) |
   | `IMAP_PORT` | `993` |
   | `IMAP_USER` | the mailbox login |
   | `IMAP_PASSWORD` | the mailbox password |
   | `IMAP_SECURE` | `true` (leave as `true` for port 993) |
   | `DATABASE_URL` | only if you did NOT use Vercel Postgres in step 2 |

4. Click **Deploy**. On the first visit the app creates its database table and your admin
   account automatically. Log in at `/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

---

## How the mailbox lookup works

The app connects to one IMAP inbox (the same shared mailbox your old `imap.php` used) and
searches for the newest message `FROM "Netflix" TO "<email>"` within the time window, then
extracts the code or link from the email body — the same logic as the original PHP tools.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000
```

## Tech

Next.js (App Router) · Postgres (`pg`) · `bcryptjs` password hashing · `jose` JWT session
cookie · `imapflow` + `mailparser` for mailbox access.
