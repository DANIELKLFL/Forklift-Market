import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD2RIPbCkPgHt_qKAb1Sw2r-CyY-IroNJk",
  authDomain: "forklift-market.firebaseapp.com",
  projectId: "forklift-market",
  storageBucket: "forklift-market.firebasestorage.app",
  messagingSenderId: "434473189095",
  appId: "1:434473189095:web:19269a7ccd304a436e2c42"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
