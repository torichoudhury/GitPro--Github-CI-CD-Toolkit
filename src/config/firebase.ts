import { initializeApp } from "firebase/app";
import { getAuth, GithubAuthProvider } from "firebase/auth";
import { getAuth as getExtensionAuth } from "firebase/auth/web-extension";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const isChromeExtensionContext =
  typeof window !== "undefined" && window.location.protocol === "chrome-extension:";

// Use the extension auth entrypoint for MV3 extension runtime.
export const auth = isChromeExtensionContext
  ? getExtensionAuth(app)
  : getAuth(app);

// Initialize GitHub Auth Provider
export const githubProvider = new GithubAuthProvider();

// Add scopes for GitHub authentication
githubProvider.addScope("user:email");
githubProvider.addScope("read:user");
githubProvider.addScope("repo");

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);

export default app;
