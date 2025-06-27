import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import ProfessionalDashboard from '../components/dashboard/ProfessionalDashboard';
import FuturisticBackground from '../components/backgrounds/FuturisticBackground';

const Alert = () => {
  const [authorized, setAuthorized] = useState(true);
  const [routeNumber, setRouteNumber] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [adminInfo, setAdminInfo] = useState(null);
  const [routes, setRoutes] = useState([
    { id: '1', name: 'Route 1' },
    { id: '2', name: 'Route 2' },
    { id: '3', name: 'Route 3' },
    { id: '4', name: 'Route 4' },
    { id: '5', name: 'Route 5' }
  ]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }

    setAuthorized(true);
    fetchAdminInfo(token);
  }, [navigate]);

  const fetchAdminInfo = async (token) => {
    try {
      const response = await axios.get('https://viscous.onrender.com/api/admin/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setAdminInfo(response.data.admin);
      }
    } catch (err) {
      console.log('Admin info not available');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!routeNumber || !message) {
      setError('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Add a new document to the "alerts" collection
      await addDoc(collection(db, "alerts"), {
        routeNumber,
        message,
        adminName: getAdminName(),
        adminDesignation: adminInfo?.role || 'Admin',
        timestamp: serverTimestamp(),
        status: 'active'
      });
      
      // Reset form
      setRouteNumber('');
      setMessage('');
      
      // Show success message
      setSuccess('Alert sent successfully!');
    } catch (err) {
      console.error("Error sending alert: ", err);
      setError('Error sending alert. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getAdminName = () => {
    if (!adminInfo) return 'Admin';
    
    if (adminInfo.firstName && adminInfo.lastName) {
      return `${adminInfo.firstName} ${adminInfo.lastName}`;
    }
    
    if (adminInfo.username) {
      return adminInfo.username;
    }
    
    return adminInfo.email?.split('@')[0] || 'Admin';
  };

  if (!authorized) return null;

  return (
    <FuturisticBackground>
      <ProfessionalDashboard>
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <span className="text-2xl mr-2">🔔</span>
              Send Alert
            </h2>
            <p className="text-gray-600">Send alerts to users on specific routes</p>
          </div>

          {success && (
            <div className="mb-6 p-4 rounded-lg bg-green-50 text-green-800 border border-green-200">
              <div className="flex items-center">
                <span className="text-xl mr-2">✅</span>
                <span>{success}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-800 border border-red-200">
              <div className="flex items-center">
                <span className="text-xl mr-2">❌</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="bg-white/50 backdrop-blur rounded-xl p-6 shadow-lg border border-white/30">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Admin Information
                  </label>
                  <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {adminInfo?.firstName ? adminInfo.firstName[0] : 'A'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{getAdminName()}</p>
                        <p className="text-sm text-gray-600">{adminInfo?.role || 'Admin'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="routeNumber" className="block text-gray-700 text-sm font-medium mb-2">
                    Route Number
                  </label>
                  <select
                    id="routeNumber"
                    value={routeNumber}
                    onChange={(e) => setRouteNumber(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="">Select a route</option>
                    {routes.map((route) => (
                      <option key={route.id} value={route.id}>
                        {route.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="message" className="block text-gray-700 text-sm font-medium mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your alert message here..."
                  required
                ></textarea>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors ${
                    loading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    'Send Alert'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </ProfessionalDashboard>
    </FuturisticBackground>
  );
};

export default Alert;