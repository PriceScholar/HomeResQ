'use client';

import { useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
];

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
for (const scope of DRIVE_SCOPES) {
  provider.addScope(scope);
}
provider.setCustomParameters({ prompt: 'select_account' });

let isSigningIn = false;
let cachedAccessToken = null;
let driveState = {
  ready: false,
  signedIn: false,
  connected: false,
  needsReconnect: false,
  email: null,
  folderId: null,
  folderUrl: null,
  error: null,
};

const listeners = new Set();

function emit() {
  const snapshot = { ...driveState };
  for (const fn of listeners) {
    try {
      fn(snapshot);
    } catch {}
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('resqhome-drive-state', { detail: snapshot }));
  }
}

async function initDriveWorkspace(token) {
  const res = await fetch('/api/drive/init', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: '{}',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || 'Failed to initialize Google Drive workspace');
  }
  return data;
}

export async function googleDriveSignIn() {
  isSigningIn = true;
  driveState = { ...driveState, error: null };
  emit();
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not obtain a Google Drive access token. Please try again.');
    }
    cachedAccessToken = credential.accessToken;
    const workspace = await initDriveWorkspace(cachedAccessToken);
    driveState = {
      ready: true,
      signedIn: true,
      connected: true,
      needsReconnect: false,
      email: workspace.account || result.user?.email || null,
      folderId: workspace.folderId || null,
      folderUrl: workspace.folderUrl || null,
      error: null,
    };
    emit();
    return { ...driveState, accessToken: cachedAccessToken };
  } catch (err) {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    let msg = err?.message || 'Google Drive sign-in failed';
    if (err?.code === 'auth/unauthorized-domain') {
      msg = host
        ? `Domain "${host}" is not authorized for Google Sign-In. Add "${host}" in Firebase Console (${firebaseConfig.projectId}) → Authentication → Settings → Authorized domains, then retry.`
        : `This domain is not authorized for Google Sign-In. Add it in Firebase Console (${firebaseConfig.projectId}) → Authentication → Settings → Authorized domains, then retry.`;
    } else if (err?.code === 'auth/popup-closed-by-user') {
      msg = 'Google sign-in popup was closed before completing.';
    } else if (err?.code === 'auth/popup-blocked') {
      msg = 'Sign-in popup was blocked by your browser. Allow popups for this site and try again.';
    } else if (err?.code === 'auth/cancelled-popup-request') {
      msg = 'Another sign-in popup is already open. Complete or close it and try again.';
    }
    driveState = {
      ...driveState,
      ready: true,
      connected: Boolean(cachedAccessToken),
      error: msg,
    };
    emit();
    throw new Error(msg);
  } finally {
    isSigningIn = false;
  }
}

export async function googleDriveSignOut() {
  cachedAccessToken = null;
  await signOut(auth);
  driveState = {
    ready: true,
    signedIn: false,
    connected: false,
    needsReconnect: false,
    email: null,
    folderId: null,
    folderUrl: null,
    error: null,
  };
  emit();
}

export function clearCachedDriveToken(reason) {
  cachedAccessToken = null;
  driveState = {
    ...driveState,
    connected: false,
    needsReconnect: driveState.signedIn,
    error: reason || driveState.error,
  };
  emit();
}

export default function DriveClient() {
  useEffect(() => {
    const bridge = {
      signIn: googleDriveSignIn,
      signOut: googleDriveSignOut,
      clearToken: clearCachedDriveToken,
      getAccessToken: () => cachedAccessToken,
      getState: () => ({ ...driveState }),
      subscribe: (fn) => {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
    };
    window.__resqhomeDrive = bridge;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (cachedAccessToken) {
          driveState = {
            ...driveState,
            ready: true,
            signedIn: true,
            connected: true,
            needsReconnect: false,
            email: driveState.email || user.email || null,
          };
        } else if (!isSigningIn) {
          cachedAccessToken = null;
          driveState = {
            ...driveState,
            ready: true,
            signedIn: true,
            connected: false,
            needsReconnect: true,
            email: user.email || null,
            folderId: null,
            folderUrl: null,
          };
        }
      } else {
        cachedAccessToken = null;
        driveState = {
          ready: true,
          signedIn: false,
          connected: false,
          needsReconnect: false,
          email: null,
          folderId: null,
          folderUrl: null,
          error: null,
        };
      }
      emit();
    });

    emit();
    return () => {
      unsubscribe();
    };
  }, []);

  return null;
}
