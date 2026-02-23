import { atom } from 'nanostores';

export interface FirestoreConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface FirestoreConnectionState {
  isConnected: boolean;
  config: FirestoreConfig;
  connectedAt?: string;
}

export interface FirestoreValidationResult {
  valid: boolean;
  missingFields: Array<keyof FirestoreConfig>;
}

const REQUIRED_FIRESTORE_FIELDS: Array<keyof FirestoreConfig> = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

const storage =
  typeof globalThis !== 'undefined' &&
  typeof globalThis.localStorage !== 'undefined' &&
  typeof globalThis.localStorage.getItem === 'function'
    ? globalThis.localStorage
    : null;

function getEnvDefaultConfig(): FirestoreConfig {
  return {
    apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env?.VITE_FIREBASE_APP_ID || '',
    measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID || '',
  };
}

function sanitizeFirestoreConfig(config: FirestoreConfig): FirestoreConfig {
  return {
    apiKey: config.apiKey.trim(),
    authDomain: config.authDomain.trim(),
    projectId: config.projectId.trim(),
    storageBucket: config.storageBucket.trim(),
    messagingSenderId: config.messagingSenderId.trim(),
    appId: config.appId.trim(),
    measurementId: config.measurementId?.trim() || '',
  };
}

const initialState = (() => {
  const saved = storage?.getItem('firestore_connection');

  if (saved) {
    try {
      const parsed = JSON.parse(saved) as FirestoreConnectionState;

      return {
        isConnected: !!parsed.isConnected,
        connectedAt: parsed.connectedAt,
        config: {
          ...getEnvDefaultConfig(),
          ...parsed.config,
        },
      } satisfies FirestoreConnectionState;
    } catch (error) {
      console.error('Failed to parse firestore connection state:', error);
    }
  }

  return {
    isConnected: false,
    connectedAt: undefined,
    config: getEnvDefaultConfig(),
  } satisfies FirestoreConnectionState;
})();

export const firestoreConnection = atom<FirestoreConnectionState>(initialState);

export function validateFirestoreConfig(config: FirestoreConfig): FirestoreValidationResult {
  const missingFields = REQUIRED_FIRESTORE_FIELDS.filter((field) => !config[field]?.trim());

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

export function updateFirestoreConnection(connection: Partial<FirestoreConnectionState>) {
  const current = firestoreConnection.get();
  const next: FirestoreConnectionState = {
    ...current,
    ...connection,
    config: {
      ...current.config,
      ...(connection.config || {}),
    },
  };

  firestoreConnection.set(next);
  storage?.setItem('firestore_connection', JSON.stringify(next));
}

export function updateFirestoreConfig(config: Partial<FirestoreConfig>) {
  const current = firestoreConnection.get();
  const nextConfig = {
    ...current.config,
    ...config,
  };
  const nextValidation = validateFirestoreConfig(nextConfig);
  const hasChanged = (Object.keys(nextConfig) as Array<keyof FirestoreConfig>).some(
    (key) => (current.config[key] || '') !== (nextConfig[key] || ''),
  );

  updateFirestoreConnection({
    config: nextConfig,
    isConnected: hasChanged ? false : current.isConnected ? nextValidation.valid : current.isConnected,
    connectedAt: hasChanged ? undefined : current.connectedAt,
  });
}

export function connectFirestore() {
  const current = firestoreConnection.get();
  const sanitizedConfig = sanitizeFirestoreConfig(current.config);
  const validation = validateFirestoreConfig(sanitizedConfig);

  if (!validation.valid) {
    return validation;
  }

  updateFirestoreConnection({
    isConnected: true,
    connectedAt: new Date().toISOString(),
    config: sanitizedConfig,
  });

  return validation;
}

export function disconnectFirestore() {
  updateFirestoreConnection({
    isConnected: false,
    connectedAt: undefined,
  });
}
