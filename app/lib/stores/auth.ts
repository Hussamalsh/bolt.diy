import { atom } from 'nanostores';
import { auth, googleProvider } from '~/lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { toast } from 'react-toastify';

export const userStore = atom<User | null>(null);
export const authLoadingStore = atom<boolean>(true);

// Subscribe to auth state changes and handle redirect result
if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, (user) => {
    userStore.set(user);
    authLoadingStore.set(false);
  });

  // Safety timeout: never stay in loading state for more than 5 seconds
  setTimeout(() => {
    if (authLoadingStore.get()) {
      console.warn('Auth loading timed out, forcing loaded state');
      authLoadingStore.set(false);
    }
  }, 5000);
}

export const signInWithGoogle = async () => {
  try {
    /*
     * We've removed COOP=same-origin for this local dev test, and Firebase
     * popup auth should work fine now!
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
