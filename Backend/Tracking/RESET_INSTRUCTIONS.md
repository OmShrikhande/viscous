# Bus Stop Reset Instructions

This document explains how to use the various reset functions in the Bus Tracking System.

## Automatic Midnight Reset

The system is designed to automatically reset all bus stops to "unreached" status at midnight (00:00) every day. This ensures that each day starts fresh with all stops marked as unreached.

### How it works:

1. At midnight (between 00:00 and 00:05), the system checks if a reset has occurred today
2. If no reset has occurred, it resets all stops (including the JIS/College stop)
3. The system also checks throughout the day if a reset was missed (e.g., if the server was down at midnight)

## Manual Reset Options

If you need to manually reset stops, you have several options:

### 1. Using the API Endpoints

The following API endpoints are available:

- **Reset ALL stops** (including JIS/College):
  ```
  POST /api/reset-all-stops
  ```

- **Reset all stops EXCEPT College**:
  ```
  POST /api/reset-stops-except-college
  ```

- **Force a midnight check** (will reset if it's a new day):
  ```
  POST /api/force-midnight-check
  ```

### 2. Using the Reset Script

For emergency situations or when the server is not running, you can use the standalone reset script:

```
node reset-all-stops.js
```

This script will connect directly to the database and reset all stops to "unreached" status.

## Checking Reset Status

You can check the status of the reset system and stops using these endpoints:

- **Check midnight reset status**:
  ```
  GET /api/midnight-reset-status
  ```

- **Check all stops status**:
  ```
  GET /api/stops/status
  ```

## Troubleshooting

If stops are not being reset properly:

1. Check if the server was running at midnight
2. Use the `/api/midnight-reset-status` endpoint to see when the last reset occurred
3. Use the `/api/stops/status` endpoint to see which stops are currently marked as reached
4. If needed, manually reset all stops using the `/api/reset-all-stops` endpoint
5. For persistent issues, restart the server or run the `reset-all-stops.js` script

## Important Notes

- The JIS/College stop has special handling in the system
- When a bus reaches the JIS/College stop, all other stops are automatically reset
- The midnight reset will reset ALL stops, including the JIS/College stop