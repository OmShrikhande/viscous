import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiMail, FiPhone, FiMapPin, FiCalendar, FiUserCheck, FiLock, FiUserX, FiEye, FiX, FiEdit, FiTrash
} from 'react-icons/fi';
import { MdBadge, MdFingerprint } from 'react-icons/md';
import { AiOutlineRollback, AiOutlineReload } from 'react-icons/ai';
import UserMap from '../components/userInfo/UserMap';
import AnimatedBackground from '../components/userInfo/AnimatedBackground';
import FuturisticBackground from '../components/backgrounds/FuturisticBackground';
import FuturisticText from '../components/ui/FuturisticText';
import ProfessionalDashboard from '../components/dashboard/ProfessionalDashboard';
import UserAttenednce from '../components/userInfo/UserAttenednce'; // <-- Make sure this import is present

const defaultAnimalAvatars = [
  'https://cdn-icons-png.flaticon.com/512/616/616408.png',
  'https://cdn-icons-png.flaticon.com/512/616/616430.png',
  'https://cdn-icons-png.flaticon.com/512/616/616418.png',
  'https://cdn-icons-png.flaticon.com/512/616/616426.png',
  'https://cdn-icons-png.flaticon.com/512/616/616410.png',
  'https://cdn-icons-png.flaticon.com/512/616/616421.png',
  'https://cdn-icons-png.flaticon.com/512/616/616423.png',
  'https://cdn-icons-png.flaticon.com/512/616/616425.png',
  'https://cdn-icons-png.flaticon.com/512/616/616429.png',
  'https://cdn-icons-png.flaticon.com/512/616/616419.png',
  'https://cdn-icons-png.flaticon.com/512/616/616427.png',
  'https://cdn-icons-png.flaticon.com/512/616/616420.png',
  'https://cdn-icons-png.flaticon.com/512/616/616417.png',
  'https://cdn-icons-png.flaticon.com/512/616/616424.png',
  'https://cdn-icons-png.flaticon.com/512/616/616416.png',
  'https://cdn-icons-png.flaticon.com/512/616/616422.png',
  'https://cdn-icons-png.flaticon.com/512/616/616428.png',
  'https://cdn-icons-png.flaticon.com/512/616/616411.png',
  'https://cdn-icons-png.flaticon.com/512/616/616412.png',
  'https://cdn-icons-png.flaticon.com/512/616/616413.png',
  'https://cdn-icons-png.flaticon.com/512/616/616414.png',
  'https://cdn-icons-png.flaticon.com/512/616/616415.png',
  'https://cdn-icons-png.flaticon.com/512/616/616409.png',
  'https://cdn-icons-png.flaticon.com/512/616/616431.png',
  'https://cdn-icons-png.flaticon.com/512/616/616432.png',
  'https://cdn-icons-png.flaticon.com/512/616/616433.png',
  'https://cdn-icons-png.flaticon.com/512/616/616434.png',
  'https://cdn-icons-png.flaticon.com/512/616/616435.png',
  'https://cdn-icons-png.flaticon.com/512/616/616436.png',
  'https://cdn-icons-png.flaticon.com/512/616/616437.png',
  'https://cdn-icons-png.flaticon.com/512/616/616438.png',
];

