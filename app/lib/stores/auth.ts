import { atom } from 'nanostores';
import { auth, googleProvider } from '~/lib/firebase';
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { toast } from 'react-toastify';

export const userStore = atom<User | null>(null);
export const authLoadingStore = atom<boolean>(true);

// Subscribe to auth state changes and handle redirect result
if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, (user) => {
    userStore.set(user);
    authLoadingStore.set(false);
  });

  // Process redirect result when returning from Google sign-in (for redirect flow)
  getRedirectResult(auth)
    .then(() => {
      authLoadingStore.set(false);
    })
    .catch((error: unknown) => {
      const firebaseError = error as { code?: string; message?: string };
      console.error('Error processing redirect sign-in result', firebaseError);
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
    // Popup works best for localhost / dev environments
    await signInWithPopup(auth, googleProvider);
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };

    // User closed the popup — not an error
    if (firebaseError.code === 'auth/popup-closed-by-user' || firebaseError.code === 'auth/cancelled-popup-request') {
      return;
    }

    // Popup was blocked by browser — fall back to redirect
    if (firebaseError.code === 'auth/popup-blocked') {
      console.warn('Popup blocked, falling back to redirect sign-in');

      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (redirectError) {
        console.error('Redirect sign-in also failed', redirectError);
        toast.error('Sign-in failed. Please allow popups for this site.');
      }

      return;
    }

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
