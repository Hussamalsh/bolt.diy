import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBhWEYffCc6DBPQ-oOiYh5GjFkMpve08E4',
  authDomain: 'adaraaiassistant-5ba6c.firebaseapp.com',
  projectId: 'adaraaiassistant-5ba6c',
  storageBucket: 'adaraaiassistant-5ba6c.firebasestorage.app',
  messagingSenderId: '917964594177',
  appId: '1:917964594177:web:2f16ec6559fdd20d82f400',
  measurementId: 'G-XNK3W6XGL8',
};

// Lazy-initialize Firebase only on the client side to avoid SSR issues with indexedDB
let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;
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

function getGoogleProvider(): GoogleAuthProvider {
  if (!_googleProvider) {
    _googleProvider = new GoogleAuthProvider();
  }

  return _googleProvider;
}

// Use getters so Firebase is only initialized when accessed (on the client)
export const app = typeof window !== 'undefined' ? getFirebaseApp() : (undefined as unknown as FirebaseApp);
export const auth = typeof window !== 'undefined' ? getFirebaseAuth() : (undefined as unknown as Auth);
export const googleProvider =
  typeof window !== 'undefined' ? getGoogleProvider() : (undefined as unknown as GoogleAuthProvider);
