const express = require("express");
const admin = require("firebase-admin");

const app = express();

// ✅ Use built-in JSON body parser
app.use(express.json());

// Initialize Firebase Admin SDK using environment variables
let firebaseConfig;

if (
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
) {
  console.log("Using Firebase credentials from environment variables");

  const serviceAccount = {
    type: process.env.FIREBASE_TYPE || 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '0849db45edf7ce912eb97332f7c9d06140652aba',
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID || '103042057968763161674',
    auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
    token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL || `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN || 'googleapis.com'
  };

  firebaseConfig = {
    credential: admin.credential.cert(serviceAccount)
  };
} else {
  console.log("Trying to use serviceAccountKey.json file");
  try {
    const serviceAccount = require("./serviceAccountKey.json");
    firebaseConfig = {
      credential: admin.credential.cert(serviceAccount)
    };
  } catch (error) {
    console.error("Error loading Firebase credentials:", error.message);
    console.error("Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables");
    process.exit(1);
  }
}

// Initialize Firebase Admin
admin.initializeApp(firebaseConfig);
const db = admin.firestore();

// ✅ Add a health check endpoint
app.get("/", (req, res) => {
  res.send("✅ ESP8266 Backend is running!");
});

// 📍 POST endpoint
app.post("/upload", async (req, res) => {
  try {
    const data = req.body;

    if (!data || !data.location || !data.distance) {
      return res.status(400).send("Missing required data.");
    }

    const now = new Date();
    const pad = (n) => n.toString().padStart(2, "0");

    // Format: DDMMYY
    const date = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear().toString().slice(2)}`;
    // Format: HHMMSS
    const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    const docRef = db
      .collection("locationhistory")
      .doc(date)
      .collection("entries")
      .doc(time);

    await docRef.set({
      Latitude: data.location.latitude,
      Longitude: data.location.longitude,
      Speed: data.location.speed,
      Timestamp: data.location.timestamp,
    });

    console.log(`✅ Data written to Firestore at: ${date}/entries/${time}`);
    res.status(200).send("Data saved to Firestore.");
  } catch (error) {
    console.error("❌ Firestore error:", error);
    res.status(500).send("Failed to save to Firestore.");
  }
});

// 🚀 Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 ESP8266 Server started on port ${PORT}`);
});
