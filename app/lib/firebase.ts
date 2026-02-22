import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBhWEYffCc6DBPQ-oOiYh5GjFkMpve08E4',
  authDomain: 'adaraaiassistant-5ba6c.firebaseapp.com',
  projectId: 'adaraaiassistant-5ba6c',
  storageBucket: 'adaraaiassistant-5ba6c.firebasestorage.app',
  messagingSenderId: '917964594177',
  appId: '1:917964594177:web:2f16ec6559fdd20d82f400',
  measurementId: 'G-XNK3W6XGL8',
};

// Initialize Firebase only if it hasn't been initialized already (important for SSR/HMR)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, googleProvider };
