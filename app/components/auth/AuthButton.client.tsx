import { useStore } from '@nanostores/react';
import { userStore, authLoadingStore, signInWithGoogle, signOut } from '~/lib/stores/auth';
import { classNames } from '~/utils/classNames';

export function AuthButton() {
  const user = useStore(userStore);
  const loading = useStore(authLoadingStore);

  if (loading) {
    return <div className="h-8 w-24 bg-bolt-elements-background-depth-3 rounded-md animate-pulse" />;
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {user.photoURL && (
            <img
              src={user.photoURL}
              alt={user.displayName || 'User Profile'}
              className="w-7 h-7 rounded-full border border-bolt-elements-borderColor"
            />
          )}
          <span className="text-sm font-medium text-bolt-elements-textPrimary hidden sm:block">
            {user.displayName || user.email}
          </span>
        </div>
        <button
          onClick={() => {
            void signOut();
          }}
          className={classNames(
            'text-xs px-3 py-1.5 rounded-md font-medium transition-colors',
            'bg-bolt-elements-button-secondary-background text-bolt-elements-button-secondary-text',
            'hover:bg-bolt-elements-button-secondary-backgroundHover',
          )}
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        void signInWithGoogle();
      }}
      className={classNames(
        'text-sm px-4 py-1.5 rounded-md font-medium transition-colors flex items-center gap-2',
        'bg-accent-500 text-white hover:bg-accent-600 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent-500',
      )}
    >
      <div className="i-ph:google-logo-duotone" />
      Sign in
    </button>
  );
}
