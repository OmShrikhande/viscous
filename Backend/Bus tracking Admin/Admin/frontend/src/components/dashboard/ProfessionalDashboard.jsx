import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SnakeGame from './SnakeGame';

const ProfessionalDashboard = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [adminInfo, setAdminInfo] = useState(null);
  const navigate = useNavigate();

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
    fetchAdminInfo();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found, cannot fetch dashboard data');
        setStatsLoading(false);
        return;
      }

      // Fetch stats
      try {
        const statsResponse = await axios.get('http://localhost:5000/api/dashboard/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (statsResponse.data && statsResponse.data.data) {
          setDashboardStats(statsResponse.data.data);
        } else {
          console.error('Invalid stats response format:', statsResponse.data);
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        
        // If we get a 401 error, redirect to login
        if (err.response && err.response.status === 401) {
          localStorage.removeItem('token');
          navigate('/');
          return;
        }
      }

      // Fetch activities
      try {
        const activitiesResponse = await axios.get('http://localhost:5000/api/dashboard/recent-activities', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (activitiesResponse.data && activitiesResponse.data.activities) {
          setRecentActivities(activitiesResponse.data.activities);
        } else {
          console.error('Invalid activities response format:', activitiesResponse.data);
        }
      } catch (err) {
        console.error('Error fetching recent activities:', err);
        // Don't redirect for this error as it's not critical
      }

      setStatsLoading(false);
    } catch (err) {
      console.error('Error in fetchDashboardData:', err);
      setStatsLoading(false);
    }
  };

  const menuItems = [
    { name: 'Dashboard', icon: '🏠', path: '/dashboard' },
    { name: 'Users', icon: '👥', path: '/users' },
    { name: 'Add User', icon: '➕', path: '/adduser' },
    { name: 'Attendance', icon: '📅', path: '/attendance' },
    { name: 'Send Alert', icon: '🔔', path: '/alert' },
    { name: 'Analytics', icon: '📊', path: '/analytics' },
    { name: 'Reports', icon: '📋', path: '/reports' },
    { name: 'Settings', icon: '⚙️', path: '/settings' }
  ];

  const fetchAdminInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found, cannot fetch admin info');
        return;
      }

      const response = await axios.get('http://localhost:5000/api/admin/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.success) {
        setAdminInfo(response.data.admin);
      } else {
        console.error('Invalid response format for admin profile:', response.data);
      }
    } catch (err) {
      console.error('Error fetching admin info:', err);
      
      // If we get a 401 error, redirect to login
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('token');
        navigate('/');
      }
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Record logout time
        try {
          await axios.post('http://localhost:5000/api/admin/logout', {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (err) {
          console.error('Error recording logout:', err);
          // Continue with logout even if the API call fails
        }
      }
    } catch (err) {
      console.error('Error in handleLogout:', err);
    } finally {
      // Clear token from localStorage
      localStorage.removeItem('token');
      
      // Clear Authorization header
      delete axios.defaults.headers.common['Authorization'];
      
      // Navigate to login page
      navigate('/');
    }
  };

  const getDisplayName = () => {
    if (!adminInfo) return 'Admin';
    
    if (adminInfo.firstName && adminInfo.lastName) {
      return `${adminInfo.firstName} ${adminInfo.lastName}`;
    }
    
    if (adminInfo.username) {
      return adminInfo.username;
    }
    
    return adminInfo.email?.split('@')[0] || 'Admin';
  };

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 
        text-white z-50 transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
        w-64 shadow-2xl border-r border-gray-700
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">W</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">WebGuru</h1>
              <p className="text-xs text-gray-400">Admin Panel</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => {
                navigate(item.path);
                setSidebarOpen(false);
              }}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl
                       text-gray-300 hover:bg-gray-700 hover:text-white
                       transition-all duration-200"
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.name}</span>
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl
                     text-gray-300 hover:bg-red-600 hover:text-white transition-all duration-200"
          >
            <span className="text-xl">🚪</span>
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col bg-transparent overflow-y-auto">
        {/* Top navigation */}
        <header className="bg-white/30 backdrop-blur border border-white/30 shadow-lg z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              >
                ☰
              </button>
              <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
            </div>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <span className="text-xl">🔔</span>
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button 
                onClick={() => navigate('/admin-profile')}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm text-gray-900">{getDisplayName()}</span>
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {adminInfo?.firstName ? adminInfo.firstName[0] : adminInfo?.email?.[0]?.toUpperCase() || 'A'}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Stats Cards */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="rounded-xl p-6 shadow-lg bg-white/30 backdrop-blur border border-white/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardStats?.totalUsers || 0}
                  </p>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl">
                  <span className="text-2xl">👥</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl p-6 shadow-lg bg-white/30 backdrop-blur border border-white/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardStats?.activeUsers || 0}
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded-xl">
                  <span className="text-2xl">✅</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl p-6 shadow-lg bg-white/30 backdrop-blur border border-white/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">New Users</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardStats?.recentUsers || 0}
                  </p>
                  <p className="text-xs text-gray-500">Last 7 days</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-xl">
                  <span className="text-2xl">📈</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl p-6 shadow-lg bg-white/30 backdrop-blur border border-white/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">System Health</p>
                  <p className="text-2xl font-bold text-gray-900">99.9%</p>
                  <p className="text-xs text-gray-500">Uptime</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-xl">
                  <span className="text-2xl">💚</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Quick Actions Card */}
            <div className="lg:col-span-2">
              <div className="rounded-xl p-6 shadow-lg bg-white/30 backdrop-blur border border-white/30 h-full flex flex-col">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button
                    onClick={() => navigate('/adduser')}
                    className="p-4 rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-300 text-center"
                  >
                    <div className="bg-blue-50 p-3 rounded-xl mb-2 mx-auto w-fit">
                      <span className="text-2xl">➕</span>
                    </div>
                    <p className="text-sm font-medium text-gray-950">Add User</p>
                  </button>
                  <button
                    onClick={() => navigate('/alert')}
                    className="p-4 rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-300 text-center"
                  >
                    <div className="bg-red-50 p-3 rounded-xl mb-2 mx-auto w-fit">
                      <span className="text-2xl">🔔</span>
                    </div>
                    <p className="text-sm font-medium text-gray-950">Send Alert</p>
                  </button>
                  <button
                    onClick={() => navigate('/reports')}
                    className="p-4 rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-300 text-center text-gray-950"
                  >
                    <div className="bg-green-50 p-3 rounded-xl mb-2 mx-auto w-fit">
                      <span className="text-2xl">📋</span>
                    </div>
                    <p className="text-sm font-medium text-gray-950">Reports</p>
                  </button>
                  <button
                    onClick={() => navigate('/analytics')}
                    className="p-4 rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-300 text-center"
                  >
                    <div className="bg-purple-50 p-3 rounded-xl mb-2 mx-auto w-fit text-gray-950">
                      <span className="text-2xl">📊</span>
                    </div>
                    <p className="text-sm font-medium text-gray-950">Analytics</p>
                  </button>
                </div>
              </div>
            </div>

            {/* Snake Game Card */}
            <div>
              <SnakeGame />
            </div>
          </div>

          {/* Main content area */}
          <div className="rounded-xl shadow-lg bg-white/30 backdrop-blur border border-white/30">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalDashboard;