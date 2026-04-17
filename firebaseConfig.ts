import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  initializeAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "firebase/auth";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration constants
const firebaseConfig = {
  apiKey: "AIzaSyBNyzssEirRuA3EmBUDlqyJP0CuyXGeRZk",
  authDomain: "money-tracker-81507.firebaseapp.com",
  projectId: "money-tracker-81507",
  storageBucket: "money-tracker-81507.firebasestorage.app",
  messagingSenderId: "1047599855639",
  appId: "1:1047599855639:web:bbb6d661f715445e0f4452",
  measurementId: "G-TCDLWB81ZW"
};

// Initialize app only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with secure persistence logic
let auth: ReturnType<typeof getAuth>;
try {
  // Try to use AsyncStorage dynamically if available in the auth export
  // @ts-ignore
  const { getReactNativePersistence } = require('firebase/auth');
  if (getReactNativePersistence) {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } else {
    // Fallback to standard initialization
    auth = initializeAuth(app);
  }
} catch (error) {
  auth = getAuth(app);
}

// Initialize Firestore with robust local caching enabled for offline support
const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});

// -- Platform Agnostic Auth Helpers --

export const signIn = async (email: string, password: string) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const signUp = async (email: string, password: string) => {
  return await createUserWithEmailAndPassword(auth, email, password);
};

export const signOutUser = async () => {
  return await signOut(auth);
};

export const updateUserPassword = async (newPassword: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error("No user logged in");
  return await updatePassword(user, newPassword);
};

export const deleteUserAccount = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("No user logged in");
  return await user.delete();
};

export const sendPasswordReset = async (email: string) => {
  return await sendPasswordResetEmail(auth, email);
};

export const onAuthChanged = (callback: any) => {
  return onAuthStateChanged(auth, callback);
};

export { auth, db };

