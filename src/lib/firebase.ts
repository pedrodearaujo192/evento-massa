import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAz72cOTzdZ1E1iRNEVcZ85xvyBfWY85T4",
  authDomain: "layrse-eventos.firebaseapp.com",
  projectId: "layrse-eventos",
  storageBucket: "layrse-eventos.firebasestorage.app",
  messagingSenderId: "613148094014",
  appId: "1:613148094014:web:422b3898cb5f4543a46b6f",
  measurementId: "G-TPR3K1K55B"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Proteção contra SSR (Server Side Rendering)
export const analytics = typeof window !== 'undefined' 
  ? isSupported().then(yes => yes ? getAnalytics(app) : null)
  : Promise.resolve(null);
