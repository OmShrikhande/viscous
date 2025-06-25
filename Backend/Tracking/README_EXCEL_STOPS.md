# Excel Stops Integration

This feature allows the Tracking Server to read bus stop data from an Excel file and update the Firestore database when the bus reaches a stop.

## How It Works

1. The system reads stop data from the Excel file (`Route2.xlsx`) located in the project root directory.
2. When the bus location is checked, the system compares it with both the Firestore stops and the Excel stops.
3. If the bus is within the specified radius of a stop, the system marks it as reached in the Firestore database.

## Excel File Format

The Excel file should have the following columns:
- `serialNumber`: A unique identifier for the stop
- `stopname`: The name of the stop
- `time`: The estimated time (in decimal hours) for the bus to reach the stop
- `Latitude`: The latitude coordinate of the stop
- `Longitude`: The longitude coordinate of the stop
- `reached`: A boolean indicating whether the stop has been reached (optional)

## Generated Files

The system generates several files for debugging and reference:

1. `data/stops.txt`: A CSV file with the stop data
2. `data/stops.json`: A JSON file with the stop data
3. `data/stops_formatted.txt`: A human-readable formatted file with the stop data
4. `logs/stops_data.txt`: A log file with the loaded stop data
5. `logs/stop_updates.txt`: A log file with updates when stops are reached

## API Endpoints

The following API endpoints are available for the Excel stops feature:

- `GET /api/excel-stops`: Get all stops from the Excel file
  - Add `?reload=true` to force a reload of the Excel file (e.g., `/api/excel-stops?reload=true`)
- `POST /api/process-excel-stops`: Manually trigger the Excel stops processing
- `GET /api/stops`: Get all stops (uses cached data)
  - Add `?refresh=true` to force a refresh from Firestore (e.g., `/api/stops?refresh=true`)
- `GET /api/stops/status`: Get a summary of all stops and their reached status
  - Add `?refresh=true` to force a refresh of the Firestore data (e.g., `/api/stops/status?refresh=true`)
- `POST /api/clear-cache`: Clear the stops cache to force a fresh load from Firestore on next request

## Scripts

- `scripts/generateStopsFile.js`: A script to generate the stops files from the Excel file

## Configuration

The stop radius can be configured in the `.env` file:

```
STOP_RADIUS=50
```

## Troubleshooting

If the Excel stops are not being detected:

1. Check that the Excel file exists in the project root directory
2. Check that the Excel file has the correct format
3. Check the logs for any errors
4. Try manually triggering the Excel stops processing with the API endpoint

## Updating the Excel File

If you update the Excel file, you need to:

1. Restart the server, or
2. Run the `generateStopsFile.js` script, or
3. Call the `GET /api/excel-stops?reload=true` endpoint to force a reload of the data

The system is designed to be extremely efficient:
- It only loads the Firestore stops data ONCE when the server starts
- It only loads the Excel file ONCE when the server starts
- It NEVER accesses Firestore during regular checks
- It ONLY accesses Firestore when a bus is actually near a stop and needs to update it
- It keeps all stop data in memory and updates the cache when stops are marked as reached
- It provides API endpoints to force a refresh when needed