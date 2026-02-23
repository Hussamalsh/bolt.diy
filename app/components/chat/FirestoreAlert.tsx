import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@nanostores/react';
import { useMemo, useState } from 'react';
import type { FirestoreAlert } from '~/types/actions';
import { firestoreConnection, validateFirestoreConfig } from '~/lib/stores/firestore';
import { classNames } from '~/utils/classNames';

interface Props {
  alert: FirestoreAlert;
  clearAlert: () => void;
  postMessage: (message: string) => void;
}

type FirestoreBatchOperation =
  | {
      type: 'set';
      path: string;
      data: Record<string, unknown>;
      merge?: boolean;
    }
  | {
      type: 'update';
      path: string;
      data: Record<string, unknown>;
    }
  | {
      type: 'delete';
      path: string;
    }
  | {
      type: 'add';
      path?: string;
      collection?: string;
      data: Record<string, unknown>;
    };

interface FirestoreBatchPayload {
  summary?: string;
  operations: FirestoreBatchOperation[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function stripJsonCodeFence(content: string) {
  const trimmed = content.trim();
  const match = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i);

  if (match) {
    return match[1].trim();
  }

  return trimmed;
}

function parseFirestorePayload(content: string): FirestoreBatchPayload {
  const cleaned = stripJsonCodeFence(content);

  if (!cleaned) {
    throw new Error('Firestore action content is empty');
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(
      `Invalid JSON in Firestore action: ${e instanceof SyntaxError ? e.message : 'parse error'}. Ensure content is valid JSON with no comments or trailing commas.`,
    );
  }

  if (Array.isArray(parsed)) {
    return { operations: parsed as FirestoreBatchOperation[] };
  }

  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as FirestoreBatchPayload).operations)) {
    throw new Error(
      'Firestore action must be a JSON object with an "operations" array, or a JSON array of operations.',
    );
  }

  return parsed as FirestoreBatchPayload;
}

function isDocumentPath(path: string) {
  const segments = path.split('/').filter(Boolean);
  return segments.length >= 2 && segments.length % 2 === 0;
}

function isCollectionPath(path: string) {
  const segments = path.split('/').filter(Boolean);
  return segments.length >= 1 && segments.length % 2 === 1;
}

function transformSentinel(value: unknown, firestoreFns: Record<string, (...args: any[]) => unknown>): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => transformSentinel(item, firestoreFns));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const record = value as Record<string, unknown>;
  const op = (record.__firestore || record.__op) as string | undefined;

  if (op) {
    switch (op) {
      case 'serverTimestamp':
        return firestoreFns.serverTimestamp();
      case 'deleteField':
        return firestoreFns.deleteField();
      case 'increment':
        return firestoreFns.increment(Number(record.amount || 0));
      case 'arrayUnion':
        return firestoreFns.arrayUnion(
          ...((record.values as unknown[]) || []).map((item) => transformSentinel(item, firestoreFns)),
        );
      case 'arrayRemove':
        return firestoreFns.arrayRemove(
          ...((record.values as unknown[]) || []).map((item) => transformSentinel(item, firestoreFns)),
        );
      default:
        throw new Error(`Unsupported Firestore sentinel operation: ${op}`);
    }
  }

  const transformed: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(record)) {
    transformed[key] = transformSentinel(nestedValue, firestoreFns);
  }

  return transformed;
}

function assertObjectData(data: unknown, label: string, index: number): asserts data is Record<string, unknown> {
  if (!isRecord(data)) {
    throw new Error(`Operation ${index + 1} (${label}) requires an object "data" payload`);
  }
}

function isSameFirebaseConfig(a: Record<string, unknown>, b: Record<string, unknown>) {
  const keys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId'];

  return keys.every((key) => (a[key] || '') === (b[key] || ''));
}

