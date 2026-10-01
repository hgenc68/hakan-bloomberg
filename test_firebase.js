import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

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
const db = getFirestore(app);

async function test() {
  console.log("Testing Firestore connection...");
  try {
    await setDoc(doc(db, "system_test", "ping"), { status: "connected", timestamp: new Date().toISOString() });
    const snap = await getDoc(doc(db, "system_test", "ping"));
    console.log("Firestore SUCCESS:", snap.data());
    process.exit(0);
  } catch (err) {
    console.error("Firestore ERROR:", err.message);
    process.exit(1);
  }
}

test();
