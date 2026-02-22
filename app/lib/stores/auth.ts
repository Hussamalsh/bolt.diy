import { atom } from 'nanostores';
import { auth, googleProvider } from '~/lib/firebase';
import {
  getRedirectResult,
  onAuthStateChanged,
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

  // Process redirect result when returning from Google sign-in
  getRedirectResult(auth).catch((error: unknown) => {
    const firebaseError = error as { code?: string; message?: string };
    console.error('Error processing redirect sign-in result', firebaseError);
    toast.error(`Sign-in failed: ${firebaseError.message || 'Unknown error'}`);
  });
}

export const signInWithGoogle = async () => {
  try {
    await signInWithRedirect(auth, googleProvider);
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
