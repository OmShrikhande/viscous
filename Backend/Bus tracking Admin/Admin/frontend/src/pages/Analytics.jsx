import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ProfessionalDashboard from '../components/dashboard/ProfessionalDashboard';
import FuturisticBackground from '../components/backgrounds/FuturisticBackground';

const Analytics = () => {
  const [dashboardStats, setDashboardStats] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch dashboard stats
      const dashboardResponse = await axios.get('http://localhost:5000/api/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardStats(dashboardResponse.data.data);

      // Fetch attendance summary
      try {
        const attendanceResponse = await axios.get('http://localhost:5000/api/attendance/summary', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAttendanceStats(attendanceResponse.data.data);
      } catch (err) {
        console.log('Attendance data not available');
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setLoading(false);
    }
  };

  const MetricCard = ({ title, value, subtitle, icon, color, trend }) => (
    <div className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 
                    hover:bg-white/20 transition-all duration-300 transform hover:scale-105 
                    hover:shadow-2xl group`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`bg-${color}-500/20 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300`}>
          <span className="text-2xl">{icon}</span>
        </div>
        {trend && (
          <div className={`flex items-center space-x-1 text-sm ${
            trend > 0 ? 'text-green-300' : 'text-red-300'
          }`}>
            <span>{trend > 0 ? '↗️' : '↘️'}</span>
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div>
        <h3 className="text-white text-sm font-medium mb-1">{title}</h3>
        <p className="text-3xl font-bold text-white mb-1">{value}</p>
        {subtitle && <p className="text-gray-300 text-xs">{subtitle}</p>}
      </div>
    </div>
  );

  const ChartContainer = ({ title, children }) => (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
      <h3 className="text-xl font-bold text-white mb-6">{title}</h3>
      {children}
    </div>
  );

  if (loading) {
    return (
      <FuturisticBackground variant="analytics">
        <ProfessionalDashboard>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
          </div>
        </ProfessionalDashboard>
      </FuturisticBackground>
    );
  }

  return (
    <FuturisticBackground variant="analytics">
      <ProfessionalDashboard>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
              <p className="text-purple-200">Comprehensive insights and data visualization</p>
            </div>
            <div className="flex space-x-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white 
                         focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="week" className="text-black">Last Week</option>
                <option value="month" className="text-black">Last Month</option>
                <option value="quarter" className="text-black">Last Quarter</option>
                <option value="year" className="text-black">Last Year</option>
              </select>
              <button
                onClick={fetchAnalyticsData}
                className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 
                         text-white px-6 py-2 rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Users"
              value={dashboardStats?.totalUsers || 0}
              subtitle="Registered users"
              icon="👥"
              color="blue"
              trend={12}
            />
            <MetricCard
              title="Active Users"
              value={dashboardStats?.activeUsers || 0}
              subtitle="Currently active"
              icon="✅"
              color="green"
              trend={8}
            />
            <MetricCard
              title="Today's Attendance"
              value={attendanceStats?.todayAttendance || 0}
              subtitle="Present today"
              icon="📅"
              color="purple"
              trend={5}
            />
            <MetricCard
              title="Avg. Working Hours"
              value={attendanceStats?.averageHours ? `${attendanceStats.averageHours.toFixed(1)}h` : '0h'}
              subtitle="This month"
              icon="⏰"
              color="orange"
              trend={-2}
            />
          </div>

          {/* Department Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartContainer title="Department Distribution">
              <div className="space-y-4">
                {dashboardStats?.departmentStats?.map((dept, index) => {
                  const percentage = ((dept.count / dashboardStats.totalUsers) * 100).toFixed(1);
                  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500'];
                  
                  return (
                    <div key={dept._id} className="space-y-2">
                      <div className="flex justify-between text-white">
                        <span className="font-medium">{dept._id || 'Unknown'}</span>
                        <span>{dept.count} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-3">
                        <div
                          className={`${colors[index % colors.length]} h-3 rounded-full transition-all duration-1000 ease-out`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartContainer>

            <ChartContainer title="User Status Overview">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="relative w-32 h-32 mx-auto mb-4">
                    <div className="absolute inset-0 bg-green-500/20 rounded-full"></div>
                    <div className="absolute inset-2 bg-green-500/40 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {dashboardStats?.activeUsers || 0}
                      </span>
                    </div>
                  </div>
                  <p className="text-green-300 font-medium">Active Users</p>
                </div>
                <div className="text-center">
                  <div className="relative w-32 h-32 mx-auto mb-4">
                    <div className="absolute inset-0 bg-red-500/20 rounded-full"></div>
                    <div className="absolute inset-2 bg-red-500/40 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {dashboardStats?.inactiveUsers || 0}
                      </span>
                    </div>
                  </div>
                  <p className="text-red-300 font-medium">Inactive Users</p>
                </div>
              </div>
            </ChartContainer>
          </div>

          {/* Attendance Analytics */}
          {attendanceStats && (
            <ChartContainer title="Attendance Analytics">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6">
                    <div className="text-3xl font-bold text-white mb-2">
                      {attendanceStats.presentToday}
                    </div>
                    <div className="text-blue-100">Present Today</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-gradient-to-r from-yellow-500 to-orange-600 rounded-2xl p-6">
                    <div className="text-3xl font-bold text-white mb-2">
                      {attendanceStats.lateToday}
                    </div>
                    <div className="text-yellow-100">Late Today</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl p-6">
                    <div className="text-3xl font-bold text-white mb-2">
                      {attendanceStats.averageHours?.toFixed(1) || 0}h
                    </div>
                    <div className="text-green-100">Avg. Hours</div>
                  </div>
                </div>
              </div>
            </ChartContainer>
          )}

          {/* Performance Insights */}
          <ChartContainer title="Performance Insights">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl p-4 border border-blue-500/30">
                <div className="text-center">
                  <div className="text-2xl mb-2">📈</div>
                  <div className="text-lg font-bold text-white">Growth Rate</div>
                  <div className="text-green-300">+12.5%</div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-500/20 to-teal-500/20 rounded-xl p-4 border border-green-500/30">
                <div className="text-center">
                  <div className="text-2xl mb-2">⚡</div>
                  <div className="text-lg font-bold text-white">Efficiency</div>
                  <div className="text-green-300">94.2%</div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30">
                <div className="text-center">
                  <div className="text-2xl mb-2">🎯</div>
                  <div className="text-lg font-bold text-white">Accuracy</div>
                  <div className="text-green-300">98.7%</div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl p-4 border border-orange-500/30">
                <div className="text-center">
                  <div className="text-2xl mb-2">🔥</div>
                  <div className="text-lg font-bold text-white">Performance</div>
                  <div className="text-green-300">Excellent</div>
                </div>
              </div>
            </div>
          </ChartContainer>

          {/* Recent Trends */}
          <ChartContainer title="Recent Trends">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-white">User registrations increased by 15% this week</span>
                </div>
                <span className="text-green-300 text-sm">+15%</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-white">Average session time improved</span>
                </div>
                <span className="text-blue-300 text-sm">+8%</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                  <span className="text-white">System performance optimized</span>
                </div>
                <span className="text-purple-300 text-sm">+12%</span>
              </div>
            </div>
          </ChartContainer>
        </div>
      </ProfessionalDashboard>
    </FuturisticBackground>
  );
};

export default Analytics;