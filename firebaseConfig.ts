import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Initialize Firestore and Auth instances
const db = firestore();
const authInstance = auth();

// Native SDK handles persistence automatically, no manual logic needed.

// -- Platform Agnostic Auth Helpers --

export const signIn = async (email: string, password: string) => {
  return await authInstance.signInWithEmailAndPassword(email, password);
};

export const signUp = async (email: string, password: string) => {
  return await authInstance.createUserWithEmailAndPassword(email, password);
};

export const signOutUser = async () => {
  return await authInstance.signOut();
};

export const updateUserPassword = async (newPassword: string) => {
  const user = authInstance.currentUser;
  if (!user) throw new Error("No user logged in");
  return await user.updatePassword(newPassword);
};

export const deleteUserAccount = async () => {
  const user = authInstance.currentUser;
  if (!user) throw new Error("No user logged in");
  return await user.delete();
};

export const sendPasswordReset = async (email: string) => {
  return await authInstance.sendPasswordResetEmail(email);
};

export const onAuthChanged = (callback: any) => {
  return authInstance.onAuthStateChanged(callback);
};

export { authInstance as auth, db };
