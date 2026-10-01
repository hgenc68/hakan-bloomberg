import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBrwtW-KerM1OEQKZQfnKoK5oUlF2SwT4E",
  authDomain: "hakan-bloomberg.firebaseapp.com",
  projectId: "hakan-bloomberg",
  storageBucket: "hakan-bloomberg.firebasestorage.app",
  messagingSenderId: "151865370484",
  appId: "1:151865370484:web:4de606a6facf3c41dcae21",
  measurementId: "G-4LBFYQEFXD"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;
