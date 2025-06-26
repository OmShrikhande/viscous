const express = require("express");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

// 🔐 Replace this with your Firebase Admin SDK private key
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

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

// Start server
const PORT = process.env.PORT3 || 3001;
app.listen(PORT, () => {
  console.log(`🚀 ESP8266 Server started on port ${PORT}`);
});
