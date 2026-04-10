import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// -- Web Imports --
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// -- Native Imports --
import nativeAuth from '@react-native-firebase/auth';
import nativeFirestore from '@react-native-firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: "money-tracker-81507.firebaseapp.com",
  projectId: "money-tracker-81507",
  storageBucket: "money-tracker-81507.firebasestorage.app",
  messagingSenderId: "1047599855639",
  appId: "1:1047599855639:web:bbb6d661f715445e0f4452",
  measurementId: "G-TCDLWB81ZW"
};

let auth: any;
let db: any;

if (Platform.OS === 'web') {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  // @react-native-firebase initializes itself automatically from google-services.json / GoogleService-Info.plist
  auth = nativeAuth();
  db = nativeFirestore();
  
  // Enable Firestore persistence (should be enabled by default in native, but good to be explicit)
  db.settings({
    persistence: true,
  });
}

export { auth, db };
