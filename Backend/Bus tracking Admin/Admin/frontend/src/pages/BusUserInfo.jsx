import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiMail, FiPhone, FiMapPin, FiCalendar, FiUserCheck, FiArrowLeft, FiClock } from 'react-icons/fi';
import { MdBadge, MdDirectionsBus, MdLocationOn, MdTimeline, MdInfoOutline } from 'react-icons/md';
import FuturisticBackground from '../components/backgrounds/FuturisticBackground';
import FuturisticText from '../components/ui/FuturisticText';
import ProfessionalDashboard from '../components/dashboard/ProfessionalDashboard';
import BusTrackingMap from '../components/userInfo/BusTrackingMap';

const BusUserInfo = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [stats, setStats] = useState({
    totalDistance: 0,
    totalTrips: 0,
    avgSpeed: 0,
    lastActive: null
  });

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

    const fetchUserStats = async () => {
      try {
        // Set stats to null to indicate no data is available
        setStats(null);
        
        // In the future, this would be replaced with an actual API call
        // For now, we'll just show "No data available" in the UI
      } catch (err) {
        console.error('Failed to fetch user stats', err);
      }
    };

    const fetchData = async () => {
      await Promise.all([
        fetchUser(),
        fetchUserStats()
      ]);
      setLoading(false);
    };

    fetchData();
  }, [userId]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <FuturisticBackground variant="users">
        <ProfessionalDashboard>
          <div className="flex items-center justify-center h-64">
            <div className="relative">
              <div className="animate-spin rounded-full h-32 w-32 border-4 border-blue-500/30 border-t-blue-500"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <FuturisticText variant="primary" className="animate-pulse">Loading...</FuturisticText>
              </div>
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
          <div className="flex flex-col items-center justify-center h-64">
            <FuturisticText variant="error" size="xl" className="mb-4">{error}</FuturisticText>
            <button
              onClick={() => navigate('/users')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 
                       text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 
                       transform hover:scale-105 shadow-lg hover:shadow-xl border border-white/20"
            >
              Back to Users
            </button>
          </div>
        </ProfessionalDashboard>
      </FuturisticBackground>
    );
  }

  return (
    <FuturisticBackground variant="users">
      <ProfessionalDashboard>
        <div className="p-6 space-y-6">
          {/* Header with back button */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate('/users')}
              className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-all duration-300"
            >
              <FiArrowLeft />
              <span>Back to Users</span>
            </button>
            <FuturisticText size="2xl" variant="primary" className="font-bold">
              Bus Driver Details
            </FuturisticText>
          </div>

          {/* User Profile Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl overflow-hidden">
            <div className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                {/* Avatar */}
                <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 
                rounded-full flex items-center justify-center text-white text-4xl font-bold
                shadow-lg border border-white/30">
                  {userInfo?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                
                {/* User Info */}
                <div className="flex-1">
                  <FuturisticText size="3xl" variant="primary" className="font-bold mb-2">
                    {userInfo?.name || 'Unknown User'}
                  </FuturisticText>
                  <div className="flex flex-wrap gap-4 text-white/80">
                    <div className="flex items-center space-x-2">
                      <MdBadge className="text-blue-400" />
                      <span>{userInfo?.department || 'No Department'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FiMail className="text-blue-400" />
                      <span>{userInfo?.email || 'No Email'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FiPhone className="text-blue-400" />
                      <span>{userInfo?.mobile || 'No Phone'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FiCalendar className="text-blue-400" />
                      <span>Joined: {userInfo?.joiningDate ? new Date(userInfo.joiningDate).toLocaleDateString() : 'Unknown'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FiUserCheck className="text-blue-400" />
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-sm ${
                        userInfo?.is_active 
                          ? 'bg-green-500/30 text-green-100 border-green-400/50' 
                          : 'bg-red-500/30 text-red-100 border-red-400/50'
                      }`}>
                        {userInfo?.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Stats */}
                {stats ? (
                  <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                      <div className="flex items-center space-x-2 text-blue-400 mb-1">
                        <MdDirectionsBus />
                        <span className="text-sm font-medium">Total Trips</span>
                      </div>
                      <FuturisticText size="2xl" variant="primary" className="font-bold">
                        {stats.totalTrips || 'N/A'}
                      </FuturisticText>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                      <div className="flex items-center space-x-2 text-purple-400 mb-1">
                        <MdTimeline />
                        <span className="text-sm font-medium">Distance</span>
                      </div>
                      <FuturisticText size="2xl" variant="primary" className="font-bold">
                        {stats.totalDistance ? `${stats.totalDistance} km` : 'N/A'}
                      </FuturisticText>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                      <div className="flex items-center space-x-2 text-green-400 mb-1">
                        <FiClock />
                        <span className="text-sm font-medium">Avg Speed</span>
                      </div>
                      <FuturisticText size="2xl" variant="primary" className="font-bold">
                        {stats.avgSpeed ? `${stats.avgSpeed} km/h` : 'N/A'}
                      </FuturisticText>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                      <div className="flex items-center space-x-2 text-red-400 mb-1">
                        <MdLocationOn />
                        <span className="text-sm font-medium">Last Active</span>
                      </div>
                      <div className="text-white text-sm">
                        {stats.lastActive ? formatDate(stats.lastActive) : 'N/A'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 w-full">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="text-yellow-400 text-4xl mb-3">
                        <MdInfoOutline />
                      </div>
                      <FuturisticText size="xl" variant="warning" className="font-medium mb-2">
                        No Statistics Available
                      </FuturisticText>
                      <p className="text-white/70 text-sm">
                        There is no tracking data available for this bus driver.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Tabs */}
            <div className="border-t border-white/20">
              <div className="flex overflow-x-auto">
                <button
                  className={`px-6 py-4 font-medium transition-all duration-300 ${
                    activeTab === 'info' 
                      ? 'text-white border-b-2 border-blue-500' 
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={() => setActiveTab('info')}
                >
                  Driver Information
                </button>
                <button
                  className={`px-6 py-4 font-medium transition-all duration-300 ${
                    activeTab === 'tracking' 
                      ? 'text-white border-b-2 border-blue-500' 
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={() => setActiveTab('tracking')}
                >
                  Bus Tracking
                </button>
                <button
                  className={`px-6 py-4 font-medium transition-all duration-300 ${
                    activeTab === 'history' 
                      ? 'text-white border-b-2 border-blue-500' 
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                  onClick={() => setActiveTab('history')}
                >
                  Trip History
                </button>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl p-6">
            {activeTab === 'info' && (
              <div className="space-y-6">
                <FuturisticText size="xl" variant="primary" className="font-bold mb-4">
                  Driver Information
                </FuturisticText>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                    <FuturisticText size="lg" variant="primary" className="font-bold mb-4">
                      Personal Information
                    </FuturisticText>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-white/70">Full Name</span>
                        <span className="text-white font-medium">{userInfo?.name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Email</span>
                        <span className="text-white font-medium">{userInfo?.email || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Phone</span>
                        <span className="text-white font-medium">{userInfo?.mobile || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Address</span>
                        <span className="text-white font-medium">{userInfo?.address || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Date of Birth</span>
                        <span className="text-white font-medium">{userInfo?.dob ? new Date(userInfo.dob).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Employment Information */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                    <FuturisticText size="lg" variant="primary" className="font-bold mb-4">
                      Employment Information
                    </FuturisticText>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-white/70">Department</span>
                        <span className="text-white font-medium">{userInfo?.department || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Employee ID</span>
                        <span className="text-white font-medium">{userInfo?.employeeId || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Joining Date</span>
                        <span className="text-white font-medium">{userInfo?.joiningDate ? new Date(userInfo.joiningDate).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Status</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-sm ${
                          userInfo?.is_active 
                            ? 'bg-green-500/30 text-green-100 border-green-400/50' 
                            : 'bg-red-500/30 text-red-100 border-red-400/50'
                        }`}>
                          {userInfo?.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Route Assigned</span>
                        <span className="text-white font-medium">{userInfo?.route || 'Route 1'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* License Information */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                    <FuturisticText size="lg" variant="primary" className="font-bold mb-4">
                      License Information
                    </FuturisticText>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-white/70">License Number</span>
                        <span className="text-white font-medium">DL-98765432</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">License Type</span>
                        <span className="text-white font-medium">Commercial</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Issue Date</span>
                        <span className="text-white font-medium">Jan 15, 2020</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Expiry Date</span>
                        <span className="text-white font-medium">Jan 14, 2025</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Endorsements</span>
                        <span className="text-white font-medium">Passenger, Air Brakes</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Emergency Contact */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                    <FuturisticText size="lg" variant="primary" className="font-bold mb-4">
                      Emergency Contact
                    </FuturisticText>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-white/70">Contact Name</span>
                        <span className="text-white font-medium">John Doe</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Relationship</span>
                        <span className="text-white font-medium">Spouse</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Phone</span>
                        <span className="text-white font-medium">+1 (555) 123-4567</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Alternative Phone</span>
                        <span className="text-white font-medium">+1 (555) 987-6543</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Email</span>
                        <span className="text-white font-medium">john.doe@example.com</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'tracking' && (
              <div className="space-y-6">
                <FuturisticText size="xl" variant="primary" className="font-bold mb-4">
                  Live Bus Tracking
                </FuturisticText>
                
                <BusTrackingMap 
                  userId={userId} 
                  routeName={userInfo?.route || 'Route 1'} 
                />
              </div>
            )}
            
            {activeTab === 'history' && (
              <div className="space-y-6">
                <FuturisticText size="xl" variant="primary" className="font-bold mb-4">
                  Trip History
                </FuturisticText>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white/20 backdrop-blur-sm">
                        <tr>
                          <th className="px-6 py-4 text-left">
                            <FuturisticText variant="primary" className="font-semibold">Date</FuturisticText>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <FuturisticText variant="primary" className="font-semibold">Route</FuturisticText>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <FuturisticText variant="primary" className="font-semibold">Start Time</FuturisticText>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <FuturisticText variant="primary" className="font-semibold">End Time</FuturisticText>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <FuturisticText variant="primary" className="font-semibold">Distance</FuturisticText>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <FuturisticText variant="primary" className="font-semibold">Status</FuturisticText>
                          </th>
                          <th className="px-6 py-4 text-left">
                            <FuturisticText variant="primary" className="font-semibold">Actions</FuturisticText>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Sample trip history data */}
                        {[...Array(5)].map((_, index) => {
                          const date = new Date();
                          date.setDate(date.getDate() - index);
                          
                          return (
                            <tr 
                              key={index} 
                              className="border-b border-white/20 hover:bg-white/20 transition-all duration-300"
                            >
                              <td className="px-6 py-4">
                                <FuturisticText variant="primary">
                                  {date.toLocaleDateString()}
                                </FuturisticText>
                              </td>
                              <td className="px-6 py-4">
                                <FuturisticText variant="secondary">Route 1</FuturisticText>
                              </td>
                              <td className="px-6 py-4">
                                <FuturisticText variant="secondary">08:00 AM</FuturisticText>
                              </td>
                              <td className="px-6 py-4">
                                <FuturisticText variant="secondary">05:30 PM</FuturisticText>
                              </td>
                              <td className="px-6 py-4">
                                <FuturisticText variant="secondary">{120 + index * 5} km</FuturisticText>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-sm ${
                                  index === 0 
                                    ? 'bg-green-500/30 text-green-100 border-green-400/50' 
                                    : 'bg-blue-500/30 text-blue-100 border-blue-400/50'
                                }`}>
                                  {index === 0 ? 'In Progress' : 'Completed'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <button
                                  onClick={() => {
                                    setActiveTab('tracking');
                                    // Here you would set the date to view this specific trip
                                  }}
                                  className="bg-blue-500/30 hover:bg-blue-500/50 text-blue-100 px-3 py-1 
                                           rounded-lg transition-all duration-300 text-sm border border-blue-400/50
                                           backdrop-blur-sm hover:scale-105"
                                >
                                  View Route
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </ProfessionalDashboard>
    </FuturisticBackground>
  );
};

export default BusUserInfo;