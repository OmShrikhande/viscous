# Header Features Implementation

This document explains the implementation of the Alerts, Locations, and Schedule features in the Header component.

## Overview

The Header component now includes three interactive buttons that open modal screens for:
1. **Alerts** - Shows notifications from the Firestore database
2. **Locations** - Displays bus stop locations with route information
3. **Schedule** - Shows the bus schedule for the user's route

## Components Created

### 1. AlertsScreen.jsx
- Fetches alerts from the `alerts` collection in Firestore
- Displays alerts in a card format with timestamps
- Allows users to tap on an alert to see full details
- Supports both light and dark themes

### 2. LocationsScreen.jsx
- Fetches location data from the `locations` collection in Firestore
- Highlights locations that are on the user's route
- Shows route numbers for each location
- Supports both light and dark themes

### 3. ScheduleScreen.jsx
- Fetches schedule data for the user's route from the `routes` collection
- Displays stops in a timeline format
- Highlights the user's stop
- Shows arrival times for each stop
- Supports both light and dark themes

## Theme Toggle Improvements

The ThemeToggleSwitch component has been updated to:
- Apply theme changes immediately to the UI
- Update AsyncStorage first for immediate local persistence
- Update Firestore in the background
- Handle errors gracefully with UI feedback

## Firestore Data Structure

### Alerts Collection
```
alerts/
  {alert_id}/
    title: string
    message: string
    time: timestamp
    additionalInfo: string (optional)
```

### Locations Collection
```
locations/
  {location_id}/
    name: string
    address: string
    routeNumbers: array of strings
    description: string (optional)
```

### Routes Collection
```
routes/
  {route_id}/
    routeNumber: string
    stops: array of objects
      [
        {
          name: string
          arrivalTime: timestamp or string
          order: number
          landmark: string (optional)
        }
      ]
```

## Usage

1. The Header component displays three action buttons
2. Tapping on any button opens the corresponding modal screen
3. Each screen fetches data from Firestore based on the user's information
4. The theme toggle in the profile screen immediately updates the UI appearance

## Theme Support

All components support both light and dark themes with:
- Different background colors
- Appropriate text colors
- Themed icons
- Consistent styling across the app