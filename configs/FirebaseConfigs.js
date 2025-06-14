// this are the rules for the realtime database
// {
//   "rules": {
//     ".read": "now < 1735237800000",  // 2024-12-27
//     ".write": "now < 1735237800000",  // 2024-12-27
//   }
// }

import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore"; // Add this import
import { getAuth } from "firebase/auth"; // If you're using Firebase Auth

const firebaseConfig = {
  apiKey: "AIzaSyAc_3UzizC6Y-hzI_5fDYmXiTSTwR69oac",
  authDomain: "bus-tracker-4e0fc.firebaseapp.com",
  databaseURL: "https://bus-tracker-4e0fc-default-rtdb.firebaseio.com",
  projectId: "bus-tracker-4e0fc",
  storageBucket: "bus-tracker-4e0fc.firebasestorage.app",
  messagingSenderId: "899399291440",
  appId: "1:899399291440:web:1c4535401988d905e293f5",
  measurementId: "G-JFC5HHBVGC",
  // 
  database:"bus-tracker-4e0fc-default-rtdb",
  secret: "M8V64XShmQJSbwjjd29et5FMQaDf75rVukSk86Vf"
};

const app = initializeApp(firebaseConfig);
const realtimeDatabase = getDatabase(app);
const firestoreDb = getFirestore(app); // Initialize Firestore properly

export { realtimeDatabase, firestoreDb };
