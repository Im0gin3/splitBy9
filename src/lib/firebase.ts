import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
};

// Initialize Firebase App singleton
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with local persistence
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Could not set persistence:', err);
});

const firestoreDbId =
  import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID ||
  firebaseConfigJson.firestoreDatabaseId;

// Initialize Firestore with specific databaseId if provided
export const db = firestoreDbId
  ? getFirestore(app, firestoreDbId)
  : getFirestore(app);

// Helper for internal deterministic email generation for predefined members
export function getInternalEmail(predefinedPersonId: string): string {
  return `${predefinedPersonId.toLowerCase()}@mealplanner.internal`;
}
