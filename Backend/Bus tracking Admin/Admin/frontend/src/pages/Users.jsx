import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ProfessionalDashboard from '../components/dashboard/ProfessionalDashboard';
import FuturisticBackground from '../components/backgrounds/FuturisticBackground';
import GlassCard from '../components/ui/GlassCard';
import FuturisticText from '../components/ui/FuturisticText';

// --- Stats Cards Section ---
const StatsCards = ({ users, departments }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
    <GlassCard className="p-6 rounded-2xl" variant="primary" glow>
      <div className="flex items-center justify-between">
        <div>
          <FuturisticText size="sm" variant="accent">Total Users</FuturisticText>
          <FuturisticText size="3xl" variant="primary" className="font-bold">
            {users.length}
          </FuturisticText>
        </div>
        <div className="bg-blue-500/30 p-3 rounded-xl border border-blue-400/50">
          <span className="text-2xl">👥</span>
        </div>
      </div>
    </GlassCard>
    <GlassCard className="p-6 rounded-2xl" variant="success" glow>
      <div className="flex items-center justify-between">
        <div>
          <FuturisticText size="sm" variant="success">Active Users</FuturisticText>
          <FuturisticText size="3xl" variant="primary" className="font-bold">
            {users.filter(u => u.is_active).length}
          </FuturisticText>
        </div>
        <div className="bg-green-500/30 p-3 rounded-xl border border-green-400/50">
          <span className="text-2xl">✅</span>
        </div>
      </div>
    </GlassCard>
    <GlassCard className="p-6 rounded-2xl" variant="error" glow>
      <div className="flex items-center justify-between">
        <div>
          <FuturisticText size="sm" variant="error">Inactive Users</FuturisticText>
          <FuturisticText size="3xl" variant="primary" className="font-bold">
            {users.filter(u => !u.is_active).length}
          </FuturisticText>
        </div>
        <div className="bg-red-500/30 p-3 rounded-xl border border-red-400/50">
          <span className="text-2xl">❌</span>
        </div>
      </div>
    </GlassCard>
    <GlassCard className="p-6 rounded-2xl" variant="info" glow>
      <div className="flex items-center justify-between">
        <div>
          <FuturisticText size="sm" variant="accent">Departments</FuturisticText>
          <FuturisticText size="3xl" variant="primary" className="font-bold">
            {departments.length}
          </FuturisticText>
        </div>
        <div className="bg-purple-500/30 p-3 rounded-xl border border-purple-400/50">
          <span className="text-2xl">🏢</span>
        </div>
      </div>
    </GlassCard>
  </div>
);

