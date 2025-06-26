import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Register from './pages/Register';
import AddUser from './pages/AddUser';
import UserInfo from './pages/UserInfo';
import BusUserInfo from './pages/BusUserInfo';
import Users from './pages/Users';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Attendance from './pages/Attendance';
import AdminProfile from './pages/AdminProfile';
import Alert from './pages/Alert';
import BusTracking from './pages/BusTracking';

function App() {
  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/Login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/register" element={<Register />} />
        <Route path="/adduser" element={<AddUser />} />
        <Route path="/userinfo/:userId" element={<UserInfo />} />
        <Route path="/bususerinfo/:userId" element={<BusUserInfo />} />
        <Route path="/users" element={<Users />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/admin-profile" element={<AdminProfile />} />
        <Route path="/alert" element={<Alert />} />
        <Route path="/notifications" element={<Dashboard />} />
        <Route path="/security" element={<Settings />} />
        <Route path="/system" element={<Analytics />} />
        <Route path="/bus-tracking" element={<BusTracking />} />
      </Routes>
    </Router>
  );
}

export default App;
