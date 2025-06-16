# Notifications in Bus Tracker App

## Important Notice About Notifications

Starting with Expo SDK 53, remote push notifications are no longer supported in Expo Go. This means that while local notifications will still work in Expo Go, remote push notifications require a development build.

## Current Implementation

The app currently uses `expo-notifications` for:

1. Local notifications when a bus reaches a stop
2. Alerts to users about bus arrivals

## How to Test Notifications

### In Expo Go (SDK 53+)

- Local notifications will work (notifications triggered from within the app)
- You will see a warning about remote notifications not being supported
- This is expected behavior and doesn't affect the app's core functionality

### For Full Notification Support (Including Remote)

To enable full notification support, including remote push notifications:

1. Create a development build:
   ```
   eas build --profile development --platform android
   ```
   or
   ```
   eas build --profile development --platform ios
   ```

2. Install the development build on your device

3. Update your Expo project ID in `utils/notificationHelper.js`:
   ```javascript
   const { data: pushToken } = await Notifications.getExpoPushTokenAsync({
     projectId: "your-expo-project-id", // Replace with your actual Expo project ID
   });
   ```

## Notification Architecture

The app uses a centralized notification system:

- `utils/notificationHelper.js` - Contains all notification-related functionality
- Local notifications are triggered when the bus reaches a stop
- The UI is updated in real-time to reflect bus location

## Troubleshooting

If you encounter notification issues:

1. Ensure you have granted notification permissions to the app
2. For remote notifications, make sure you're using a development build, not Expo Go
3. Check that your Expo project ID is correctly configured
4. Verify that your device is not in Do Not Disturb mode

For more information, see the [Expo Notifications documentation](https://docs.expo.dev/versions/latest/sdk/notifications/).