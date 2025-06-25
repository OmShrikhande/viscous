const express = require('express');
const router = express.Router();
const { initializeFirebaseAdmin, admin } = require('../firebase-service-account');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Firebase Admin
initializeFirebaseAdmin();

const db = admin.firestore();
const bucket = admin.storage().bucket();
const visitLocationsCollection = db.collection('visitLocations');

// CREATE
router.post('/visit-location', async (req, res) => {
  try {
    const data = {
      ...req.body,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await visitLocationsCollection.add(data);
    const newDoc = await docRef.get();
    
    res.json({
      id: docRef.id,
      ...newDoc.data()
    });
  } catch (err) {
    console.error('Error creating visit location:', err);
    res.status(400).json({ error: err.message });
  }
});

// READ (all)
router.get('/visit-location', async (req, res) => {
  try {
    const snapshot = await visitLocationsCollection.get();
    const locations = [];
    
    snapshot.forEach(doc => {
      locations.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json(locations);
  } catch (err) {
    console.error('Error fetching visit locations:', err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE
router.put('/visit-location/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await visitLocationsCollection.doc(id).update(data);
    const updatedDoc = await visitLocationsCollection.doc(id).get();
    
    if (!updatedDoc.exists) {
      return res.status(404).json({ error: 'Visit location not found' });
    }
    
    res.json({
      id: updatedDoc.id,
      ...updatedDoc.data()
    });
  } catch (err) {
    console.error('Error updating visit location:', err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE
router.delete('/visit-location/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if document exists
    const doc = await visitLocationsCollection.doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Visit location not found' });
    }
    
    // Delete any associated images from storage
    const data = doc.data();
    if (data.images && data.images.length > 0) {
      for (const image of data.images) {
        if (image.path) {
          try {
            await bucket.file(image.path).delete();
          } catch (storageErr) {
            console.warn(`Failed to delete image ${image.path}:`, storageErr);
          }
        }
      }
    }
    
    // Delete the document
    await visitLocationsCollection.doc(id).delete();
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting visit location:', err);
    res.status(400).json({ error: err.message });
  }
});

// Upload image for a visit location
router.post('/visit-location/:id/image', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // 'start' or 'complete'
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    // Check if document exists
    const docRef = visitLocationsCollection.doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Visit location not found' });
    }
    
    // Upload image to Firebase Storage
    const fileName = `visit-locations/${id}/${Date.now()}-${req.file.originalname}`;
    const fileUpload = bucket.file(fileName);
    
    const blobStream = fileUpload.createWriteStream({
      metadata: {
        contentType: req.file.mimetype
      }
    });
    
    blobStream.on('error', (error) => {
      console.error('Error uploading to Firebase Storage:', error);
      res.status(500).json({ error: 'Failed to upload image' });
    });
    
    blobStream.on('finish', async () => {
      // Make the file publicly accessible
      await fileUpload.makePublic();
      
      // Get the public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      
      // Add image reference to the document
      const imageData = {
        path: fileName,
        url: publicUrl,
        contentType: req.file.mimetype,
        type: type || 'start',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        location: req.body.location || null
      };
      
      // Update the document with the new image
      await docRef.update({
        images: admin.firestore.FieldValue.arrayUnion(imageData),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      res.json({
        success: true,
        image: imageData
      });
    });
    
    blobStream.end(req.file.buffer);
  } catch (err) {
    console.error('Error handling image upload:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET image by visit location ID and image index
router.get('/visit-location/:id/image/:index', async (req, res) => {
  try {
    const { id, index } = req.params;
    
    // Get the document
    const doc = await visitLocationsCollection.doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Visit location not found' });
    }
    
    const data = doc.data();
    
    if (!data.images || !data.images[index]) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    const image = data.images[index];
    
    // Redirect to the image URL
    if (image.url) {
      return res.redirect(image.url);
    } else {
      return res.status(404).json({ error: 'Image URL not found' });
    }
  } catch (err) {
    console.error('Error fetching image:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;