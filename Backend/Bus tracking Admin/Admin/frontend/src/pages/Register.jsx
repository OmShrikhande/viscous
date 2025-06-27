import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './Login.css'; // Reuse same styling

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();

  const registerHandler = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      toast.warn('Please fill all fields.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    try {
      console.log('Attempting to register with:', { email: email.trim() });
      
      const res = await axios.post('https://viscous.onrender.com/api/admin/register', {
        email: email.trim(),
        password: password.trim(),
      });

      console.log('Registration response:', res.data);
      toast.success('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      console.error('Registration error:', err);
      
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', err.response.data);
        console.error('Error response status:', err.response.status);
        toast.error(err.response.data?.message || `Error ${err.response.status}: Registration failed`);
      } else if (err.request) {
        // The request was made but no response was received
        console.error('No response received:', err.request);
        toast.error('Server not responding. Please try again later.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Request setup error:', err.message);
        toast.error('Error setting up request: ' + err.message);
      }
    }
  };

  return (
    <div className="login-container">
      <ToastContainer position="top-center" />
      <div className="login-card">
        <img src="./../../public/logo192.png" alt="App Logo" className="login-logo" />
        <h2>Admin Registration</h2>
        <form onSubmit={registerHandler}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
          />
          <button type="submit">Register</button>
        </form>
        <p className="link-btn" onClick={() => navigate('/')}>Already have an account? Login</p>
      </div>
    </div>
  );
};

export default Register;
