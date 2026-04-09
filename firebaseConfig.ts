import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth, initializeAuth } from "firebase/auth";
// @ts-ignore
import { getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: "money-tracker-81507.firebaseapp.com",
  projectId: "money-tracker-81507",
  storageBucket: "money-tracker-81507.firebasestorage.app",
  messagingSenderId: "1047599855639",
  appId: "1:1047599855639:web:bbb6d661f715445e0f4452",
  measurementId: "G-TCDLWB81ZW"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth based on platform
let auth: Auth;

if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

const db = getFirestore(app);

export { auth, db };
