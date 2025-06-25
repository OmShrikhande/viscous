import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ProfessionalDashboard from '../components/dashboard/ProfessionalDashboard';
import FuturisticBackground from '../components/backgrounds/FuturisticBackground';

const Attendance = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [todayRecords, setTodayRecords] = useState([]);
  const [departmentStats, setDepartmentStats] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAttendance, setNewAttendance] = useState({
    userId: '',
    date: new Date().toISOString().split('T')[0],
    checkIn: { time: '', location: { coordinates: [0, 0] } },
    checkOut: { time: '', location: { coordinates: [0, 0] } },
    status: 'present',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [selectedUser, dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');
      // Fetch users
      const usersResponse = await axios.get('http://localhost:5000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(usersResponse.data.users);
      // Fetch attendance data
      try {
        const attendanceResponse = await axios.get('http://localhost:5000/api/attendance', {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            userId: selectedUser,
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            limit: 50
          }
        });
        setAttendanceData(attendanceResponse.data.data || []);
      } catch (err) {
        console.error('Error fetching attendance data:', err.response?.data || err.message);
        setAttendanceData([]);
      }
      // Fetch attendance summary
      try {
        const summaryResponse = await axios.get('http://localhost:5000/api/attendance/summary', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAttendanceStats(summaryResponse.data.data);
      } catch (err) {
        console.error('Error fetching attendance summary:', err.response?.data || err.message);
      }
      // Fetch today's attendance data
      try {
        const todayResponse = await axios.get('http://localhost:5000/api/dashboard/today-attendance', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (todayResponse.data.success) {
          setTodayAttendance(todayResponse.data.data.summary);
          setTodayRecords(todayResponse.data.data.records || []);
          setDepartmentStats(todayResponse.data.data.departmentStats || []);
        } else {
          console.error('Today attendance request failed:', todayResponse.data.message);
          alert('Failed to fetch today\'s attendance: ' + todayResponse.data.message);
        }
      } catch (err) {
        console.error('Error fetching today\'s attendance:', err.response?.data || err.message);
        alert('Failed to fetch today\'s attendance data. Please try again.');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error.message);
      alert('Error fetching data: ' + error.message);
      setLoading(false);
    }
  };

  const addAttendanceRecord = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Adding attendance for userId:', newAttendance.userId);
      const selectedDate = new Date(newAttendance.date);
      selectedDate.setHours(0, 0, 0, 0);
      const checkInDateTime = new Date(`${newAttendance.date}T${newAttendance.checkIn.time}`);
      const checkOutDateTime = newAttendance.checkOut.time ? 
        new Date(`${newAttendance.date}T${newAttendance.checkOut.time}`) : null;
      const attendanceRecord = {
        ...newAttendance,
        date: selectedDate,
        checkIn: { ...newAttendance.checkIn, time: checkInDateTime },
        checkOut: checkOutDateTime ? { ...newAttendance.checkOut, time: checkOutDateTime } : undefined,
        isManualEntry: true
      };
      const response = await axios.post('http://localhost:5000/api/attendance', attendanceRecord, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Attendance record added:', response.data);
      setShowAddModal(false);
      setNewAttendance({
        userId: '',
        date: new Date().toISOString().split('T')[0],
        checkIn: { time: '', location: { coordinates: [0, 0] } },
        checkOut: { time: '', location: { coordinates: [0, 0] } },
        status: 'present',
        notes: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error adding attendance record:', error.response?.data || error.message);
      alert('Failed to add attendance record: ' + (error.response?.data?.message || 'Unknown error'));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'late': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'absent': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'half-day': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const StatCard = ({ title, value, subtitle, icon, color }) => (
    <div className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 
                    hover:bg-white/20 transition-all duration-300 transform hover:scale-105`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-${color}-200 text-sm font-medium`}>{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-gray-300 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className={`bg-${color}-500/20 p-3 rounded-xl`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <FuturisticBackground variant="attendance">
        <ProfessionalDashboard>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-500"></div>
          </div>
        </ProfessionalDashboard>
      </FuturisticBackground>
    );
  }

  return (
    <FuturisticBackground variant="attendance">
      <ProfessionalDashboard>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Attendance Management</h1>
              <p className="text-cyan-200">Track and manage employee attendance records</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 
                       text-white px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105"
            >
              ➕ Add Record
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              title="Today's Attendance"
              value={todayAttendance?.total || attendanceStats?.todayAttendance || 0}
              subtitle="Total check-ins"
              icon="📅"
              color="blue"
            />
            <StatCard
              title="Present Today"
              value={todayAttendance?.present || attendanceStats?.presentToday || 0}
              subtitle="On time arrivals"
              icon="✅"
              color="green"
            />
            <StatCard
              title="Late Arrivals"
              value={todayAttendance?.late || attendanceStats?.lateToday || 0}
              subtitle="Late today"
              icon="⏰"
              color="yellow"
            />
            <StatCard
              title="Absent Today"
              value={todayAttendance?.absent || 0}
              subtitle="Not checked in"
              icon="❌"
              color="red"
            />
          </div>
          
          {/* Today's Attendance Summary */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Today's Attendance</h3>
              <div className="flex items-center space-x-2">
                <span className="text-cyan-200 text-sm">
                  Average Check-in Time: {todayAttendance?.averageCheckInTime || 'N/A'}
                </span>
                <button
                  onClick={fetchData}
                  className="bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-200 p-2 rounded-lg transition-all duration-300"
                >
                  🔄
                </button>
              </div>
            </div>
            
            {/* Department-wise attendance */}
            {departmentStats && departmentStats.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {departmentStats.map((dept, index) => (
                  <div key={index} className="bg-white/10 rounded-xl p-4 border border-white/20">
                    <h4 className="text-white font-medium mb-2">{dept._id || 'Unknown Department'}</h4>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-cyan-200">Present:</span>
                      <span className="text-white">{dept.present} / {dept.total}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${Math.round((dept.present / dept.total) * 100)}%` }}
                      ></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-green-500/20 rounded p-1 text-center">
                        <span className="block text-green-300">{dept.present}</span>
                        <span className="text-white/70">Present</span>
                      </div>
                      <div className="bg-yellow-500/20 rounded p-1 text-center">
                        <span className="block text-yellow-300">{dept.late}</span>
                        <span className="text-white/70">Late</span>
                      </div>
                      <div className="bg-red-500/20 rounded p-1 text-center">
                        <span className="block text-red-300">{dept.absent}</span>
                        <span className="text-white/70">Absent</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Today's attendance records */}
            {todayRecords && todayRecords.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/20">
                    <tr>
                      <th className="px-6 py-3 text-left text-white font-medium">Employee</th>
                      <th className="px-6 py-3 text-left text-white font-medium">Check In</th>
                      <th className="px-6 py-3 text-left text-white font-medium">Check Out</th>
                      <th className="px-6 py-3 text-left text-white font-medium">Hours</th>
                      <th className="px-6 py-3 text-left text-white font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayRecords.map((record, index) => (
                      <tr key={index} className="border-b border-white/10 hover:bg-white/10 transition-all duration-300">
                        <td className="px-6 py-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 
                                          rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {record.userId?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="text-white font-medium">{record.userId?.name || 'Unknown'}</p>
                              <p className="text-cyan-200 text-sm">{record.userId?.department || 'N/A'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-white">
                          {formatTime(record.loginTime)}
                        </td>
                        <td className="px-6 py-3 text-white">
                          {formatTime(record.logoutTime)}
                        </td>
                        <td className="px-6 py-3 text-white">
                          {record.totalHours ? `${record.totalHours.toFixed(1)}h` : 'N/A'}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📅</div>
                <p className="text-xl text-white mb-2">No attendance records for today</p>
                <p className="text-cyan-200">Employees haven't checked in yet</p>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">Select User</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg 
                           text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="" className="text-black">All Users</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id} className="text-black">
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg 
                           text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg 
                           text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={fetchData}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 
                           text-white px-4 py-2 rounded-lg transition-all duration-300"
                >
                  🔍 Search
                </button>
              </div>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
            <div className="p-6 border-b border-white/20">
              <h3 className="text-xl font-bold text-white">Attendance Records</h3>
              <p className="text-cyan-200 text-sm">{attendanceData.length} records found</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/20">
                  <tr>
                    <th className="px-6 py-4 text-left text-white font-medium">Employee</th>
                    <th className="px-6 py-4 text-left text-white font-medium">Date</th>
                    <th className="px-6 py-4 text-left text-white font-medium">Check In</th>
                    <th className="px-6 py-4 text-left text-white font-medium">Check Out</th>
                    <th className="px-6 py-4 text-left text-white font-medium">Total Hours</th>
                    <th className="px-6 py-4 text-left text-white font-medium">Status</th>
                    <th className="px-6 py-4 text-left text-white font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.length > 0 ? (
                    attendanceData.map((record, index) => (
                      <tr key={record._id} className="border-b border-white/10 hover:bg-white/10 transition-all duration-300">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 
                                          rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {record.userId?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="text-white font-medium">{record.userId?.name || 'Unknown'}</p>
                              <p className="text-cyan-200 text-sm">{record.userId?.department || 'N/A'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-white">
                          {new Date(record.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-white">
                          {formatTime(record.loginTime)}
                        </td>
                        <td className="px-6 py-4 text-white">
                          {formatTime(record.logoutTime)}
                        </td>
                        <td className="px-6 py-4 text-white">
                          {record.totalHours ? `${record.totalHours.toFixed(1)}h` : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-white text-sm">
                          {record.notes || 'No notes'}
                          {record.isManualEntry && (
                            <span className="ml-2 text-yellow-300 text-xs">(Manual)</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-white">
                        <div className="text-4xl mb-4">📅</div>
                        <p className="text-xl mb-2">No attendance records found</p>
                        <p className="text-cyan-200">Try adjusting your filters or date range</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Attendance Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 w-full max-w-md">
                <h3 className="text-xl font-bold text-white mb-4">Add Attendance Record</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Employee</label>
                    <select
                      value={newAttendance.userId}
                      onChange={(e) => setNewAttendance(prev => ({ ...prev, userId: e.target.value }))}
                      className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg 
                               text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="" className="text-black">Select Employee</option>
                      {users.map(user => (
                        <option key={user._id} value={user._id} className="text-black">
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Date</label>
                    <input
                      type="date"
                      value={newAttendance.date}
                      onChange={(e) => setNewAttendance(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg 
                               text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Check In</label>
                      <input
                        type="time"
                        value={newAttendance.checkIn.time}
                        onChange={(e) => setNewAttendance(prev => ({
                          ...prev,
                          checkIn: { ...prev.checkIn, time: e.target.value }
                        }))}
                        className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg 
                                 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Check Out</label>
                      <input
                        type="time"
                        value={newAttendance.checkOut.time}
                        onChange={(e) => setNewAttendance(prev => ({
                          ...prev,
                          checkOut: { ...prev.checkOut, time: e.target.value }
                        }))}
                        className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg 
                                 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Status</label>
                    <select
                      value={newAttendance.status}
                      onChange={(e) => setNewAttendance(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg 
                               text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="present" className="text-black">Present</option>
                      <option value="late" className="text-black">Late</option>
                      <option value="absent" className="text-black">Absent</option>
                      <option value="half-day" className="text-black">Half Day</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-white text-sm font-medium mb-2">Notes</label>
                    <textarea
                      value={newAttendance.notes}
                      onChange={(e) => setNewAttendance(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg 
                               text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      rows="3"
                      placeholder="Optional notes..."
                    />
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-gray-500/20 hover:bg-gray-500/40 text-white px-4 py-2 
                             rounded-lg transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addAttendanceRecord}
                    disabled={!newAttendance.userId || !newAttendance.checkIn.time}
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 
                             text-white px-4 py-2 rounded-lg transition-all duration-300 disabled:opacity-50"
                  >
                    Add Record
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </ProfessionalDashboard>
    </FuturisticBackground>
  );
};

export default Attendance;

