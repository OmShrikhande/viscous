# Firebase Setup for Visit Location Functionality

This application now uses Firebase for storing visit location data. Follow these steps to set up your Firebase credentials:

## 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Enable Firestore Database and Storage in your project

## 2. Generate Service Account Credentials

1. In your Firebase project, go to Project Settings > Service Accounts
2. Click "Generate new private key"
3. Save the JSON file securely

## 3. Update Environment Variables

Open the `.env` file in the Backend directory and update the following variables with your Firebase credentials:

```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

**Important Notes:**
- Make sure to keep your private key secure and never commit it to version control
- The private key should include the newline characters (`\n`) as shown above
- The storage bucket name typically follows the format `your-project-id.appspot.com`

## 4. Firestore Database Structure

The application will automatically create the following collections in Firestore:

- `visitLocations`: Stores visit location data

## 5. Storage Structure

Images will be stored in Firebase Storage with the following path structure:

- `visit-locations/{visitId}/{timestamp}-{filename}`

## 6. Testing the Setup

After setting up Firebase, restart the server and test the visit location endpoints:

- POST `/api/visit-location` - Create a new visit location
- GET `/api/visit-location` - Get all visit locations
- PUT `/api/visit-location/:id` - Update a visit location
- DELETE `/api/visit-location/:id` - Delete a visit location
- POST `/api/visit-location/:id/image` - Upload an image for a visit location
- GET `/api/visit-location/:id/image/:index` - Get an image for a visit location