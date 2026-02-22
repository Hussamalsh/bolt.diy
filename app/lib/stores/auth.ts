import { atom } from 'nanostores';
import { auth, googleProvider } from '~/lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, type User } from 'firebase/auth';

export const userStore = atom<User | null>(null);
export const authLoadingStore = atom<boolean>(true);

// Subscribe to auth state changes
if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, (user) => {
    userStore.set(user);
    authLoadingStore.set(false);
  });
}

export const signInWithGoogle = async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error('Error signing in with Google', error);

    // You might want to show a toast or handle the error more gracefully here
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out', error);
  }
};
