import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA69m0Jq4GzSxOeUr6ZzumlrSH9wcGy0p0",
  authDomain: "ecdis-route-finder.firebaseapp.com",
  projectId: "ecdis-route-finder",
  storageBucket: "ecdis-route-finder.appspot.com", // ✅ FIXED
  messagingSenderId: "636056685819",
  appId: "1:636056685819:web:20d9dadb661135123eb45e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
