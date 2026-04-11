import { Platform } from "react-native";

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

let auth: any;
let db: any;

// Initialize instances based on platform
if (Platform.OS === 'web') {
  const { initializeApp, getApps, getApp } = require("firebase/app");
  const { getAuth } = require("firebase/auth");
  const { getFirestore } = require("firebase/firestore");

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  // Safe way to load native Firebase modules
  const firebaseAuth = require('@react-native-firebase/auth');
  const firebaseFirestore = require('@react-native-firebase/firestore');

  // RN Firebase modules export a function as default
  auth = firebaseAuth.default ? firebaseAuth.default() : firebaseAuth();
  db = firebaseFirestore.default ? firebaseFirestore.default() : firebaseFirestore();

  // Handle settings safely
  try {
    const firestoreModule = firebaseFirestore.default || firebaseFirestore;
    if (firestoreModule.CACHE_SIZE_UNLIMITED !== undefined) {
      db.settings({
        cacheSizeBytes: firestoreModule.CACHE_SIZE_UNLIMITED,
      });
    }
  } catch (e) {
    console.warn("Firestore settings error:", e);
  }
}

// -- Platform Agnostic Auth Helpers --

export const signIn = async (email: any, password: any) => {
  if (Platform.OS === 'web') {
    const { signInWithEmailAndPassword } = require("firebase/auth");
    return await signInWithEmailAndPassword(auth, email, password);
  } else {
    return await auth.signInWithEmailAndPassword(email, password);
  }
};

export const signUp = async (email: any, password: any) => {
  if (Platform.OS === 'web') {
    const { createUserWithEmailAndPassword } = require("firebase/auth");
    return await createUserWithEmailAndPassword(auth, email, password);
  } else {
    return await auth.createUserWithEmailAndPassword(email, password);
  }
};

export const signOutUser = async () => {
  if (Platform.OS === 'web') {
    const { signOut } = require("firebase/auth");
    return await signOut(auth);
  } else {
    return await auth.signOut();
  }
};

export const updateUserPassword = async (newPassword: any) => {
  const user = auth.currentUser;
  if (!user) throw new Error("No user logged in");

  if (Platform.OS === 'web') {
    const { updatePassword } = require("firebase/auth");
    return await updatePassword(user, newPassword);
  } else {
    return await user.updatePassword(newPassword);
  }
};

export const deleteUserAccount = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("No user logged in");
  return await user.delete();
};

export const sendPasswordReset = async (email: string) => {
  if (Platform.OS === 'web') {
    const { sendPasswordResetEmail } = require("firebase/auth");
    return await sendPasswordResetEmail(auth, email);
  } else {
    return await auth.sendPasswordResetEmail(email);
  }
};

export const onAuthChanged = (callback: any) => {
  if (Platform.OS === 'web') {
    const { onAuthStateChanged } = require('firebase/auth');
    return onAuthStateChanged(auth, callback);
  } else {
    return auth.onAuthStateChanged(callback);
  }
};

export { auth, db };
