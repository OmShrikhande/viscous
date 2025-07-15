// Firebase configuration with robust connection management

import connectionManager, { firestoreDb, realtimeDatabase } from '../utils/firebaseConnectionManager';

// Re-export the services from the connection manager
export { firestoreDb, realtimeDatabase };

// Export connection utilities
    export { addConnectionListener, forceReconnect, getConnectionStatus } from '../utils/firebaseConnectionManager';

// Export the connection manager for advanced usage
export default connectionManager;

vi