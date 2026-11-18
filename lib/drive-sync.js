import { randomBytes } from 'node:crypto';
import { pdfBytes } from './pdf';
import { readSettings, listRecords, fetchRecord, totals } from './store';

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
];

const BASE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

// Ephemeral in-memory folder cache per Google account email for faster auto-syncs.
const folderCache = new Map();

async function google(accessToken, url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: 'Bearer ' + accessToken,
    },
    signal: AbortSignal.timeout(25000),
    cache: 'no-store',
  });
  if (!res.ok) {
    const short = (await res.text()).slice(0, 250);
    const err = new Error('Google Drive HTTP ' + res.status + ': ' + short);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? {} : res.json();
}

async function verifyGoogleUser(accessToken) {
  if (!accessToken) {
    const err = new Error('Missing Google Drive access token');
    err.status = 401;
    throw err;
  }
  const profile = await google(
    accessToken,
    'https://www.googleapis.com/oauth2/v3/userinfo'
  );
  const email = String(profile?.email || '').toLowerCase();
  if (!email) {
    throw new Error('Could not verify Google account email');
  }
  return { email, name: profile?.name || email };
}

async function findOrCreateFolder(token, name, parent = 'root') {
  const q =
    "name = '" +
    name.replace(/'/g, "\\'") +
    "' and mimeType = 'application/vnd.google-apps.folder' and '" +
    parent +
    "' in parents and trashed = false";
  const params = new URLSearchParams({
    q,
    fields: 'nextPageToken,files(id,name)',
    pageSize: '20',
    spaces: 'drive',
  });
  const found = await google(token, BASE + '/files?' + params.toString());
  if (found.files?.length) return found.files[0].id;
  const created = await google(token, BASE + '/files?fields=id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parent],
    }),
  });
  return created.id;
}

export async function ensureDriveWorkspace(accessToken, forceRefresh = false) {
  const { email } = await verifyGoogleUser(accessToken);
  if (!forceRefresh && folderCache.has(email)) {
    const cached = folderCache.get(email);
    return {
      email,
      folders: cached,
      folderUrl: 'https://drive.google.com/drive/folders/' + cached.root,
    };
  }
  const root = await findOrCreateFolder(accessToken, 'HOME RESCUE OFFICE');
  const [invoices, quotations, expenses] = await Promise.all([
    findOrCreateFolder(accessToken, 'Invoices', root),
    findOrCreateFolder(accessToken, 'Quotations', root),
    findOrCreateFolder(accessToken, 'Expenses & Profit', root),
  ]);
  const folders = { root, invoices, quotations, expenses };
  folderCache.set(email, folders);
  return {
    email,
    folders,
    folderUrl: 'https://drive.google.com/drive/folders/' + root,
  };
}

async function upsert(token, parent, name, mime, data) {
  const q =
    "'" +
    parent +
    "' in parents and name = '" +
    name.replace(/'/g, "\\'") +
    "' and trashed = false";
  const found = await google(
    token,
    BASE + '/files?' + new URLSearchParams({ q, fields: 'files(id,name),nextPageToken', pageSize: '30' })
  );
  const prior = found.files?.[0]?.id;
  if (prior) {
    await google(
      token,
      UPLOAD + '/files/' + encodeURIComponent(prior) + '?uploadType=media&fields=id',
      {
        method: 'PATCH',
        headers: { 'Content-Type': mime },
        body: data,
      }
    );
    return prior;
  }
  const boundary = 'resqhome-' + randomBytes(9).toString('hex');
  const head = Buffer.from(
    '--' +
      boundary +
      '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify({ name, mimeType: mime, parents: [parent] }) +
      '\r\n--' +
      boundary +
      '\r\nContent-Type: ' +
      mime +
      '\r\n\r\n'
  );
  const tail = Buffer.from('\r\n--' + boundary + '--');
  const body = Buffer.concat([head, Buffer.isBuffer(data) ? data : Buffer.from(data), tail]);
  const created = await google(token, UPLOAD + '/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
    body,
  });
  return created.id;
}

const csv = (s) => {
  const v = String(s ?? '');
  return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
};
const line = (...x) => x.map(csv).join(',');

