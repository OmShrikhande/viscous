import React, { useState, useEffect } from 'react';
import UserMap from './UserMap';

const UserLocationSection = ({ userId }) => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newLatitude, setNewLatitude] = useState('');
  const [newLongitude, setNewLongitude] = useState('');
  const [locationMessage, setLocationMessage] = useState('');

  const fetchLocation = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/locations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLocation(data.location);
      } else {
        setLocation(null);
      }
    } catch (err) {
      setLocation(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLocation();
    // eslint-disable-next-line
  }, [userId]);

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
      const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/locations`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ latitude, longitude })
      });
      const data = await res.json();
      if (data.success) {
        setLocationMessage('Location added successfully!');
        setNewLatitude('');
        setNewLongitude('');
        fetchLocation();
      } else {
        setLocationMessage(`Failed to add location: ${data.message}`);
      }
    } catch (err) {
      setLocationMessage('An error occurred while adding location');
    }
  };

  return (
    <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-lg rounded-3xl shadow-xl p-6 border border-indigo-100 dark:border-gray-800">
      <h3 className="text-xl font-bold text-indigo-700 dark:text-indigo-200 mb-4">User Location</h3>
      <div className="rounded-2xl overflow-hidden border-2 border-indigo-200 dark:border-indigo-700 shadow-lg mb-6" style={{ height: 400, width: "100%" }}>
        <UserMap
          latitude={location?.latitude}
          longitude={location?.longitude}
          loading={loading}
        />
      </div>
      {/* Add Location Form */}
      <div className="mt-6 p-4 bg-indigo-50/80 dark:bg-gray-800/80 rounded-xl shadow border border-indigo-100 dark:border-gray-700">
        <h4 className="text-lg font-semibold text-indigo-700 dark:text-indigo-200 mb-3">Add New Location</h4>
        <form onSubmit={handleAddLocation} className="space-y-4">
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
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-semibold py-2 px-4 rounded-md shadow transition-colors duration-300"
          >
            Add Location
          </button>
        </form>
        {locationMessage && (
          <div className={`mt-3 p-3 rounded-md shadow ${locationMessage.includes('success') ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'}`}>
            {locationMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserLocationSection;