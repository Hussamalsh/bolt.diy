import { useStore } from '@nanostores/react';
import { userStore, authLoadingStore, signInWithGoogle } from '~/lib/stores/auth';
import { AvatarDropdown } from '~/components/@settings/core/AvatarDropdown';
import { classNames } from '~/utils/classNames';

export function AuthButton() {
  const user = useStore(userStore);
  const loading = useStore(authLoadingStore);

  if (loading) {
    return <div className="h-8 w-24 bg-bolt-elements-background-depth-3 rounded-md animate-pulse" />;
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-bolt-elements-textPrimary hidden xl:block truncate max-w-[180px]">
          {user.displayName || user.email}
        </span>
        <AvatarDropdown showSignOut />
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
