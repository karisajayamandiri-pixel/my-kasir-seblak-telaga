import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  doc,
  getDocFromServer,
  setLogLevel,
  persistentLocalCache,
  persistentMultipleTabManager,
  type FirestoreSettings,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

setLogLevel('silent');

const baseFirestoreSettings: FirestoreSettings & { useFetchStreams?: boolean } = {
  experimentalForceLongPolling: true,
  experimentalLongPollingOptions: { timeoutSeconds: 15 },
  ...(typeof XMLHttpRequest !== 'undefined' ? { useFetchStreams: false } : {}),
};

const app = initializeApp(firebaseConfig);

function createFirestoreDb() {
  try {
    return initializeFirestore(
      app,
      {
        ...baseFirestoreSettings,
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return initializeFirestore(app, baseFirestoreSettings, firebaseConfig.firestoreDatabaseId);
  }
}

export const db = createFirestoreDb();
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function isFirestorePermissionError(error: unknown): boolean {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '').toLowerCase()
      : '';
  const msg = (error instanceof Error ? error.message : String(error || '')).toLowerCase();
  return (
    code === 'permission-denied' ||
    msg.includes('missing or insufficient permissions') ||
    msg.includes('permission-denied') ||
    msg.includes('permission_denied')
  );
}

export function isFirestoreTransientError(error: unknown): boolean {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '').toLowerCase()
      : '';
  const msg = (error instanceof Error ? error.message : String(error || '')).toLowerCase();
  return (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    code === 'aborted' ||
    code === 'cancelled' ||
    code === 'resource-exhausted' ||
    msg.includes('could not reach cloud firestore backend') ||
    msg.includes("backend didn't respond") ||
    msg.includes('the client is offline') ||
    msg.includes('client is offline') ||
    msg.includes('unavailable') ||
    msg.includes('networkerror') ||
    msg.includes('network-request-failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('timeout')
  );
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };

  if (isFirestorePermissionError(error)) {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }

  console.warn('Firestore Transient/Offline Warning: ', JSON.stringify(errInfo));
}

let isTestingConnection = false;

export async function testConnection(): Promise<boolean> {
  if (isTestingConnection) return false;
  isTestingConnection = true;
  try {
    // Avoid concurrent race condition with initial onSnapshot cold stream
    await new Promise((r) => setTimeout(r, 600));
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes('the client is offline')) {
      console.warn('Firestore sedang dalam mode offline sementara, menggunakan cache lokal & fallback.');
    }
    return false;
  } finally {
    isTestingConnection = false;
  }
}
