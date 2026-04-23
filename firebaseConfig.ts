import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged,
  sendPasswordResetEmail
} from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';

// Initialize Firestore and Auth instances using modular getters
const db = getFirestore();
const authInstance = getAuth();

// -- Platform Agnostic Auth Helpers --

export const signIn = async (email: string, password: string) => {
  return await signInWithEmailAndPassword(authInstance, email, password);
};

export const signUp = async (email: string, password: string) => {
  return await createUserWithEmailAndPassword(authInstance, email, password);
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
  return await sendPasswordResetEmail(authInstance, email);
};

export const onAuthChanged = (callback: any) => {
  return onAuthStateChanged(authInstance, callback);
};

export { authInstance as auth, db };
