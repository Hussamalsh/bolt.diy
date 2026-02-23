import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useStore } from '@nanostores/react';
import { Dialog, DialogButton, DialogClose, DialogDescription, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import {
  connectFirestore,
  disconnectFirestore,
  firestoreConnection,
  updateFirestoreConfig,
  type FirestoreConfig,
} from '~/lib/stores/firestore';
import { classNames } from '~/utils/classNames';

interface FirestoreField {
  key: keyof FirestoreConfig;
  label: string;
  placeholder: string;
  required?: boolean;
  type?: 'text' | 'password';
}

const FIRESTORE_FIELDS: FirestoreField[] = [
  {
    key: 'projectId',
    label: 'Project ID',
    placeholder: 'your-firebase-project-id',
    required: true,
  },
  {
    key: 'apiKey',
    label: 'API Key',
    placeholder: 'AIza...',
    required: true,
    type: 'password',
  },
  {
    key: 'authDomain',
    label: 'Auth Domain',
    placeholder: 'your-project.firebaseapp.com',
    required: true,
  },
  {
    key: 'storageBucket',
    label: 'Storage Bucket',
    placeholder: 'your-project.appspot.com',
    required: true,
  },
  {
    key: 'messagingSenderId',
    label: 'Messaging Sender ID',
    placeholder: '1234567890',
    required: true,
  },
  {
    key: 'appId',
    label: 'App ID',
    placeholder: '1:1234567890:web:abcdef',
    required: true,
  },
  {
    key: 'measurementId',
    label: 'Measurement ID (optional)',
    placeholder: 'G-XXXXXXX',
  },
];

export function FirestoreConnection() {
  const connection = useStore(firestoreConnection);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleOpenConnectionDialog = () => {
      setIsDialogOpen(true);
    };

    document.addEventListener('open-firestore-connection', handleOpenConnectionDialog);

    return () => {
      document.removeEventListener('open-firestore-connection', handleOpenConnectionDialog);
    };
  }, []);

  const connectedLabel = useMemo(() => {
    if (!connection.isConnected) {
      return null;
    }

    return connection.config.projectId || 'Connected';
  }, [connection.isConnected, connection.config.projectId]);

  const handleFieldChange = (key: keyof FirestoreConfig, value: string) => {
    updateFirestoreConfig({ [key]: value });
  };

  const handleConnect = async () => {
    setIsSaving(true);

    try {
      const validation = connectFirestore();

      if (!validation.valid) {
        const formatted = validation.missingFields.join(', ');
        toast.error(`Missing required Firebase fields: ${formatted}`);

        return;
      }

      toast.success('Successfully connected to Firestore');
      setIsDialogOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = () => {
    disconnectFirestore();
    toast.success('Disconnected from Firestore');
    setIsDialogOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex border border-bolt-elements-borderColor rounded-md overflow-hidden mr-2 text-sm">
        <button
          type="button"
          onClick={() => setIsDialogOpen(!isDialogOpen)}
          className={classNames(
            'px-3 py-2 transition-colors flex items-center gap-2',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-bolt-elements-borderColor',
            connection.isConnected
              ? 'bg-[#FFCA28] text-black hover:bg-[#F2BE1F]'
              : 'bg-bolt-elements-background text-bolt-elements-textPrimary hover:bg-bolt-elements-item-backgroundActive',
          )}
        >
          <img
            className="w-4 h-4"
            height="20"
            width="20"
            crossOrigin="anonymous"
            src="https://cdn.simpleicons.org/firebase"
          />
          {connectedLabel ? <span className="ml-1 text-xs max-w-[120px] truncate">{connectedLabel}</span> : null}
        </button>
      </div>

      <DialogRoot open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {isDialogOpen ? (
          <Dialog className="max-w-[640px] p-6">
            <div className="space-y-4">
              <DialogTitle>
                <img
                  className="w-5 h-5"
                  height="24"
                  width="24"
                  crossOrigin="anonymous"
                  src="https://cdn.simpleicons.org/firebase"
                />
                {connection.isConnected ? 'Firestore Connection' : 'Connect to Firestore'}
              </DialogTitle>
              <DialogDescription>
                Save your Firebase web app config so Firestore projects can be scaffolded with the correct
                `VITE_FIREBASE_*` environment variables.
              </DialogDescription>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {FIRESTORE_FIELDS.map((field) => (
                  <div key={field.key} className={field.key === 'measurementId' ? 'md:col-span-2' : ''}>
                    <label className="block text-sm text-bolt-elements-textSecondary mb-1.5">
                      {field.label}
                      {field.required ? <span className="text-red-500"> *</span> : null}
                    </label>
                    <input
                      type={field.type || 'text'}
                      value={connection.config[field.key] || ''}
                      onChange={(event) => handleFieldChange(field.key, event.target.value)}
                      placeholder={field.placeholder}
                      className={classNames(
                        'w-full px-3 py-2 rounded-lg text-sm',
                        'bg-[#F8F8F8] dark:bg-[#1A1A1A]',
                        'border border-[#E5E5E5] dark:border-[#333333]',
                        'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
                        'focus:outline-none focus:ring-1 focus:ring-[#FFCA28]',
                      )}
                    />
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-bolt-elements-borderColor p-3 text-xs text-bolt-elements-textSecondary">
                Firestore connection here is used to provide Firebase/Firestore config context to the AI and generated
                app environment variables. It does not run Firestore queries from this dialog.
              </div>

              <div className="flex justify-end gap-2 mt-6">
                {connection.isConnected ? (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="px-4 py-2 rounded-lg text-sm border border-bolt-elements-borderColor text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2"
                  >
                    Disconnect
                  </button>
                ) : null}
                <DialogClose asChild>
                  <DialogButton type="secondary">Cancel</DialogButton>
                </DialogClose>
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={isSaving}
                  className={classNames(
                    'px-4 py-2 rounded-lg text-sm flex items-center gap-2',
                    'bg-[#FFCA28] text-black',
                    'hover:bg-[#F2BE1F]',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  {isSaving ? (
                    <>
                      <div className="i-ph:spinner-gap animate-spin" />
                      Saving...
                    </>
                  ) : connection.isConnected ? (
                    <>
                      <div className="i-ph:check-circle w-4 h-4" />
                      Update
                    </>
                  ) : (
                    <>
                      <div className="i-ph:plug-charging w-4 h-4" />
                      Connect
                    </>
                  )}
                </button>
              </div>
            </div>
          </Dialog>
        ) : null}
      </DialogRoot>
    </div>
  );
}
