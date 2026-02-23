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

function getEmptyConfig(): FirestoreConfig {
  return {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    measurementId: '',
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
      const isConnected = !!parsed.isConnected;

      return {
        isConnected,
        connectedAt: isConnected ? parsed.connectedAt : undefined,
        config: isConnected
          ? {
              ...getEmptyConfig(),
              ...parsed.config,
            }
          : getEmptyConfig(),
      } satisfies FirestoreConnectionState;
    } catch (error) {
      console.error('Failed to parse firestore connection state:', error);
    }
  }

  return {
    isConnected: false,
    connectedAt: undefined,
    config: getEmptyConfig(),
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

  if (next.isConnected) {
    storage?.setItem('firestore_connection', JSON.stringify(next));
  } else {
    storage?.removeItem('firestore_connection');
  }
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
  resetFirestoreConnection();
}

export function resetFirestoreConnection() {
  firestoreConnection.set({
    isConnected: false,
    connectedAt: undefined,
    config: getEmptyConfig(),
  });
  storage?.removeItem('firestore_connection');
}
