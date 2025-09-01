// Centralized Firebase exports to prevent multiple initializations
import connectionManager, { firestoreDb, realtimeDatabase } from '../utils/firebaseConnectionManager';

export { addConnectionListener, forceReconnect, getConnectionStatus } from '../utils/firebaseConnectionManager';
export { firestoreDb, realtimeDatabase };
export default connectionManager;