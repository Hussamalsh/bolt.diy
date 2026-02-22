import { atom } from 'nanostores';
import { auth, googleProvider } from '~/lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { toast } from 'react-toastify';

export const userStore = atom<User | null>(null);
export const authLoadingStore = atom<boolean>(true);

if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, (user) => {
    userStore.set(user);
    authLoadingStore.set(false);
  });

  // Safety timeout: never stay in loading state for more than 5 seconds
  setTimeout(() => {
    if (authLoadingStore.get()) {
      authLoadingStore.set(false);
    }
  }, 5000);
}

export const signInWithGoogle = async () => {
  try {
    /*
     * signInWithPopup works on the landing page (/) because that page does NOT
     * have COOP: same-origin headers (those are only applied on /chat/* routes
     * for WebContainer crossOriginIsolated support). Popups require same-origin
     * window communication which COOP: same-origin would break.
     */
    await signInWithPopup(auth, googleProvider);
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    console.error('Error signing in with Google', error);
    toast.error(`Sign-in failed: ${firebaseError.message || 'Unknown error'}`);
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out', error);
  }
};