function expenseCSV(doc, expenses, payments) {
  const t = totals(doc);
  const es = expenses.filter((x) => x.invoice_id === doc.id);
  const ps = payments.filter((x) => x.invoice_id === doc.id);
  const e = Math.round(es.reduce((n, x) => n + Number(x.amount || 0), 0) * 100) / 100;
  const p = Math.round(ps.reduce((n, x) => n + Number(x.amount || 0), 0) * 100) / 100;
  const money = (x) => Number(x).toFixed(2);
  return (
    '\uFEFF' +
    [
      line('RESQHOME INVOICE EXPENSE REPORT'),
      line('Invoice', doc.number),
      line('Customer', doc.client_name),
      line('Revenue excluding VAT (AED)', money(t.subtotal)),
      line('VAT (AED)', money(t.vat)),
      line('Invoice total (AED)', money(t.total)),
      line('Actual expenses (AED)', money(e)),
      line('Net job profit (AED)', money(Number(t.subtotal) - e)),
      line('Payment received (AED)', money(p)),
      line('Outstanding incl VAT (AED)', money(Number(t.total) - p)),
      '',
      line('Date', 'Category', 'Description', 'Expense Amount AED'),
      ...es.map((x) => line(x.date, x.category, x.description, money(x.amount))),
      '',
      line('Customer payments'),
      line('Date', 'Method', 'Reference', 'Amount AED'),
      ...ps.map((x) => line(x.date, x.method, x.reference, money(x.amount))),
    ].join('\r\n') +
    '\r\n'
  );
}

async function withWorkspaceRetry(accessToken, fn) {
  let workspace = await ensureDriveWorkspace(accessToken);
  try {
    return await fn(workspace);
  } catch (err) {
    if (err?.status === 404) {
      workspace = await ensureDriveWorkspace(accessToken, true);
      return await fn(workspace);
    }
    throw err;
  }
}

export async function syncDocumentToGoogle(accessToken, doc) {
  const setting = await readSettings();
  const pdf = await pdfBytes(doc, setting);
  return withWorkspaceRetry(accessToken, async ({ folders }) => {
    const parent = doc.type === 'invoice' ? folders.invoices : folders.quotations;
    const fileId = await upsert(accessToken, parent, doc.number + '.pdf', 'application/pdf', Buffer.from(pdf));
    return { ok: true, fileId };
  });
}

export async function syncExpenseToGoogle(accessToken, invoiceId) {
  const invoice = await fetchRecord('documents', invoiceId);
  if (!invoice || invoice.type !== 'invoice') return { skipped: true };
  const [expenses, payments] = await Promise.all([listRecords('expenses'), listRecords('payments')]);
  return withWorkspaceRetry(accessToken, async ({ folders }) => {
    const fileId = await upsert(
      accessToken,
      folders.expenses,
      'Expenses-' + invoice.number + '.csv',
      'text/csv',
      expenseCSV(invoice, expenses, payments)
    );
    return { ok: true, fileId };
  });
}

export async function syncCompanyExpenseReport(accessToken) {
  const [documents, expenses, payments] = await Promise.all([
    listRecords('documents'),
    listRecords('expenses'),
    listRecords('payments'),
  ]);
  const money = (x) => Number(x).toFixed(2);
  const content =
    '\uFEFF' +
    [
      line(
        'Invoice',
        'Client',
        'Revenue excl VAT AED',
        'Expenses AED',
        'Net job profit AED',
        'Invoice total AED',
        'Payments received AED'
      ),
      ...documents
        .filter((x) => x.type === 'invoice')
        .map((doc) => {
          const t = totals(doc);
          const ex = expenses
            .filter((x) => x.invoice_id === doc.id)
            .reduce((a, e) => a + Number(e.amount || 0), 0);
          const pay = payments
            .filter((x) => x.invoice_id === doc.id)
            .reduce((a, e) => a + Number(e.amount || 0), 0);
          return line(
            doc.number,
            doc.client_name,
            money(t.subtotal),
            money(ex),
            money(Number(t.subtotal) - ex),
            money(t.total),
            money(pay)
          );
        }),
    ].join('\r\n') +
    '\r\n';
  return withWorkspaceRetry(accessToken, async ({ folders }) => {
    const fileId = await upsert(
      accessToken,
      folders.expenses,
      'Company-Expenses-and-Profit.csv',
      'text/csv',
      content
    );
    return { ok: true, fileId };
  });
}

export async function syncAllPage(accessToken, offset = 0, limit = 5) {
  await ensureDriveWorkspace(accessToken);
  const docs = await listRecords('documents');
  docs.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const slice = docs.slice(offset, offset + limit);
  const errors = [];
  for (const doc of slice) {
    try {
      await syncDocumentToGoogle(accessToken, doc);
      if (doc.type === 'invoice') {
        await syncExpenseToGoogle(accessToken, doc.id);
      }
    } catch (err) {
      if (err?.status === 401) throw err;
      errors.push({ number: doc.number, error: String(err.message || err).slice(0, 150) });
    }
  }
  if (offset + limit >= docs.length) {
    try {
      await syncCompanyExpenseReport(accessToken);
    } catch (err) {
      if (err?.status === 401) throw err;
      errors.push({
        number: 'Company expense sheet',
        error: String(err.message || err).slice(0, 150),
      });
    }
  }
  return {
    processed: slice.length,
    total: docs.length,
    nextOffset: offset + slice.length,
    hasMore: offset + slice.length < docs.length,
    errors,
  };
}
