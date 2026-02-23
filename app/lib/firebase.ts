import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Lazy-initialize Firebase only on the client side to avoid SSR issues with indexedDB
let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _googleProvider: GoogleAuthProvider | undefined;

function getFirebaseApp(): FirebaseApp {
  if (!_app) {
    _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }

  return _app;
}

function getFirebaseAuth(): Auth {
  if (!_auth) {
    _auth = getAuth(getFirebaseApp());
  }

  return _auth;
}

function getFirebaseFirestore(): Firestore {
  if (!_db) {
    _db = getFirestore(getFirebaseApp());
  }

  return _db;
}

function getGoogleProvider(): GoogleAuthProvider {
  if (!_googleProvider) {
    _googleProvider = new GoogleAuthProvider();
  }

  return _googleProvider;
}

// Use getters so Firebase is only initialized when accessed (on the client)
export const app = typeof window !== 'undefined' ? getFirebaseApp() : (undefined as unknown as FirebaseApp);
export const auth = typeof window !== 'undefined' ? getFirebaseAuth() : (undefined as unknown as Auth);
export const db = typeof window !== 'undefined' ? getFirebaseFirestore() : (undefined as unknown as Firestore);
export const googleProvider =
  typeof window !== 'undefined' ? getGoogleProvider() : (undefined as unknown as GoogleAuthProvider);
