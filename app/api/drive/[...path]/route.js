import { NextResponse } from 'next/server';
import { isAuthenticated, checkOrigin } from '../../../../lib/auth';
import { fetchRecord } from '../../../../lib/store';
import {
  ensureDriveWorkspace,
  syncDocumentToGoogle,
  syncExpenseToGoogle,
  syncCompanyExpenseReport,
  syncAllPage,
} from '../../../../lib/drive-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const reply = (obj, status = 200) =>
  NextResponse.json(obj, { status, headers: { 'Cache-Control': 'no-store' } });
const fail = (m, status = 400) => reply({ detail: m }, status);

function extractBearerToken(req) {
  const authHeader = req.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

export async function GET(req, ctx) {
  const { path: p } = await ctx.params;
  const action = p?.[0];
  if (!isAuthenticated(req)) return fail('Sign in to RESQHOME Office first', 401);
  if (action === 'status') {
    return reply({ configured: true, mode: 'google-signin' });
  }
  return fail('Not found', 404);
}

export async function POST(req, ctx) {
  if (!isAuthenticated(req)) return fail('Unauthorized', 401);
  if (!checkOrigin(req)) return fail('Invalid origin', 403);

  const token = extractBearerToken(req);
  if (!token) {
    return fail('Google Drive authorization required. Sign in with Google in Settings.', 401);
  }

  const { path: p } = await ctx.params;
  const action = p?.[0];

  try {
    if (action === 'init') {
      const workspace = await ensureDriveWorkspace(token);
      return reply({
        configured: true,
        connected: true,
        account: workspace.email,
        folderId: workspace.folders.root,
        folderUrl: workspace.folderUrl,
      });
    }

    if (action === 'sync-doc') {
      const data = await req.json().catch(() => ({}));
      const docId = String(data.id || '').trim();
      if (!docId) return fail('Document ID is required', 400);
      const doc = await fetchRecord('documents', docId);
      if (!doc) return fail('Document not found', 404);
      const result = await syncDocumentToGoogle(token, doc);
      if (doc.type === 'invoice') {
        await syncExpenseToGoogle(token, doc.id);
        await syncCompanyExpenseReport(token);
      }
      return reply(result);
    }

    if (action === 'sync-expense') {
      const data = await req.json().catch(() => ({}));
      const invoiceId = String(data.invoice_id || '').trim();
      if (!invoiceId) return fail('Invoice ID is required', 400);
      const result = await syncExpenseToGoogle(token, invoiceId);
      await syncCompanyExpenseReport(token);
      return reply(result);
    }

    if (action === 'sync-company') {
      return reply(await syncCompanyExpenseReport(token));
    }

    if (action === 'sync-all') {
      const data = await req.json().catch(() => ({}));
      const offset = Math.max(0, Math.min(100000, Math.floor(Number(data.offset) || 0)));
      return reply(await syncAllPage(token, offset));
    }

    return fail('Not found', 404);
  } catch (err) {
    console.error('Google Drive API error:', err);
    const msg = String(err?.message || err).slice(0, 250);
    const isAuthErr = err?.status === 401 || /HTTP 401|Invalid Credentials|unauthorized/i.test(msg);
    return fail(
      isAuthErr ? 'Google Drive session expired. Please reconnect in Settings.' : msg,
      isAuthErr ? 401 : 500
    );
  }
}