// --- Filters Section ---
const Filters = ({
  searchTerm, setSearchTerm,
  filterDepartment, setFilterDepartment,
  filterStatus, setFilterStatus,
  departments,
  onClear
}) => (
  <GlassCard className="p-6 rounded-2xl" variant="secondary">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div>
        <label className="block mb-2">
          <FuturisticText size="sm" variant="primary">Search Users</FuturisticText>
        </label>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 bg-white/30 border border-white/40 rounded-lg 
                   text-black placeholder-gray/70 focus:outline-none focus:ring-2 
                   focus:ring-blue-400 focus:border-transparent backdrop-blur-sm
                   shadow-inner "
        />
      </div>
      <div>
        <label className="block mb-2">
          <FuturisticText size="sm" variant="primary">Department</FuturisticText>
        </label>
        <select
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
          className="w-full px-4 py-3 bg-white/30 border border-white/40 rounded-lg 
                   text-black focus:outline-none focus:ring-2 focus:ring-blue-400
                   backdrop-blur-sm shadow-inner"
        >
          <option value="" className="text-black bg-white">All Departments</option>
          {departments.map(dept => (
            <option key={dept} value={dept} className="text-black bg-white">{dept}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block mb-2">
          <FuturisticText size="sm" variant="primary">Status</FuturisticText>
        </label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full px-4 py-3 bg-white/30 border border-white/40 rounded-lg 
                   text-black focus:outline-none focus:ring-2 focus:ring-blue-400
                   backdrop-blur-sm shadow-inner"
        >
          <option value="" className="text-black bg-white">All Status</option>
          <option value="active" className="text-black bg-white">Active</option>
          <option value="inactive" className="text-black bg-white">Inactive</option>
        </select>
      </div>
      <div className="flex items-end">
        <button
          onClick={onClear}
          className="w-full bg-gradient-to-r from-gray-500/80 to-gray-600/80 hover:from-gray-500 hover:to-gray-600 
                   text-white px-4 py-3 rounded-lg transition-all duration-300 border border-white/30
                   backdrop-blur-sm shadow-lg hover:shadow-xl"
        >
          Clear Filters
        </button>
      </div>
    </div>
  </GlassCard>
);

// --- Users Table Section ---
const UsersTable = ({
  users, navigate, toggleUserStatus, deleteUser
}) => (
  <GlassCard className="rounded-2xl overflow-hidden" variant="primary">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-white/30 backdrop-blur-sm">
          <tr>
            <th className="px-6 py-4 text-left">
              <FuturisticText variant="primary" className="font-semibold">User</FuturisticText>
            </th>
            <th className="px-6 py-4 text-left">
              <FuturisticText variant="primary" className="font-semibold">Department</FuturisticText>
            </th>
            <th className="px-6 py-4 text-left">
              <FuturisticText variant="primary" className="font-semibold">Contact</FuturisticText>
            </th>
            <th className="px-6 py-4 text-left">
              <FuturisticText variant="primary" className="font-semibold">Status</FuturisticText>
            </th>
            <th className="px-6 py-4 text-left">
              <FuturisticText variant="primary" className="font-semibold">Joined</FuturisticText>
            </th>
            <th className="px-6 py-4 text-left">
              <FuturisticText variant="primary" className="font-semibold">Actions</FuturisticText>
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr 
              key={user._id} 
              className="border-b border-white/20 hover:bg-white/20 transition-all duration-300"
            >
              <td className="px-6 py-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 
                  rounded-full flex items-center justify-center text-black font-bold
                  shadow-lg border border-white/30">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <FuturisticText variant="primary" className="font-medium">
                      {user.name}
                    </FuturisticText>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <FuturisticText variant="secondary">{user.department}</FuturisticText>
              </td>
              <td className="px-6 py-4">
                <FuturisticText variant="secondary">{user.mobile}</FuturisticText>
              </td>
              <td className="px-6 py-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-sm ${
                  user.is_active 
                    ? 'bg-green-500/30 text-green-100 border-green-400/50' 
                    : 'bg-red-500/30 text-red-100 border-red-400/50'
                }`}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4">
                <FuturisticText variant="secondary">
                  {new Date(user.joiningDate).toLocaleDateString()}
                </FuturisticText>
              </td>
              <td className="px-6 py-4">
                <div className="flex space-x-2">
                  <button
                    onClick={() => navigate(`/userinfo/${user._id}`)}
                    className="bg-blue-500/30 hover:bg-blue-500/50 text-blue-100 px-3 py-1 
                             rounded-lg transition-all duration-300 text-sm border border-blue-400/50
                             backdrop-blur-sm hover:scale-105"
                  >
                    View
                  </button>
                  <button
                    onClick={() => navigate(`/bususerinfo/${user._id}`)}
                    className="bg-purple-500/30 hover:bg-purple-500/50 text-purple-100 px-3 py-1 
                             rounded-lg transition-all duration-300 text-sm border border-purple-400/50
                             backdrop-blur-sm hover:scale-105"
                  >
                    View Info
                  </button>
                  <button
                    onClick={() => toggleUserStatus(user._id, user.is_active)}
                    className={`px-3 py-1 rounded-lg transition-all duration-300 text-sm backdrop-blur-sm hover:scale-105 ${
                      user.is_active
                        ? 'bg-red-500/30 hover:bg-red-500/50 text-red-100 border border-red-400/50'
                        : 'bg-green-500/30 hover:bg-green-500/50 text-green-100 border border-green-400/50'
                    }`}
                  >
                    {user.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => deleteUser(user._id)}
                    className="bg-red-500/30 hover:bg-red-500/50 text-red-100 px-3 py-1 
                             rounded-lg transition-all duration-300 text-sm border border-red-400/50
                             backdrop-blur-sm hover:scale-105"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </GlassCard>
);

// --- Pagination Section ---
const Pagination = ({
  currentPage, totalPages, setCurrentPage, indexOfFirstUser, indexOfLastUser, filteredUsers
}) => (
  totalPages > 1 && (
    <div className="bg-white/20 backdrop-blur-sm px-6 py-4 flex items-center justify-between border-t border-white/30">
      <div>
        <FuturisticText variant="secondary" size="sm">
          Showing {indexOfFirstUser + 1} to {Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length} users
        </FuturisticText>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-white/30 text-white rounded-lg disabled:opacity-50 
                   hover:bg-white/40 transition-all duration-300 border border-white/40
                   backdrop-blur-sm disabled:cursor-not-allowed"
        >
          Previous
        </button>
        {[...Array(Math.min(totalPages, 5))].map((_, index) => {
          const pageNum = currentPage <= 3 ? index + 1 : 
                         currentPage >= totalPages - 2 ? totalPages - 4 + index :
                         currentPage - 2 + index;
          return (
            <button
              key={pageNum}
              onClick={() => setCurrentPage(pageNum)}
              className={`px-3 py-2 rounded-lg transition-all duration-300 border backdrop-blur-sm ${
                currentPage === pageNum
                  ? 'bg-blue-500/80 text-white border-blue-400/80 shadow-lg'
                  : 'bg-white/30 text-white hover:bg-white/40 border-white/40'
              }`}
            >
              {pageNum}
            </button>
          );
        })}
        <button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-4 py-2 bg-white/30 text-white rounded-lg disabled:opacity-50 
                   hover:bg-white/40 transition-all duration-300 border border-white/40
                   backdrop-blur-sm disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  )
);

// --- Main Users Component ---
const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data.users);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5000/api/admin/users/${userId}`,
        { is_active: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const deleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5000/api/admin/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  // Filter and search logic
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === '' || user.department === filterDepartment;
    const matchesStatus = filterStatus === '' || 
                         (filterStatus === 'active' && user.is_active) ||
                         (filterStatus === 'inactive' && !user.is_active);
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  // Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // Get unique departments
  const departments = [...new Set(users.map(user => user.department))];

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

  return (
    <FuturisticBackground variant="users">
      <ProfessionalDashboard>
        <div className="p-6 space-y-6">
          {/* Header */}
          <GlassCard className="p-6 rounded-2xl" variant="primary" hover glow>
            <div className="flex items-center justify-between">
              <div>
                <FuturisticText size="3xl" variant="primary" className="font-bold mb-2">
                  User Management
                </FuturisticText>
                <FuturisticText variant="accent" >
                  Manage and monitor all system users
                </FuturisticText>
              </div>
              <div className="flex space-x-2">
                <button
                  className="bg-gray-700/70 hover:bg-gray-800 text-white px-4 py-2 rounded-xl transition-all"
                  title="Toggle theme"
                >
                  Theme
                </button>
                <button
                  onClick={() => navigate('/adduser')}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 
                           text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 
                           transform hover:scale-105 shadow-lg hover:shadow-xl border border-white/20"
                >
                  ➕ Add New User
                </button>
              </div>
            </div>
          </GlassCard>

          {/* Stats Cards */}
          <StatsCards users={users} departments={departments} />

          {/* Filters */}
          <Filters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterDepartment={filterDepartment}
            setFilterDepartment={setFilterDepartment}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            departments={departments}
            onClear={() => {
              setSearchTerm('');
              setFilterDepartment('');
              setFilterStatus('');
            }}
          />

          {/* Users Table */}
          <UsersTable
            users={currentUsers}
            navigate={navigate}
            toggleUserStatus={toggleUserStatus}
            deleteUser={deleteUser}
          />

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
            indexOfFirstUser={indexOfFirstUser}
            indexOfLastUser={indexOfLastUser}
            filteredUsers={filteredUsers}
          />
        </div>
      </ProfessionalDashboard>
    </FuturisticBackground>
  );
};

export default Users;