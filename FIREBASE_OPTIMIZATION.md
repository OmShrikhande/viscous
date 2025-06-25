# Firebase Optimization Guide

## Problem

The app was experiencing excessive Firestore reads (59K+ in just 2 hours) even when the app was closed or in the background, especially during nighttime when the app shouldn't be actively querying data. This would cause significant performance and cost issues, especially with multiple users.

## Solution

We've implemented a comprehensive Firebase listener management system that:

1. Properly unsubscribes all Firebase listeners when the app is in background/closed
2. Adds time-based control to disable listeners during nighttime (11 PM - 6 AM)
3. Creates a centralized listener management system with different listener types:
   - `foreground`: Only active when the app is in the foreground
   - `background`: Can run in the background but respects active hours
   - `critical`: Always runs (use sparingly)

## Implementation Details

### 1. Firebase Listener Manager

We created a new utility file `utils/firebaseListenerManager.js` that:

- Tracks app state (foreground/background)
- Manages active hours (6 AM - 11 PM by default)
- Provides a registration system for Firebase listeners
- Automatically unsubscribes listeners based on app state and time
- Resumes listeners when appropriate

### 2. Listener Types

The system supports three types of listeners:

- **Foreground Listeners**: Only active when the app is in the foreground and visible to the user
- **Background Listeners**: Can run in the background but respect active hours
- **Critical Listeners**: Always run regardless of app state or time (use sparingly)

### 3. Component Updates

All components that use Firebase listeners have been updated to:

- Register their listeners with the listener manager
- Specify the appropriate listener type
- Use the unregister function for cleanup

### 4. Background Task

A background task runs periodically to check the time and manage listeners accordingly, ensuring that even when the app is closed, listeners are properly managed.

## Usage

### Registering a Listener

```javascript
import { registerListener } from '../../utils/firebaseListenerManager';

// In a useEffect or similar
const myListener = onSnapshot(docRef, (snapshot) => {
  // Handle snapshot
});

// Register the listener with the manager
const unregisterMyListener = registerListener(
  'unique-listener-id',  // Unique ID for this listener
  myListener,            // The unsubscribe function returned by onSnapshot
  'foreground'           // Listener type: 'foreground', 'background', or 'critical'
);

// Clean up when component unmounts
return () => unregisterMyListener();
```

### Checking Listener Status

```javascript
import { useListenerStatus } from '../../utils/firebaseListenerManager';

function MyComponent() {
  const { isWithinActiveHours, currentAppState } = useListenerStatus();
  
  // Use these values to conditionally render or behave differently
  // based on whether listeners are active
}
```

## Benefits

1. **Reduced Firestore Reads**: By properly managing listeners, we significantly reduce unnecessary Firestore reads
2. **Battery Optimization**: Less background activity means better battery life for users
3. **Cost Efficiency**: Lower Firestore usage means lower Firebase costs
4. **Improved Performance**: The app runs more efficiently with proper resource management
5. **Time-Based Control**: No unnecessary data fetching during nighttime hours

## Configuration

You can adjust the active hours in `utils/firebaseListenerManager.js`:

```javascript
const ACTIVE_HOURS_START = 6;  // 6 AM
const ACTIVE_HOURS_END = 23;   // 11 PM
```

## Monitoring

To monitor the effectiveness of these changes:

1. Check Firebase console for Firestore read operations
2. Look for log messages with "listener" in them to see listener registration/unregistration
3. Test the app in different states (foreground, background, closed) and at different times