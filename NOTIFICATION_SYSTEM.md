# Bus Tracker Notification System

## Overview

The Bus Tracker app uses a robust notification system to alert users about bus arrivals and other important events. The system is designed to work in all app states:

- When the app is in the foreground
- When the app is in the background
- When the app is completely closed

## Implementation Details

### Core Components

1. **Notification Helper (`utils/notificationHelper.js`)**
   - Centralized utility for all notification-related functionality
   - Handles permission requests, notification sending, and listener management
   - Configures platform-specific settings for iOS and Android

2. **Root Layout Listeners (`app/_layout.tsx`)**
   - Sets up global notification listeners
   - Handles deep linking when notifications are tapped
   - Routes users to the appropriate screen based on notification data

3. **Bus Stop Timeline Integration (`components/home/BusStopTimeline.jsx`)**
   - Sends notifications when buses reach stops
   - Includes relevant data for deep linking and context

## Key Features

### Background Notifications

Notifications will appear in the system notification panel even when the app is in the background or closed. This is achieved through:

- Proper configuration of notification channels (Android)
- Setting appropriate notification priorities
- Using scheduled triggers to ensure delivery

### Interactive Notifications

Notifications are interactive and support:

- Direct navigation to relevant screens when tapped
- Carrying contextual data about the event (stop name, time, etc.)
- Visual distinction through colors and icons

### Permission Handling

The system gracefully handles permission scenarios:

- Requests permissions when needed
- Provides clear explanations of why permissions are needed
- Offers a path to settings if permissions are denied

## Technical Implementation

### Android-Specific Features

- Custom notification channels with appropriate importance levels
- High-priority notifications that appear at the top of the notification panel
- Vibration patterns and sound settings

### iOS-Specific Features

- Notification categories for action buttons
- Proper foreground presentation options
- Badge count management

## Usage Examples

### Sending a Basic Notification

```javascript
import { sendLocalNotification } from "../../utils/notificationHelper";

// Simple notification
sendLocalNotification(
  "Bus Arrival", 
  "The bus has reached Main Street Station"
);
```

### Sending an Advanced Notification

```javascript
// Notification with deep linking and scheduling
sendLocalNotification(
  "Bus Arrival", 
  `The bus has reached ${stopName} at ${time}`,
  {
    data: {
      stopName: stopName,
      time: time,
      stopId: stopId,
      screen: 'map'  // Screen to navigate to when tapped
    },
    trigger: { 
      seconds: 1  // Small delay to ensure system tray visibility
    }
  }
);
```

## Troubleshooting

If notifications aren't appearing:

1. Check that permissions have been granted
2. Verify that the device is not in Do Not Disturb mode
3. For Android, ensure notification channels haven't been disabled
4. For iOS, check notification settings for the app

## Future Improvements

- Push notification support for remote alerts
- Customizable notification preferences
- Scheduled notifications for upcoming stops
- Geofence-based notifications