export function FirestoreChatAlert({ alert, clearAlert, postMessage }: Props) {
  const { content } = alert;
  const connection = useStore(firestoreConnection);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const configValid = validateFirestoreConfig(connection.config).valid;
  const isConnected = connection.isConnected && configValid;

  const payloadPreview = useMemo(() => {
    try {
      return parseFirestorePayload(content);
    } catch {
      return null;
    }
  }, [content]);

  const title = isConnected ? 'Firestore changes' : 'Firestore connection required';
  const description = isConnected ? 'Execute Firestore document operations' : 'Firestore connection required';
  const message = isConnected
    ? 'Please review the proposed Firestore changes and apply them to your project.'
    : 'Please connect to Firestore to continue with this operation.';

  const handleConnectClick = () => {
    document.dispatchEvent(new CustomEvent('open-firestore-connection'));
  };

  const executeFirestoreAction = async (rawContent: string) => {
    if (!isConnected) {
      return;
    }

    setIsExecuting(true);

    try {
      const payload = parseFirestorePayload(rawContent);

      if (!payload.operations.length) {
        throw new Error('Firestore action has no operations');
      }

      const firebaseConfig = {
        apiKey: connection.config.apiKey,
        authDomain: connection.config.authDomain,
        projectId: connection.config.projectId,
        storageBucket: connection.config.storageBucket,
        messagingSenderId: connection.config.messagingSenderId,
        appId: connection.config.appId,
        ...(connection.config.measurementId ? { measurementId: connection.config.measurementId } : {}),
      };

      const firebaseAppModule = await import('firebase/app');
      const firestoreModule = await import('firebase/firestore');

      const appName = 'adara-firestore-action';
      const existingApp = firebaseAppModule.getApps().find((item) => item.name === appName);

      if (existingApp && !isSameFirebaseConfig(existingApp.options as Record<string, unknown>, firebaseConfig)) {
        await firebaseAppModule.deleteApp(existingApp);
      }

      const app =
        firebaseAppModule.getApps().find((item) => item.name === appName) ||
        firebaseAppModule.initializeApp(firebaseConfig, appName);
      const db = firestoreModule.getFirestore(app);

      const sentinelFns = {
        serverTimestamp: firestoreModule.serverTimestamp,
        deleteField: firestoreModule.deleteField,
        increment: firestoreModule.increment,
        arrayUnion: firestoreModule.arrayUnion,
        arrayRemove: firestoreModule.arrayRemove,
      };

      const results: string[] = [];

      for (const [index, operation] of payload.operations.entries()) {
        switch (operation.type) {
          case 'set': {
            if (!isDocumentPath(operation.path)) {
              throw new Error(`Operation ${index + 1}: invalid document path "${operation.path}"`);
            }

            assertObjectData(operation.data, 'set', index);

            const ref = firestoreModule.doc(db, operation.path);
            await firestoreModule.setDoc(ref, transformSentinel(operation.data, sentinelFns) as any, {
              merge: !!operation.merge,
            });
            results.push(`set ${operation.path}`);
            break;
          }
          case 'update': {
            if (!isDocumentPath(operation.path)) {
              throw new Error(`Operation ${index + 1}: invalid document path "${operation.path}"`);
            }

            assertObjectData(operation.data, 'update', index);

            const ref = firestoreModule.doc(db, operation.path);
            await firestoreModule.updateDoc(ref, transformSentinel(operation.data, sentinelFns) as any);
            results.push(`update ${operation.path}`);
            break;
          }
          case 'delete': {
            if (!isDocumentPath(operation.path)) {
              throw new Error(`Operation ${index + 1}: invalid document path "${operation.path}"`);
            }

            const ref = firestoreModule.doc(db, operation.path);
            await firestoreModule.deleteDoc(ref);
            results.push(`delete ${operation.path}`);
            break;
          }
          case 'add': {
            const collectionPath = operation.collection || operation.path;

            if (!collectionPath || !isCollectionPath(collectionPath)) {
              throw new Error(`Operation ${index + 1}: invalid collection path "${collectionPath || ''}"`);
            }

            assertObjectData(operation.data, 'add', index);

            const collectionRef = firestoreModule.collection(db, collectionPath);
            const docRef = await firestoreModule.addDoc(
              collectionRef,
              transformSentinel(operation.data, sentinelFns) as any,
            );
            results.push(`add ${collectionPath}/${docRef.id}`);
            break;
          }
          default:
            throw new Error(`Unsupported Firestore operation type: ${(operation as any).type}`);
        }
      }

      console.log('Firestore operations executed successfully', results);

      postMessage(
        `*✅ Firestore operations completed successfully (${results.length} operation${results.length === 1 ? '' : 's'})*\n\`\`\`\n${results.join('\n')}\n\`\`\`\n`,
      );
    } catch (error) {
      console.error('Failed to execute Firestore action:', error);
      postMessage(
        `*Error executing Firestore action, please fix and return the Firestore JSON action again*\n\`\`\`\n${
          error instanceof Error ? error.message : String(error)
        }\n\`\`\`\n`,
      );
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="max-w-chat rounded-lg border-l-2 border-l-[#FFCA28] border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2"
      >
        <div className="p-4 pb-2">
          <div className="flex items-center gap-2">
            <img height="10" width="18" crossOrigin="anonymous" src="https://cdn.simpleicons.org/firebase" />
            <h3 className="text-sm font-medium text-[#FFCA28]">{title}</h3>
          </div>
        </div>

        <div className="px-4">
          {!isConnected ? (
            <div className="p-3 rounded-md bg-bolt-elements-background-depth-3">
              <span className="text-sm text-bolt-elements-textPrimary">
                You must connect Firestore with a valid Firebase web config first.
              </span>
            </div>
          ) : (
            <>
              <div
                className="flex items-center p-2 rounded-md bg-bolt-elements-background-depth-3 cursor-pointer"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                <div className="i-ph:database text-bolt-elements-textPrimary mr-2"></div>
                <span className="text-sm text-bolt-elements-textPrimary flex-grow">
                  {payloadPreview?.summary || description}
                  {payloadPreview?.operations?.length ? ` (${payloadPreview.operations.length} ops)` : ''}
                </span>
                <div
                  className={`i-ph:caret-up text-bolt-elements-textPrimary transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
                ></div>
              </div>

              {!isCollapsed && content ? (
                <div className="mt-2 p-3 bg-bolt-elements-background-depth-4 rounded-md overflow-auto max-h-60 font-mono text-xs text-bolt-elements-textSecondary">
                  <pre>{stripJsonCodeFence(content)}</pre>
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="p-4">
          <p className="text-sm text-bolt-elements-textSecondary mb-4">{message}</p>

          <div className="flex gap-2">
            {!isConnected ? (
              <button
                onClick={handleConnectClick}
                className={classNames(
                  'px-3 py-2 rounded-md text-sm font-medium',
                  'bg-[#FFCA28] text-black',
                  'hover:bg-[#F2BE1F]',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500',
                )}
              >
                Connect to Firestore
              </button>
            ) : (
              <button
                onClick={() => executeFirestoreAction(content)}
                disabled={isExecuting}
                className={classNames(
                  'px-3 py-2 rounded-md text-sm font-medium',
                  'bg-[#FFCA28] text-black',
                  'hover:bg-[#F2BE1F]',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500',
                  isExecuting ? 'opacity-70 cursor-not-allowed' : '',
                )}
              >
                {isExecuting ? 'Applying...' : 'Apply Changes'}
              </button>
            )}
            <button
              onClick={clearAlert}
              disabled={isExecuting}
              className={classNames(
                'px-3 py-2 rounded-md text-sm font-medium',
                'bg-[#503B26]',
                'hover:bg-[#774f28]',
                'focus:outline-none',
                'text-[#F79007]',
                isExecuting ? 'opacity-70 cursor-not-allowed' : '',
              )}
            >
              Dismiss
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
