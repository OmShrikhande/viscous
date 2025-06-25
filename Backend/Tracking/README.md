# Bus Tracking System

A Node.js/Express backend server that monitors bus locations in real-time and updates stop status when a bus is within 50 meters of a stop.

## Features

- Real-time monitoring of bus location from Firebase Realtime Database
- Comparison of bus location with stop locations stored in Firestore
- Automatic marking of stops as "reached" when bus is within 50m radius
- REST API endpoints for accessing bus location and stop data

## Project Structure

```
/
├── config/
│   └── firebase.js       # Firebase configuration
├── services/
│   └── locationService.js # Location tracking and stop detection logic
├── test/
│   ├── testFirebase.js   # Test script for Firebase connectivity
│   ├── testLocation.js   # Test script for updating bus location
│   └── testSystem.js     # Test script for system integration
├── utils/
│   └── geoUtils.js       # Geolocation utility functions
├── install-deps.js       # Script to install dependencies
├── server.js             # Main Express server
├── simple-server.js      # Simplified server with mock data
├── package.json          # Project dependencies
└── README.md             # Project documentation
```

## Setup and Installation

1. Install dependencies:
   ```
   node install-deps.js
   ```
   This will clean up any existing node_modules directory and install all required dependencies.

2. Start the server:
   ```
   npm start
   ```

   For development with auto-restart:
   ```
   npm run dev
   ```

If you encounter any errors related to Firebase or other dependencies, you can try running the simple server version which doesn't rely on Firebase:
```
node simple-server.js
```

This will start a server with mock data that you can use to test the API endpoints.

## API Endpoints

- `GET /` - Server status check
- `GET /api/bus/location` - Get current bus location
- `GET /api/stops` - Get all stops and their status
- `POST /api/check-stops` - Manually trigger a check for stops reached

## How It Works

1. The server checks the bus location from Firebase Realtime Database every 5 seconds
2. It compares this location with all stop locations stored in Firestore
3. If the bus is within 50 meters of a stop, it updates the stop's "reached" status to true
4. It also adds a timestamp when the stop was reached

## Testing

### Test Scripts

The project includes several test scripts to help verify that everything is working correctly:

1. **Test Firebase Connectivity**:
   ```
   node test/testFirebase.js
   ```
   This script verifies that your application can connect to both Firebase Realtime Database and Firestore.

2. **Test System Integration**:
   ```
   node test/testSystem.js
   ```
   This script tests the entire system by:
   - Getting the current bus location
   - Getting all stops
   - Checking if any stops are within range
   - Updating the bus location to be near a stop
   - Checking if the stop is marked as reached

3. **Update Bus Location**:
   ```
   node test/testLocation.js <latitude> <longitude>
   ```
   Example:
   ```
   node test/testLocation.js 37.7749 -122.4194
   ```
   This will update the bus location to the specified coordinates, which can be used to test if the system correctly detects when the bus is within 50 meters of a stop.

### Verifying the System

To verify that the system is working correctly:

1. Start the server:
   ```
   node server.js
   ```

2. In another terminal, run the Firebase connectivity test:
   ```
   node test/testFirebase.js
   ```

3. If the Firebase connectivity test passes, run the system integration test:
   ```
   node test/testSystem.js
   ```

4. Check the server logs to see if the stop detection is working correctly.

## Firebase Structure

### Realtime Database
- `bus/Location/Latitude` - Current bus latitude
- `bus/Location/Longitude` - Current bus longitude

### Firestore
- Collection: `Route2/demo`
- Documents: Each stop with fields:
  - `Latitude` - Stop latitude
  - `Longitude` - Stop longitude
  - `reached` - Boolean indicating if bus has reached this stop
  - `timestamp` - Timestamp when the stop was reached