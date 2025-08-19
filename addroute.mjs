import { initializeApp } from "firebase/app";
import { doc, getFirestore, setDoc } from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAc_3UzizC6Y-hzI_5fDYmXiTSTwR69oac",
  authDomain: "bus-tracker-4e0fc.firebaseapp.com",
  databaseURL: "https://bus-tracker-4e0fc-default-rtdb.firebaseio.com",
  projectId: "bus-tracker-4e0fc",
  storageBucket: "bus-tracker-4e0fc.appspot.com",
  messagingSenderId: "899399291440",
  appId: "1:899399291440:web:1c4535401988d905e293f5",
  measurementId: "G-JFC5HHBVGC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Generate nearby coordinates
function getNearbyCoordinates(lat, lng, offset = 0.005) {
  return {
    latitude: lat + (Math.random() - 0.5) * offset,
    longitude: lng + (Math.random() - 0.5) * offset
  };
}

// Format time like HHMMSS
function formatTime(date) {
  return date.toTimeString().split(" ")[0].replace(/:/g, "");
}

// Format date as DDMMYY
function formatDateDDMMYY(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

// Main function to add entries
async function addEntriesByTime() {
  const dateDoc = "1462025";
  const baseLat = 21.141580060703912;
  const baseLng = 79.18610985529213;

  for (let i = 0; i < 20; i++) {
    const now = new Date(Date.now() + i * 60000); // 1 min apart
    const timeStr = formatTime(now); // Used as document ID
    const location = getNearbyCoordinates(baseLat, baseLng);

    const data = {
      latitude: location.latitude,
      longitude: location.longitude,
      time: formatDateDDMMYY(now), // <-- DDMMYY format
      speed: 30 + Math.floor(Math.random() * 10),
      driverName: `Driver ${i + 1}`,
      status: i % 2 === 0 ? "Running" : "Stopped"
    };

    const docRef = doc(db, "Route1", dateDoc, "entries", timeStr);
    try {
      await setDoc(docRef, data);
      console.log(`✔️ Added entry at ${timeStr}`);
    } catch (err) {
      console.error(`❌ Failed at ${timeStr}:`, err);
    }
  }
}

addEntriesByTime();
