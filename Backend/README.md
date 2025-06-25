# Bus Tracking Combined Server

This project combines three different backend systems into a single application that can be run simultaneously:

1. **ESP8266 Server**: Receives location data from NodeMCU and sends it to Firebase Firestore
2. **Tracking Server**: Monitors bus location from Firebase Realtime Database and updates stop status in Firestore
3. **Admin Backend**: Provides admin functionality and serves the frontend application

## System Architecture

The system works as follows:

- **ESP8266 Server** (Port 3001): Receives location data from NodeMCU hardware and stores it in Firebase Firestore's `locationhistory` collection
- **Tracking Server** (Port 3002): Monitors bus location from Firebase Realtime Database and checks if the bus has reached any stops, updating their status in Firestore's `Route2` collection
- **Admin Backend** (Port 5000): Provides admin functionality and serves the frontend application

All three servers use the same Firebase project (`bus-tracker-4e0fc`) but interact with different parts of it.

## Installation

To install all dependencies for all three servers, run:

```bash
node install-all.js
```

Or use npm:

```bash
npm run install-all
```

## Running the Combined Server

To start all three servers simultaneously, run:

```bash
npm start
```

For development with auto-restart on file changes:

```bash
npm run dev
```

## Server Ports

- ESP8266 Server: http://localhost:3001
- Tracking Server: http://localhost:3002
- Admin Backend: http://localhost:5000

## Firebase Configuration

All three servers use the same Firebase project with the following configuration:

- Project ID: `bus-tracker-4e0fc`
- Realtime Database URL: `https://bus-tracker-4e0fc-default-rtdb.firebaseio.com`

## Troubleshooting

If you encounter any issues:

1. Make sure all dependencies are installed by running `npm run install-all`
2. Check that the Firebase configuration is correct in all three servers
3. Ensure that no other applications are using the specified ports
4. Check the console output for any error messages

## License

This project is licensed under the ISC License.