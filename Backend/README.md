# Bus Tracking System - Unified Backend

This project combines three different backend systems into a single application that can be run simultaneously:

1. **ESP8266 Server**: Receives location data from NodeMCU and sends it to Firebase Firestore
2. **Tracking Server**: Monitors bus location from Firebase Realtime Database and updates stop status in Firestore
3. **Admin Backend**: Provides admin functionality and serves the frontend application

## New Unified Structure

The backend has been optimized to:
- Use a single `node_modules` installation
- Share environment variables through a centralized `.env` file
- Simplify deployment with a unified setup process

## System Architecture

The system works as follows:

- **ESP8266 Device**: Sends location data directly to Firebase Realtime Database at `bus/` path
- **ESP8266 Server**: Monitors Firebase Realtime Database for new data and processes it to Firestore's `locationhistory` collection
- **Tracking Server**: Monitors bus location from Firebase Realtime Database and checks if the bus has reached any stops, updating their status in Firestore's `Route2` collection
- **Admin Backend**: Provides admin functionality and serves the frontend application

### Data Flow
1. **ESP8266/NodeMCU** → Firebase Realtime Database (`bus/Location` and `bus/Distance`)
2. **Server Listener** → Monitors Realtime Database → Processes to Firestore (`locationhistory` collection)
3. **Tracking Service** → Monitors location → Updates stop status
4. **Admin Backend** → Provides API and frontend access

All servers use the same Firebase project but interact with different parts of it.

## Setup Instructions

### 1. Initial Setup

Run the setup script to install dependencies and configure the environment:

```bash
npm run setup
```

This script will:
- Install all required dependencies in the main Backend folder
- Create symbolic links to share node_modules with all servers
- Guide you through creating a `.env` file
- Check for required Firebase service account files

### 2. Firebase Configuration

All Firebase credentials are stored directly in the `.env` file, eliminating the need for separate JSON files.

The setup script will:
1. Guide you through creating a `.env` file with all necessary Firebase credentials
2. Configure all servers to use these credentials from environment variables

This approach simplifies deployment and makes it easier to manage credentials in one place.

All servers will use the same Firebase project, with credentials shared through environment variables.

### 3. Starting the Servers

To start all servers:

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

## Environment Variables

The following environment variables can be configured in the `.env` file:

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Port for unified server | 3000 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/bus-tracking |
| JWT_SECRET | Secret for JWT token generation | (random string) |
| JWT_EXPIRY | JWT token expiry | 7d |
| API_BASE_URL | Base URL for API | http://localhost:3000 |

### Firebase Environment Variables

#### Firebase Web SDK Variables
| Variable | Description | Default |
|----------|-------------|---------|
| FIREBASE_API_KEY | Firebase Web API Key | AIzaSyAc_3UzizC6Y-hzI_5fDYmXiTSTwR69oac |
| FIREBASE_AUTH_DOMAIN | Firebase Auth Domain | bus-tracker-4e0fc.firebaseapp.com |
| FIREBASE_DATABASE_URL | Firebase Realtime Database URL | https://bus-tracker-4e0fc-default-rtdb.firebaseio.com |
| FIREBASE_PROJECT_ID | Firebase Project ID | bus-tracker-4e0fc |
| FIREBASE_STORAGE_BUCKET | Firebase Storage Bucket | bus-tracker-4e0fc.appspot.com |
| FIREBASE_MESSAGING_SENDER_ID | Firebase Messaging Sender ID | 899399291440 |
| FIREBASE_APP_ID | Firebase App ID | 1:899399291440:web:1c4535401988d905e293f5 |
| FIREBASE_MEASUREMENT_ID | Firebase Measurement ID | G-JFC5HHBVGC |

