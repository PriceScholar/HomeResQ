# RESQHOME Office — Vercel Cloud

A password-protected **mobile + desktop** website for RESQHOME Technical Services. The public company website is **not** altered.

## Features

- Approved Executive Blue invoice/quotation layout. Invoice has **no Terms & Conditions**; quotation includes 11 conditions and client acceptance.
- Customer directory, reusable services, quotation → invoice, search, PDF, accounting CSV.
- Private Vercel Blob cloud storage shared across all logged-in devices. JSON backup and restore.
- Protected by a server-side hashed admin password and signed HttpOnly session cookies.

## Deploy from GitHub

1. Import this GitHub repository into Vercel as a **Next.js** project (Node.js 22 or later).
2. In Vercel Storage, connect/create a **private** Vercel Blob store. Keep it **private** (not public). It automatically sets `BLOB_STORE_ID` in supported projects.
3. Set Vercel environment variables: `OFFICE_PASSWORD_HASH` and `SESSION_SECRET` (both private/encrypted). Redeploy after adding.
   - To generate these locally: `node scripts/create-secrets.mjs`. The output contains the initial **plain password** and its scrypt hash. Keep the password private; do not commit or share the output.
4. Open the Vercel production URL from any browser (Android/iOS/PC) and sign in.
5. Export regular JSON backups from Settings; keep them in a separate secure location.

### Environment

`OFFICE_PASSWORD_HASH`: `salt:scrypt_hex` password hash.
`SESSION_SECRET`: random 32+ byte string used to sign cookies.
`BLOB_STORE_ID` or compatible blob credential: created automatically by connecting private Blob to Vercel project. Do not put it in the repository.

### Data notes

Records are kept as private JSON objects in Vercel Blob, **not in Vercel's ephemeral filesystem**. This is a practical single-office MVP, not a transactional database: concurrent users creating documents at the same instant may conflict on sequential numbering. For high-volume use, migrate to Neon Postgres.

Password protection is single-admin (not separate employee roles). Use a strong password. No public registration.

**Backup restore replaces the record set** and creates one pre-restore snapshot. Export a separate JSON copy before restoring.

### Cost and use

Vercel may charge for hosting/storage outside plan allowances. Check commercial-use terms (Hobby plans are intended for non-commercial use) before running business production; upgrading may be required. Vercel Blob limits and pricing apply.

### Development

Install Node.js 22+ and run `npm install`, then `npm run dev`. For cloud records you must configure Vercel-linked private Blob credentials first. The API will not falsely claim data persistence without connected storage.
