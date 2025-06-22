# 🚌 Viscous - Real-Time Bus Tracking App 🚌

<div align="center">
  <img src="https://raw.githubusercontent.com/expo/expo/main/apps/native-component-list/assets/images/expo-icon.png" alt="Viscous Logo" width="200"/>
  <br>
  <p><i>Track your bus in real-time with style and precision</i></p>
</div>

## 📱 Overview

Viscous is a modern, feature-rich bus tracking application built with React Native and Expo. It provides real-time bus location tracking, notifications for bus arrivals, interactive maps, and a beautiful user interface with smooth animations.

### ✨ Key Features

- 🗺️ **Real-time Bus Tracking** - Track buses on an interactive map
- 🔔 **Smart Notifications** - Get alerts when buses reach stops
- 📊 **Bus Capacity Indicators** - See how crowded buses are before boarding
- 📍 **Location-based Alerts** - Receive notifications based on your location
- 📱 **Beautiful UI/UX** - Modern interface with smooth animations
- 🌓 **Dark/Light Mode** - Fully customizable theme support
- 📈 **Speed Monitoring** - Track and analyze bus speeds
- 📅 **Bus Schedules** - View comprehensive bus timetables
- 🔋 **Background Tracking** - Continues tracking even when app is closed

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or newer)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Android Studio](https://developer.android.com/studio) (for Android development)
- [Xcode](https://developer.apple.com/xcode/) (for iOS development, macOS only)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/OmShrikhande/viscous.git
   cd viscous
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables (if needed)**

   Create a `.env` file in the root directory and add your API keys:

   ```
   FIREBASE_API_KEY=your_firebase_api_key
   FIREBASE_APP_ID=your_firebase_app_id
   ```

4. **Start the development server**

   ```bash
   npx expo start
   ```

5. **Run on a device or emulator**

   - Press `a` to run on Android emulator
   - Press `i` to run on iOS simulator
   - Scan the QR code with the Expo Go app on your physical device

## 📱 App Structure

The app is organized using Expo Router with a tab-based navigation system:

- **Home Tab** - Main dashboard with bus stop timeline and status
- **Map Tab** - Interactive map showing bus locations and stops
- **Stats Tab** - Analytics and statistics about bus routes
- **Profile Tab** - User settings and preferences

## 🎨 UI Features & Animations

Viscous includes numerous UI enhancements for a premium user experience:

- **Animated Transitions** - Smooth animations between screens and components
- **Interactive Elements** - Haptic feedback and animations on user interaction
- **Parallax Effects** - Depth and dimension with parallax scrolling
- **Gradient Backgrounds** - Beautiful color gradients throughout the app
- **Card-Based Layout** - Clean, modern card design for content organization
- **Custom Animations** - Pulse animations for notifications and status changes

<div align="center">
  <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcDd6Y2RqZWJ1cWFtMWF4ZnBnNXJ5NmQyeGRpOWF0NWF0aHd0aXFsbyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7WTL4qQCbbLLV2Pm/giphy.gif" alt="UI Animation Demo" width="250"/>
  <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcDd6Y2RqZWJ1cWFtMWF4ZnBnNXJ5NmQyeGRpOWF0NWF0aHd0aXFsbyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7WTL4qQCbbLLV2Pm/giphy.gif" alt="Map Animation Demo" width="250"/>
</div>

## 🔔 Notification System

Viscous features a comprehensive notification system that works in all app states:

- **Foreground Notifications** - In-app alerts with interactive elements
- **Background Notifications** - System notifications when app is minimized
- **Closed App Notifications** - Alerts even when the app is completely closed
- **Geofence Notifications** - Location-based alerts when approaching stops
- **Interactive Notifications** - Tap to navigate directly to relevant screens

```javascript
// Example of sending a notification
import { sendLocalNotification } from "../../utils/notificationHelper";

sendLocalNotification(
  "Bus Arrival", 
  `The bus has reached ${stopName} at ${time}`,
  {
    data: {
      stopName: stopName,
      time: time,
      stopId: stopId,
      screen: 'map'  // Screen to navigate to when tapped
    }
  }
);
```

## 🗺️ Map Features

The app includes a powerful mapping system with:

- **Real-time Bus Tracking** - See buses move in real-time
- **Interactive Stop Markers** - Tap on stops for more information
- **Route Visualization** - See complete bus routes on the map
- **Custom Map Styles** - Different map styles for day and night modes
- **Zoom Controls** - Easy navigation with custom zoom controls
- **Bus Information Cards** - Detailed information about selected buses

## 🔧 Advanced Features

### Background Location Tracking

The app uses Expo's background location and task manager to track buses even when the app is not in focus:

```javascript
// Register background task
TaskManager.defineTask(LOCATION_TRACKING, async ({ data, error }) => {
  if (error) {
    console.error(error);
    return;
  }
  if (data) {
    const { locations } = data;
    // Process location updates
  }
});
```

### Firebase Integration

Viscous uses Firebase for real-time data synchronization:

- **Firestore** - Store and sync bus locations and user preferences
- **Authentication** - Secure user authentication and profiles
- **Cloud Functions** - Server-side processing for complex operations

## 🧩 Component Structure

The app is built with a modular component architecture:

```
components/
├── home/                 # Home screen components
│   ├── AlertsScreen.jsx  # Alerts modal
│   ├── BusStopTimeline.jsx # Timeline of bus stops
│   └── Header.jsx        # App header with actions
├── map/                  # Map screen components
│   ├── BusMarker.jsx     # Bus markers on map
│   └── StopMarkers.jsx   # Bus stop markers
├── Profile/              # Profile screen components
├── tracking/             # Location tracking components
└── ui/                   # Reusable UI components
```

## 🛠️ Development Commands

```bash
# Start the development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web
npm run web

# Reset project to a clean state
npm run reset-project

# Lint code
npm run lint
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Contact

For questions or feedback, please reach out to:

- **Email**: omshrikhande73@gmail.com
- **LinkedIn**: [@OmShrikhande](https://www.linkedin.com/in/om-shrikhande-37108926a/)

---

<div align="center">
  <p>Built with ❤️ using <a href="https://expo.dev">Expo</a> and <a href="https://reactnative.dev">React Native</a></p>
  
  <p>
    <a href="https://github.com/OmShrikhande/viscous/stargazers">
      <img src="https://img.shields.io/github/stars/OmShrikhande/viscous?style=social" alt="Stars" />
    </a>
    <a href="https://github.com/OmShrikhande/viscous/network/members">
      <img src="https://img.shields.io/github/forks/OmShrikhande/viscous?style=social" alt="Forks" />
    </a>
  </p>
</div>
