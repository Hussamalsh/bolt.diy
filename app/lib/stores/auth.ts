import { atom } from 'nanostores';
import { auth, db, googleProvider } from '~/lib/firebase';
import { resetFirestoreConnection } from '~/lib/stores/firestore';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-toastify';

export const userStore = atom<User | null>(null);
export const authLoadingStore = atom<boolean>(true);

let lastAuthUserId: string | null = null;

/**
 * Upserts a document in the `users/{uid}` collection.
 * - Creates the document on first login (sets `createdAt`).
 * - Merges on subsequent logins so extra fields (e.g. `plan`) are preserved.
 * - Always refreshes `lastLoginAt`.
 */
async function syncUserToFirestore(user: User): Promise<void> {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnapshot = await getDoc(userRef);
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastLoginAt: serverTimestamp(),
    };

    if (userSnapshot.exists()) {
      await setDoc(userRef, userData, { merge: true });
      return;
    }

    await setDoc(
      userRef,
      {
        ...userData,
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error('Failed to sync user to Firestore:', error);
  }
}

if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, (user) => {
    const nextUserId = user?.uid ?? null;

    if (lastAuthUserId && lastAuthUserId !== nextUserId) {
      resetFirestoreConnection();
    }

    lastAuthUserId = nextUserId;
    userStore.set(user);
    authLoadingStore.set(false);

    if (user) {
      syncUserToFirestore(user);
    }
  });

  getRedirectResult(auth).catch((error) => {
    console.error('Error with Google redirect sign-in', error);
    toast.error(`Sign-in failed: ${error.message || 'Unknown error'}`);
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
    const authError = error as { code?: string; message?: string };
    const code = authError.code;
    const message = authError.message || 'Unknown error';
    const isChatRoute =
      typeof window !== 'undefined' &&
      (window.location.pathname === '/chat' || window.location.pathname.startsWith('/chat/'));
    const isCoopContext = typeof window !== 'undefined' && (window.crossOriginIsolated || isChatRoute);
    const hasCoopMessage = message.includes('Cross-Origin-Opener-Policy');
    const isPopupBlocked = code === 'auth/popup-blocked';
    const isPopupClosedByUser = code === 'auth/popup-closed-by-user';

    if (isPopupClosedByUser && !isCoopContext) {
      // User dismissed the popup on a normal page; this is not an auth failure.
      return;
    }

    if (hasCoopMessage || isPopupBlocked || (isPopupClosedByUser && isCoopContext)) {
      const reason = hasCoopMessage ? 'COOP' : isPopupBlocked ? 'popup blocked' : 'popup unusable on COOP page';
      console.warn(`Popup sign-in failed (${reason}), falling back to redirect:`, error);

      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (redirectError: unknown) {
        const redirectAuthError = redirectError as { message?: string };
        console.error('Error signing in with Google redirect', redirectError);
        toast.error(`Sign-in failed: ${redirectAuthError.message || 'Unknown error'}`);
      }

      return;
    }

    console.error('Error signing in with Google popup', error);
    toast.error(`Sign-in failed: ${message}`);
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    resetFirestoreConnection();
  } catch (error) {
    console.error('Error signing out', error);
  }
};