const UserInfo = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [location, setLocation] = useState(null);
  const [allLocations, setAllLocations] = useState([]);
  const [routePositions, setRoutePositions] = useState([]);
  const [visitLocations, setVisitLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newLatitude, setNewLatitude] = useState('');
  const [newLongitude, setNewLongitude] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [sendNotification, setSendNotification] = useState(true);
  const [locationMessage, setLocationMessage] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [attendance, setAttendance] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [filteredRoutePositions, setFilteredRoutePositions] = useState([]);
  const [isDateFiltered, setIsDateFiltered] = useState(false);

  // Function to fetch location data - moved outside useEffect to be accessible from handleAddLocation
  const fetchLocation = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/all-locations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Location API status:', res.status);
      const text = await res.text();
      console.log('Location API raw response:', text);
      const data = JSON.parse(text);
      console.log('Location API parsed data:', data);
      
      if (data.success && data.locations && data.locations.length > 0) {
        // Set the most recent location as the current location
        const mostRecentLocation = data.locations[0]; // Assuming the first one is the most recent
        setLocation({
          latitude: mostRecentLocation.location.latitude,
          longitude: mostRecentLocation.location.longitude,
          timestamp: mostRecentLocation.timestamp
        });
        
        // Store all locations
        setAllLocations(data.locations);
        
        // Extract coordinates for the route
        const coordinates = data.locations.map(loc => [
          parseFloat(loc.location.latitude),
          parseFloat(loc.location.longitude)
        ]).filter(coord => !isNaN(coord[0]) && !isNaN(coord[1]));
        
        console.log(`Extracted ${coordinates.length} route coordinates from ${data.locations.length} locations`);
        setRoutePositions(coordinates);
      } else {
        setLocation(null);
        setAllLocations([]);
        setRoutePositions([]);
      }
    } catch (err) {
      console.error('Failed to fetch user location:', err);
      setLocation(null);
      setAllLocations([]);
      setRoutePositions([]);
    }
  };

  // Function to filter locations by date
  const filterLocationsByDate = (date) => {
    if (!date || !allLocations.length) {
      setIsDateFiltered(false);
      setFilteredRoutePositions([]);
      return;
    }
    
    const selectedDateObj = new Date(date);
    selectedDateObj.setHours(0, 0, 0, 0); // Start of day
    
    const nextDay = new Date(selectedDateObj);
    nextDay.setDate(nextDay.getDate() + 1); // End of day (start of next day)
    
    // Filter locations that fall within the selected date
    const filtered = allLocations.filter(loc => {
      const locDate = new Date(loc.timestamp);
      return locDate >= selectedDateObj && locDate < nextDay;
    });
    
    if (filtered.length > 0) {
      // Extract coordinates for the filtered route
      const filteredCoordinates = filtered.map(loc => [
        parseFloat(loc.location.latitude),
        parseFloat(loc.location.longitude)
      ]).filter(coord => !isNaN(coord[0]) && !isNaN(coord[1]));
      
      setFilteredRoutePositions(filteredCoordinates);
      setIsDateFiltered(true);
    } else {
      setFilteredRoutePositions([]);
      setIsDateFiltered(true); // Still show it's active but with no results
    }
  };

  // Format date for input value (YYYY-MM-DD)
  const formatDateForInput = (date) => {
    const d = new Date(date);
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };
  
  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return formatDateForInput(today);
  };

  // Function to fetch visit locations
  const fetchVisitLocations = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/visit-locations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      console.log('Visit locations API response:', data);
      if (data.success) {
        setVisitLocations(data.locations || []);
      } else {
        console.error('Failed to fetch visit locations:', data.message);
        setVisitLocations([]);
      }
    } catch (err) {
      console.error('Error fetching visit locations:', err);
      setVisitLocations([]);
    }
  };

  // Function to fetch user attendance
  const fetchUserAttendance = async () => {
    setAttendanceLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/attendance?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.data) {
        setAttendance(data.data);
      } else {
        setAttendance([]);
      }
    } catch (err) {
      setAttendance([]);
    }
    setAttendanceLoading(false);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');

    const fetchUser = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/admin/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setUserInfo(data.user);
        } else {
          setError('User not found');
        }
      } catch (err) {
        console.error('Failed to fetch user info', err);
        setError('Failed to load user information. Please try again.');
      }
    };

    const fetchData = async () => {
      await Promise.all([
        fetchUser(),
        fetchLocation(),
        fetchVisitLocations(),
        fetchUserAttendance() // <-- Add this
      ]);
      setLoading(false);
    };

    fetchData();
  }, [userId]);

  const handleResetPassword = () => {
    setShowResetModal(true);
  };
  const handleResetSubmit = async () => {
    setResetError('');
    setResetSuccess('');
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/users/${userInfo._id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setResetSuccess('Password reset successfully!');
        setShowResetModal(false);
      } else {
        setResetError(data.message || 'Failed to reset password');
      }
    } catch (err) {
      setResetError('Server error');
    }
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    try {
      const latitude = parseFloat(newLatitude);
      const longitude = parseFloat(newLongitude);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        setLocationMessage('Please enter valid numbers for latitude and longitude');
        return;
      }
      
      if (!newAddress.trim()) {
        setLocationMessage('Please enter a valid address');
        return;
      }
      
      console.log('Sending location data to backend:', { 
        latitude, 
        longitude, 
        address: newAddress,
        sendNotification
      });
      
      const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/visit-locations`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          latitude, 
          longitude, 
          address: newAddress,
          sendNotification
        })
      });
      
      const text = await res.text();
      console.log('Location add API raw response:', text);
      const data = JSON.parse(text);
      console.log('Location add API parsed data:', data);
      
      if (data.success) {
        setLocationMessage('Location for user visit added successfully! ' + 
          (sendNotification ? 'Notification sent to user.' : ''));
        setNewLatitude('');
        setNewLongitude('');
        setNewAddress('');
        
        // Refresh the visit locations list and location data
        await Promise.all([
          fetchVisitLocations(),
          fetchLocation()
        ]);
      } else {
        setLocationMessage(`Failed to add location: ${data.message}`);
      }
    } catch (err) {
      console.error('Error adding location:', err);
      setLocationMessage('An error occurred while adding location');
    }
  };

  const getRandomAvatar = () => {
    const idx = Math.floor(Math.random() * defaultAnimalAvatars.length);
    return defaultAnimalAvatars[idx];
  };

  const maskPassword = (password = '') => {
    if (!password) return '******';
    if (password.length <= 9) return password.padEnd(18, '*');
    return password.slice(0, 9) + '******';
  };

  const handleViewTaskInfo = (task) => {
    console.log('Selected task:', task);
    console.log('Task images:', task.images);
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const closeTaskModal = () => {
    setSelectedTask(null);
    setShowTaskModal(false);
  };

  const handleEditTask = (task) => {
    setEditTask({ ...task }); // clone to avoid direct mutation
    setShowEditModal(true);
  };

  const handleDeleteTask = async (id) => {
    console.log('Deleting task with ID:', id);
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:5000/api/visit-location/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          await fetchVisitLocations(); // Refresh the table after deletion
        } else {
          alert('Failed to delete task');
        }
      } catch (err) {
        alert('Failed to delete task');
      }
    }
  };

  if (loading) {
    return (
      <FuturisticBackground variant="users">
        <ProfessionalDashboard>
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-pulse text-center">
              <div className="w-24 h-24 rounded-full bg-gray-300 dark:bg-gray-700 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-48 mx-auto mb-2"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-64 mx-auto mb-2"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-32 mx-auto"></div>
            </div>
          </div>
        </ProfessionalDashboard>
      </FuturisticBackground>
    );
  }

  if (error) {
    return (
      <FuturisticBackground variant="users">
        <ProfessionalDashboard>
          <div className="text-red-500 text-center min-h-screen flex items-center justify-center">
            <FuturisticText variant="error">{error}</FuturisticText>
          </div>
        </ProfessionalDashboard>
      </FuturisticBackground>
    );
  }

  const avatarUrl = getRandomAvatar();

  return (
    <FuturisticBackground variant="users">
      <ProfessionalDashboard>
        <div className="min-h-screen w-full flex flex-col items-center px-2 py-6 transition-all duration-700">
          <div className="w-full max-w-6xl flex flex-col md:flex-row gap-8 flex-wrap mx-auto">
            {/* Sidebar Profile Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 flex flex-col items-center md:w-1/3 border border-indigo-100 dark:border-gray-800 min-w-[280px] max-w-full">
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-32 h-32 rounded-full object-cover shadow-lg border-4 border-indigo-500 mb-4"
              />
              <FuturisticText size="2xl" variant="primary" className="font-bold text-center mb-1">
                {userInfo.name}
              </FuturisticText>
              <FuturisticText variant="accent" className="mb-4">{userInfo.email}</FuturisticText>
              <div className="w-full flex flex-col gap-3 mt-2">
                <InfoItem icon={<FiPhone />} label="Mobile" value={userInfo.mobile} />
                <InfoItem icon={<FiMapPin />} label="Address" value={userInfo.address} />
                <InfoItem icon={<FiCalendar />} label="Joining Date" value={new Date(userInfo.joiningDate).toLocaleDateString()} />
                <InfoItem icon={<MdBadge />} label="Department" value={userInfo.department} />
                <InfoItem icon={<MdFingerprint />} label="Aadhar" value={userInfo.adhar} />
                <InfoItem icon={<MdFingerprint />} label="PAN" value={userInfo.pan} />
                <InfoItem icon={<FiLock />} label="Password" value={maskPassword(userInfo.password)} />
                <InfoItem
                  icon={userInfo.is_active ? <FiUserCheck /> : <FiUserX />}
                  label="Status"
                  value={userInfo.is_active ? '🟢 Active' : '🔴 Inactive'}
                />
              </div>
              <div className="flex flex-col gap-3 mt-8 w-full">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg shadow transition-all flex items-center justify-center gap-2"
                >
                  <AiOutlineRollback /> Back to Dashboard
                </button>
                <button
                  onClick={handleResetPassword}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 rounded-lg shadow transition-all flex items-center justify-center gap-2"
                >
                  <AiOutlineReload /> Reset Password
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col gap-8 min-w-[300px] max-w-full">
              {/* User Location Card */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border border-indigo-100 dark:border-gray-800">
                <div className="flex justify-between items-center mb-4">
                  <FuturisticText size="xl" variant="primary" className="font-bold">User Location</FuturisticText>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowDateModal(true)}
                      className="bg-blue-100 hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-200 px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Track by Date
                    </button>
                    <button
                      onClick={async () => {
                        setLoading(true);
                        await fetchLocation();
                        setLoading(false);
                      }}
                      className="bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-800 dark:hover:bg-indigo-700 text-indigo-700 dark:text-indigo-200 px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                    >
                      <AiOutlineReload className="text-lg" /> Refresh
                    </button>
                  </div>
                </div>
                
                {/* Date Picker Modal */}
                {showDateModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
                          Track User Path by Date
                        </h3>
                        <button
                          onClick={() => setShowDateModal(false)}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Select a date to view the user's movement path for that specific day.
                      </p>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Select Date
                        </label>
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          max={getTodayDate()}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedDate('');
                            setIsDateFiltered(false);
                            setFilteredRoutePositions([]);
                            setShowDateModal(false);
                          }}
                          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (selectedDate) {
                              filterLocationsByDate(selectedDate);
                              setShowDateModal(false);
                            }
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg shadow transition-colors"
                        >
                          Track Path
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {/* Date filter indicator */}
                {isDateFiltered && (
                  <div className="mb-4 px-4 py-2 bg-blue-50 dark:bg-blue-900/40 rounded-lg border border-blue-100 dark:border-blue-800 flex justify-between items-center">
                    <div>
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        Showing route for: {selectedDate ? new Date(selectedDate).toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'}) : ''}
                      </span>
                      {filteredRoutePositions.length === 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          No location data available for this date.
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedDate('');
                        setIsDateFiltered(false);
                        setFilteredRoutePositions([]);
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}

                <div className="rounded-xl overflow-hidden border border-indigo-200 dark:border-indigo-700 shadow" style={{ height: 320, width: "100%" }}>
                  {location ? (
                    <UserMap
                      latitude={location.latitude}
                      longitude={location.longitude}
                      routePositions={isDateFiltered ? filteredRoutePositions : routePositions}
                      locationData={allLocations}
                      loading={loading}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                      No location data available
                    </div>
                  )}
                </div>
                
                {/* Debug information */}
                {allLocations.length > 0 && (
                  <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs">
                    <div className="font-semibold mb-1">Debug Info:</div>
                    <div>Total locations: {allLocations.length}</div>
                    <div>Route points: {isDateFiltered ? filteredRoutePositions.length : routePositions.length}</div>
                    {isDateFiltered ? (
                      <>
                        <div className="text-blue-600 dark:text-blue-400">Date filter active: {selectedDate}</div>
                        {filteredRoutePositions.length > 0 && (
                          <div className="mt-1">
                            <div>First point: [{filteredRoutePositions[0][0]}, {filteredRoutePositions[0][1]}]</div>
                            <div>Last point: [{filteredRoutePositions[filteredRoutePositions.length-1][0]}, {filteredRoutePositions[filteredRoutePositions.length-1][1]}]</div>
                          </div>
                        )}
                      </>
                    ) : (
                      routePositions.length > 0 && (
                        <div className="mt-1">
                          <div>First point: [{routePositions[0][0]}, {routePositions[0][1]}]</div>
                          <div>Last point: [{routePositions[routePositions.length-1][0]}, {routePositions[routePositions.length-1][1]}]</div>
                        </div>
                      )
                    )}
                  </div>
                )}
                {/* Add Location Form */}
                <div className="mt-6 p-5 bg-indigo-50 dark:bg-gray-800 rounded-xl border border-indigo-100 dark:border-gray-700">
                  <FuturisticText size="lg" variant="primary" className="font-semibold mb-3">Add Location for User to Visit</FuturisticText>
                  <form onSubmit={handleAddLocation} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                      <input
                        type="text"
                        value={newAddress}
                        onChange={(e) => setNewAddress(e.target.value)}
                        placeholder="e.g. 123 Main St, New York, NY 10001"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Latitude</label>
                        <input
                          type="text"
                          value={newLatitude}
                          onChange={(e) => setNewLatitude(e.target.value)}
                          placeholder="e.g. 40.7128"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Longitude</label>
                        <input
                          type="text"
                          value={newLongitude}
                          onChange={(e) => setNewLongitude(e.target.value)}
                          placeholder="e.g. -74.0060"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="sendNotification"
                        checked={sendNotification}
                        onChange={(e) => setSendNotification(e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="sendNotification" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        Send notification to user
                      </label>
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition-colors duration-300"
                    >
                      Add Location for User to Visit
                    </button>
                  </form>
                  {locationMessage && (
                    <div className={`mt-3 p-3 rounded-md ${locationMessage.includes('success') ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'}`}>
                      {locationMessage}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      const token = localStorage.getItem('token');
                      try {
                        const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/all-locations`, {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        const data = await res.json();
                        if (data.success && data.locations && data.locations.length > 0) {
                          const latestLocation = data.locations[0];
                          setLocation({
                            latitude: latestLocation.location.latitude,
                            longitude: latestLocation.location.longitude,
                            timestamp: latestLocation.timestamp
                          });
                          setLocationMessage('Location loaded from database');
                        } else {
                          setLocationMessage('No locations found in database');
                        }
                      } catch (err) {
                        setLocationMessage('Error fetching locations');
                      }
                    }}
                    className="mt-3 w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-md transition-colors duration-300"
                  >
                    Debug: Load Latest Location
                  </button>
                </div>
              </div>

              {/* Locations to Visit */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border border-indigo-100 dark:border-gray-800">
                <FuturisticText size="xl" variant="primary" className="font-bold mb-4">Locations to Visit</FuturisticText>
                {visitLocations.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Address</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date Added</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Completion Time</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {visitLocations.map((loc) => (
                          <tr key={loc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{loc.address}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${loc.visitStatus === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 
                                  loc.visitStatus === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' : 
                                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'}`}>
                                {loc.visitStatus.charAt(0).toUpperCase() + loc.visitStatus.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                              {new Date(loc.createdAt).toLocaleDateString()} {new Date(loc.createdAt).toLocaleTimeString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                              {loc.completionTime ? 
                                `${new Date(loc.completionTime).toLocaleDateString()} ${new Date(loc.completionTime).toLocaleTimeString()}` : 
                                loc.visitStatus === 'completed' && loc.visitDate ? 
                                `${new Date(loc.visitDate).toLocaleDateString()} ${new Date(loc.visitDate).toLocaleTimeString()}` :
                                loc.visitStatus === 'completed' ? 'Completed' : 'Not completed'
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleViewTaskInfo(loc)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors duration-200"
                                  title="View complete task information"
                                >
                                  <FiEye className="text-sm" />
                                  View Info
                                </button>
                                {loc.images && loc.images.length > 0 && (
                                  <div className="flex items-center gap-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 px-2 py-1 rounded-full text-xs">
                                    {/* ...image icon... */}
                                    {loc.images.length}
                                  </div>
                                )}
                                {/* Only show Edit if status is pending */}
                                {loc.visitStatus === 'pending' && (
                                  <button
                                    onClick={() => handleEditTask(loc)}
                                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors duration-200"
                                  >
                                    <FiEdit className="text-sm" />
                                    Edit
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteTask(loc.id)}
                                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors duration-200"
                                >
                                  <FiTrash className="text-sm" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    No locations to visit have been assigned yet.
                  </div>
                )}
              </div>

              {/* Attendance Card */}
<div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border border-indigo-100 dark:border-gray-800">
  <FuturisticText size="xl" variant="primary" className="font-bold mb-4">Attendance</FuturisticText>
  <UserAttenednce attendance={attendance} loading={attendanceLoading} />
</div>
            </div>
          </div>
        </div>
      </ProfessionalDashboard>
      {showResetModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Reset Password for {userInfo.name}
            </h3>
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white mb-3"
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white mb-4"
            />
            {resetError && <div className="text-red-500 text-sm mb-4">{resetError}</div>}
            {resetSuccess && <div className="text-green-500 text-sm mb-4">{resetSuccess}</div>}
            <div className="flex justify-end gap-2">
              <button
                onClick={handleResetSubmit}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition-colors duration-300"
              >
                Submit
              </button>
              <button
                onClick={() => setShowResetModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-md transition-colors duration-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {showTaskModal && selectedTask && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <FuturisticText size="xl" variant="primary" className="font-bold">
                Task Details
              </FuturisticText>
              <button
                onClick={closeTaskModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <FiX className="text-2xl" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                      Task ID
                    </label>
                    <p className="text-sm text-gray-800 dark:text-gray-200 font-mono">
                      {selectedTask.id}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                      Status
                    </label>
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${selectedTask.visitStatus === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 
                        selectedTask.visitStatus === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' : 
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'}`}>
                      {selectedTask.visitStatus.charAt(0).toUpperCase() + selectedTask.visitStatus.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Location Information */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                  Location Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                      Address
                    </label>
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {selectedTask.address}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                        Latitude
                      </label>
                      <p className="text-sm text-gray-800 dark:text-gray-200 font-mono">
                        {selectedTask.latitude}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                        Longitude
                      </label>
                      <p className="text-sm text-gray-800 dark:text-gray-200 font-mono">
                        {selectedTask.longitude}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Date Information */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                  Date Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                      Date Assigned
                    </label>
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {new Date(selectedTask.createdAt).toLocaleDateString()} {new Date(selectedTask.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                      Visit Date
                    </label>
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {selectedTask.visitDate ? 
                        `${new Date(selectedTask.visitDate).toLocaleDateString()} ${new Date(selectedTask.visitDate).toLocaleTimeString()}` : 
                        'Not visited yet'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                      Completion Time
                    </label>
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {selectedTask.completionTime ? 
                        `${new Date(selectedTask.completionTime).toLocaleDateString()} ${new Date(selectedTask.completionTime).toLocaleTimeString()}` : 
                        selectedTask.visitStatus === 'completed' && selectedTask.visitDate ? 
                        `${new Date(selectedTask.visitDate).toLocaleDateString()} ${new Date(selectedTask.visitDate).toLocaleTimeString()}` :
                        'Not completed yet'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                      Last Updated
                    </label>
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {new Date(selectedTask.updatedAt).toLocaleDateString()} {new Date(selectedTask.updatedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notification Information */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                  Notification Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                      Notification Sent
                    </label>
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${selectedTask.notificationSent ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 
                        'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'}`}>
                        {selectedTask.notificationSent ? 'Yes' : 'No'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                      Notification Time
                    </label>
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {selectedTask.notificationTime ? 
                        `${new Date(selectedTask.notificationTime).toLocaleDateString()} ${new Date(selectedTask.notificationTime).toLocaleTimeString()}` : 
                        'No notification sent'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Visit Images */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                  Visit Images 
                  {selectedTask.images && selectedTask.images.length > 0 && (
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                      ({selectedTask.images.length} image{selectedTask.images.length !== 1 ? 's' : ''})
                    </span>
                  )}
                </h3>
                {selectedTask.images && selectedTask.images.length > 0 ? (
                  <div className="space-y-6">
                    {/* Image Gallery */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selectedTask.images.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={`http://localhost:5000/api/visit-location/${selectedTask.id}/image/${index}`}
                            alt={`${image.type} image`}
                            className="w-full h-48 object-cover rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(`http://localhost:5000/api/visit-location/${selectedTask.id}/image/${index}`, '_blank')}
                            onError={(e) => {
                              console.log('Image failed to load:', `http://localhost:5000/api/visit-location/${selectedTask.id}/image/${index}`);
                              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4=';
                            }}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                            <FiEye className="text-white opacity-0 group-hover:opacity-100 text-2xl transition-opacity" />
                          </div>
                          <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                            {image.type === 'start' ? '🚀 Start' : '✅ Complete'}
                          </div>
                          <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                            {new Date(image.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Detailed Image Information */}
                    <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-3">Image Details</h4>
                      <div className="space-y-3">
                        {selectedTask.images.map((image, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-600 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${image.type === 'start' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                              <div>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                  {image.type === 'start' ? 'Start Image' : 'Completion Image'}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {new Date(image.timestamp).toLocaleDateString()} {new Date(image.timestamp).toLocaleTimeString()}
                                </p>
                                {image.location && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    📍 {image.location.latitude.toFixed(6)}, {image.location.longitude.toFixed(6)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => window.open(`http://localhost:5000${image.url}`, '_blank')}
                              className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm"
                            >
                              View
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="text-4xl mb-2">📷</div>
                    <p>No images uploaded for this visit</p>
                  </div>
                )}
              </div>

              {/* Notes and Feedback */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Notes & Feedback</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">Admin Notes</label>
                    <p className="text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 p-3 rounded border min-h-[60px]">
                      {selectedTask.adminNotes || 'No admin notes available'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">User Feedback</label>
                    <p className="text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 p-3 rounded border min-h-[60px]">
                      {selectedTask.userFeedback || 'No user feedback available'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={closeTaskModal}
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editTask && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Edit Task</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const token = localStorage.getItem('token');
                try {
                  const res = await fetch(`http://localhost:5000/api/visit-location/${editTask._id}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(editTask),
                  });
                  if (res.ok) {
                    setShowEditModal(false);
                    setEditTask(null);
                    await fetchVisitLocations();
                  } else {
                    alert('Failed to update task');
                  }
                } catch {
                  alert('Failed to update task');
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <input
                  type="text"
                  name="address"
                  value={editTask.address}
                  onChange={e => setEditTask({ ...editTask, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Latitude</label>
                  <input
                    type="text"
                    name="latitude"
                    value={editTask.latitude}
                    onChange={e => setEditTask({ ...editTask, latitude: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Longitude</label>
                  <input
                    type="text"
                    name="longitude"
                    value={editTask.longitude}
                    onChange={e => setEditTask({ ...editTask, longitude: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </FuturisticBackground>
  );
};

const InfoItem = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-300">
    <div className="text-xl">{icon}</div>
    <div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-base font-semibold text-gray-800 dark:text-gray-100 break-words">
        {value || 'N/A'}
      </p>
    </div>
  </div>
);

export default UserInfo;