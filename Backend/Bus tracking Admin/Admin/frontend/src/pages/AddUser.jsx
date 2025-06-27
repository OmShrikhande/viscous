import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import FuturisticBackground from '../components/backgrounds/FuturisticBackground';
import ProfessionalDashboard from '../components/dashboard/ProfessionalDashboard';
import FuturisticText from '../components/ui/FuturisticText';

const AddUser = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    address: '',
    joiningDate: '',
    is_active: true,
    department: '',
    adhar: '',
    pan: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      await axios.post('https://viscous.onrender.com/api/admin/users', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('User added successfully');
      setLoading(false);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add user');
      setLoading(false);
    }
  };

  return (
    <FuturisticBackground variant="users">
      <ProfessionalDashboard>
        <div className="w-full max-w-2xl mx-auto   p-8 animate-fade-in transition-all duration-700 mt-10 mb-10">
          <FuturisticText variant="primary" size="2xl" glow className="mb-6 block">
            Add New User
          </FuturisticText>
          {success && ( 
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 transition-all duration-300 animate-fade-in">
              {success}
            </div>
          )}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 transition-all duration-300 animate-fade-in">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label className="block text-gray-700 font-semibold mb-1" htmlFor="name">Name</label>
                <input className="input" id="name" type="text" name="name" value={formData.name} onChange={handleChange} required autoComplete="off" />
              </div>

              {/* Email */}
              <div>
                <label className="block text-gray-700 font-semibold mb-1" htmlFor="email">Email</label>
                <input className="input" id="email" type="email" name="email" value={formData.email} onChange={handleChange} required autoComplete="off" />
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-gray-700 font-semibold mb-1" htmlFor="mobile">Mobile</label>
                <input className="input" id="mobile" type="text" name="mobile" value={formData.mobile} onChange={handleChange} required maxLength={10} />
              </div>

              {/* Department */}
              <div>
                <label className="block text-gray-700 font-semibold mb-1" htmlFor="department">Department</label>
                <input className="input" id="department" type="text" name="department" value={formData.department} onChange={handleChange} required />
              </div>

              {/* Adhar */}
              <div>
                <label className="block text-gray-700 font-semibold mb-1" htmlFor="adhar">Adhar Number</label>
                <input className="input" id="adhar" type="text" name="adhar" value={formData.adhar} onChange={handleChange} required maxLength={12} />
              </div>

              {/* PAN */}
              <div>
                <label className="block text-gray-700 font-semibold mb-1" htmlFor="pan">PAN Number</label>
                <input className="input" id="pan" type="text" name="pan" value={formData.pan} onChange={handleChange} required style={{ textTransform: 'uppercase' }} />
              </div>

              {/* Joining Date */}
              <div>
                <label className="block text-gray-700 font-semibold mb-1" htmlFor="joiningDate">Joining Date</label>
                <input className="input" id="joiningDate" type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} required />
              </div>

              {/* Address */}
              <div>
                <label className="block text-gray-700 font-semibold mb-1" htmlFor="address">Address</label>
                <textarea className="input" id="address" name="address" value={formData.address} onChange={handleChange} required rows={2} />
              </div>

              {/* Password */}
              <div>
                <label className="block text-gray-700 font-semibold mb-1" htmlFor="password">Password</label>
                <input className="input" id="password" type="password" name="password" value={formData.password} onChange={handleChange} required minLength={6} />
              </div>
            </div>

            {/* Active Checkbox */}
            <div className="flex items-center mt-2">
              <input id="is_active" type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} className="mr-2 accent-indigo-600" />
              <label className="text-gray-700 font-semibold" htmlFor="is_active">Active</label>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end mt-6">
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-8 rounded-lg shadow-lg" type="submit" disabled={loading}>
                {loading ? 'Adding...' : 'Add User'}
              </button>
            </div>
          </form>
        </div>
        <style>
          {`
            .input {
              width: 100%;
              padding: 0.5rem 1rem;
              border: 1px solid #ccc;
              border-radius: 0.5rem;
              outline: none;
              transition: 0.3s;
              color: #22223b; /* Make input text dark */
            }
            .input:focus {
              border-color: #6366f1;
              box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
            }
            .animate-fade-in {
              animation: fadeIn 0.7s ease;
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(30px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}
        </style>
      </ProfessionalDashboard>
    </FuturisticBackground>
  );
};

export default AddUser;