#### Firebase Admin SDK Variables
| Variable | Description | Default |
|----------|-------------|---------|
| FIREBASE_TYPE | Service account type | service_account |
| FIREBASE_PROJECT_ID | Firebase Project ID | bus-tracker-4e0fc |
| FIREBASE_PRIVATE_KEY_ID | Private key ID | 0849db45edf7ce912eb97332f7c9d06140652aba |
| FIREBASE_PRIVATE_KEY | Private key (with escaped newlines) | (private key) |
| FIREBASE_CLIENT_EMAIL | Service account email | firebase-adminsdk-4mtdb@bus-tracker-4e0fc.iam.gserviceaccount.com |
| FIREBASE_CLIENT_ID | Client ID | 103042057968763161674 |
| FIREBASE_AUTH_URI | Auth URI | https://accounts.google.com/o/oauth2/auth |
| FIREBASE_TOKEN_URI | Token URI | https://oauth2.googleapis.com/token |
| FIREBASE_AUTH_PROVIDER_X509_CERT_URL | Auth provider cert URL | https://www.googleapis.com/oauth2/v1/certs |
| FIREBASE_CLIENT_X509_CERT_URL | Client cert URL | (URL with project ID) |
| FIREBASE_UNIVERSE_DOMAIN | Universe domain | googleapis.com |

## Running the Server

To run the server:

```bash
npm start
```

This will start a unified server on port 3000 (or the port specified in your .env file) with all services available at:
- ESP8266 Server Status: http://localhost:3000/esp8266/status
- ESP8266 Manual Process: http://localhost:3000/esp8266/process
- Tracking Server: http://localhost:3000/tracking
- Admin Backend: http://localhost:3000/api

**Note**: The ESP8266 device should now write directly to Firebase Realtime Database instead of making HTTP requests to the server.

### ESP8266 Device Configuration

The ESP8266/NodeMCU device should be configured to write data directly to Firebase Realtime Database using the following structure:

```json
{
  "bus": {
    "Location": {
      "Latitude": 23.5204,
      "Longitude": 87.3119,
      "Speed": 45.2,
      "Timestamp": "2024-01-15T10:30:00Z"
    },
    "Distance": {
      "DailyDistance": 125.5
    }
  }
}
```

**Firebase Realtime Database URL**: `https://bus-tracker-4e0fc-default-rtdb.firebaseio.com`

**Required ESP8266 Libraries**:
- FirebaseESP8266 (for writing to Realtime Database)
- ArduinoJson (for JSON handling)
- ESP8266WiFi (for WiFi connectivity)

For development with auto-restart on file changes:

```bash
npm run dev
```

### Legacy Mode (Multiple Ports)

If you need to run the servers on separate ports for development purposes:

```bash
npm run legacy
```

This will start:
- ESP8266 Server on port 3001
- Tracking Server on port 3002
- Admin Backend on port 5000

For development with auto-restart on file changes in legacy mode:

```bash
npm run dev-legacy
```

**Note:** The unified server is recommended for all deployments, especially on platforms like Render that limit the number of ports or services.

## Troubleshooting

If you encounter any issues:

1. Make sure all dependencies are installed by running `npm run setup`
2. Check that the Firebase configuration is correct in the `.env` file
3. Ensure that no other applications are using the specified ports
4. Check the console output for any error messages
5. Verify that the `.env` file contains all required variables

### Symbolic Link Issues

If you encounter problems with symbolic links (especially on Windows):

1. Run the setup script with administrator privileges
2. If symbolic links fail, you can manually copy the node_modules folder to each server directory
3. Alternatively, you can modify the server paths in server.js to use absolute paths

### Firebase Configuration Issues

If you encounter Firebase-related errors:

1. Make sure all Firebase environment variables are correctly set in the `.env` file
2. Check that the Firebase project exists and has the correct permissions
3. Verify that the Firebase Admin SDK private key is correctly formatted with escaped newlines
4. If using the Tracking Server, ensure the `config/firebase.js` file exists and is correctly configured

## Deployment

For deployment, you only need to:
1. Clone the repository
2. Run `npm run setup` to configure everything
3. Start the servers with `npm start`

All servers will run from a single node_modules installation, simplifying maintenance and updates.

## License

This project is licensed under the ISC License.