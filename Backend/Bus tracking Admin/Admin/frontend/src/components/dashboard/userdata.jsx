import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './userdata.css';

const UserData = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [deleteUserId, setDeleteUserId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No token found, cannot fetch users');
        setLoading(false);
        return;
      }
      
      const response = await axios.get('http://localhost:5000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.users) {
        setUsers(response.data.users);
      } else {
        console.error('Invalid response format:', response.data);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching users:', err);
      setLoading(false);
    }
  };

  // Inline Edit Handlers
  const handleEdit = (user) => {
    setEditUserId(user._id);
    setEditForm({
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      department: user.department,
      is_active: user.is_active,
      password: user.password, // Include password if needed
    });
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm({
      ...editForm,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleEditSave = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/admin/users/${userId}`, editForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditUserId(null);
      fetchUsers();
    } catch (err) {
      // handle error
    }
  };

  const handleEditCancel = () => {
    setEditUserId(null);
    setEditForm({});
  };

  // Delete Handlers
  const handleDelete = (userId) => {
    setDeleteUserId(userId);
  };

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/admin/users/${deleteUserId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeleteUserId(null);
      fetchUsers();
    } catch (err) {
      // handle error
    }
  };

  const cancelDelete = () => {
    setDeleteUserId(null);
  };

  const handleViewInfo = (userId) => {
    window.location.href = `/userinfo/${userId}`;
  };

  return (
    <div className="bg-gray-900/60 backdrop-blur-md shadow-xl rounded-xl px-8 pt-6 pb-8 border border-gray-700">
      <h3 className="text-xl font-bold mb-4 text-indigo-100">Users</h3>
      {loading && <p className="text-indigo-200">Loading...</p>}
      {users.length === 0 && !loading ? (
        <p className='text-pink-400'>No users found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-transparent text-indigo-100">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b border-gray-700 bg-gray-800/60 text-left text-xs font-semibold text-indigo-200 uppercase tracking-wider">Name</th>
                <th className="py-2 px-4 border-b border-gray-700 bg-gray-800/60 text-left text-xs font-semibold text-indigo-200 uppercase tracking-wider">Email</th>
                <th className="py-2 px-4 border-b border-gray-700 bg-gray-800/60 text-left text-xs font-semibold text-indigo-200 uppercase tracking-wider">Mobile</th>
                <th className="py-2 px-4 border-b border-gray-700 bg-gray-800/60 text-left text-xs font-semibold text-indigo-200 uppercase tracking-wider">Department</th>
                <th className="py-2 px-4 border-b border-gray-700 bg-gray-800/60 text-left text-xs font-semibold text-indigo-200 uppercase tracking-wider">Status</th>
                <th className="py-2 px-4 border-b border-gray-700 bg-gray-800/60 text-left text-xs font-semibold text-indigo-200 uppercase tracking-wider">Actions</th>
                <th className="py-2 px-4 border-b border-gray-700 bg-gray-800/60 text-left text-xs font-semibold text-indigo-200 uppercase tracking-wider">Info</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  {editUserId === user._id ? (
                    <>
                      <td className="py-2 px-4 border-b border-gray-200">
                        <input
                          type="text"
                          name="name"
                          value={editForm.name}
                          onChange={handleEditChange}
                          className="border rounded px-2 py-1 w-full"
                        />
                      </td>
                      <td className="py-2 px-4 border-b border-gray-200">
                        <input
                          type="email"
                          name="email"
                          value={editForm.email}
                          onChange={handleEditChange}
                          className="border rounded px-2 py-1 w-full"
                        />
                      </td>
                      <td className="py-2 px-4 border-b border-gray-200">
                        <input
                          type="text"
                          name="mobile"
                          value={editForm.mobile}
                          onChange={handleEditChange}
                          className="border rounded px-2 py-1 w-full"
                        />
                      </td>
                      <td className="py-2 px-4 border-b border-gray-200">
                        <input
                          type="text"
                          name="department"
                          value={editForm.department}
                          onChange={handleEditChange}
                          className="border rounded px-2 py-1 w-full"
                        />
                      </td>
                      <td className="py-2 px-4 border-b border-gray-200">
                        <input
                          type="checkbox"
                          name="is_active"
                          checked={editForm.is_active}
                          onChange={handleEditChange}
                        />{' '}
                        {editForm.is_active ? 'Active' : 'Inactive'}
                      </td>
                      <td className="py-2 px-4 border-b border-gray-200">
                        <button
                          className="text-green-600 hover:text-green-800 mr-2"
                          onClick={() => handleEditSave(user._id)}
                        >
                          Save
                        </button>
                        <button
                          className="text-gray-500 hover:text-gray-700"
                          onClick={handleEditCancel}
                        >
                          Cancel
                        </button>
                      </td>
                      <td className="py-2 px-4 border-b border-gray-200">
                        <button
                          className="text-blue-500 hover:text-blue-700"
                          onClick={() => handleViewInfo(user._id)}
                        >
                          View Info
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2 px-4 border-b border-gray-200">{user.name}</td>
                      <td className="py-2 px-4 border-b border-gray-200">{user.email}</td>
                      <td className="py-2 px-4 border-b border-gray-200">{user.mobile}</td>
                      <td className="py-2 px-4 border-b border-gray-200">{user.department}</td>
                      <td className="py-2 px-4 border-b border-gray-200">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-2 px-4 border-b border-gray-200">
                        <button
                          className="text-blue-500 hover:text-blue-700 mr-2"
                          onClick={() => handleEdit(user)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(user._id)}
                        >
                          Delete
                        </button>
                      </td>
                      <td className="py-2 px-4 border-b border-gray-200">
                        <button
                          className="text-blue-500 hover:text-blue-700"
                          onClick={() => handleViewInfo(user._id)}
                        >
                          View Info
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteUserId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h4 className="text-lg font-bold mb-4 text-gray-800">Confirm Delete</h4>
            <p className="mb-6 text-gray-600">Are you sure you want to delete this user?</p>
            <div className="flex justify-end gap-4">
              <button
                className="px-4 py-2 bg-gray-200 rounded hover:bg-blue-600 text-gray-700 hover:text-white"
                onClick={cancelDelete}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserData;