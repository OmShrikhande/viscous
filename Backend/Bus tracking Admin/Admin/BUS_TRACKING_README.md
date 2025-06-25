# Bus Tracking Functionality

This document provides an overview of the bus tracking functionality added to the Admin application.

## Features

1. **View Info Button**: Added to the user table to access detailed bus driver information and tracking
2. **Detailed User Information Page**: Shows comprehensive information about the bus driver
3. **Live Bus Tracking**: Real-time tracking of bus location on a map
4. **Route Highlighting**: Visualizes the path the bus has traveled
5. **Historical Data**: View past routes by selecting specific dates

## How to Use

### Accessing Bus Tracking

1. Go to the "Users" page
2. Find the user (bus driver) you want to track
3. Click the "View Info" button next to their name
4. This will open the detailed user information page with bus tracking functionality

### Bus Tracking Page

The bus tracking page has three tabs:

1. **Driver Information**: Shows personal and employment details
2. **Bus Tracking**: Shows the live map with bus location and route
3. **Trip History**: Shows a log of past trips with details

### Using the Map

- **Live Tracking**: Click the "Live Tracking" button to see real-time updates
- **Historical View**: Select a date from the date picker to view routes from that day
- **Route Information**: The total distance traveled is displayed below the map
- **Focus Bus**: Click the "Focus Bus" button to center the map on the current bus location

## Technical Implementation

### Frontend

- React components for the bus tracking interface
- Leaflet.js for interactive maps
- Real-time updates using Firebase Firestore listeners

### Backend

- Firebase Firestore for storing location data
- RESTful API endpoints for retrieving bus location data
- Authentication to ensure only authorized users can access tracking data

### Data Structure

Location data in Firebase has the following structure:

```
{
  userId: "user_id",
  latitude: 12.9716,
  longitude: 77.5946,
  timestamp: Timestamp,
  speed: 45,
  heading: 180,
  accuracy: 10
}
```

## Testing the Functionality

A script has been provided to generate test data:

```
node Admin/Backend/scripts/simulateBusData.js
```

This will populate the Firebase database with sample bus routes for testing.

## Configuration

Make sure your `.env` file includes the following Firebase configuration:

```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
```