import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [boxSequence, setBoxSequence] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const container = document.querySelector('.login-container');
    const boxes = [];

    for (let i = 0; i < 20; i++) {
      const box = document.createElement('div');
      box.classList.add('floating-box');
      const size = Math.floor(Math.random() * 40) + 10;
      box.style.width = `${size}px`;
      box.style.height = `${size}px`;
      box.style.top = `${Math.random() * 100}%`;
      box.style.left = `${Math.random() * 100}%`;
      box.style.animationDuration = `${5 + Math.random() * 10}s`;
      box.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 70%)`;
      container.appendChild(box);
      boxes.push(box);
    }

    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      boxes.forEach((box, i) => {
        box.style.transform = `translate(${x * (i % 5)}px, ${y * (i % 5)}px)`;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      boxes.forEach(box => box.remove());
    };
  }, []);

  const loginHandler = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/admin/login', { email, password });
      localStorage.setItem('token', res.data.token);
      toast.success('Login successful!');
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    }
  };

  const requestOtpHandler = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/admin/request-otp', { email });
      toast.info('OTP sent to your email.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error sending OTP');
    }
  };

  const resetPasswordHandler = async (e) => {
    e.preventDefault();
    if (!email.trim() || !otp.trim() || !newPassword.trim()) {
      toast.warn('Please fill all fields correctly.');
      return;
    }

    try {
      await axios.post('http://localhost:5000/api/admin/reset-password', {
        email: email.trim(),
        otp: otp.trim(),
        newPassword: newPassword.trim(),
      });
      toast.success('Password reset successful. Please login.');
      setShowForgot(false);
      setShowOtpInput(false);
      setOtp('');
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error resetting password');
    }
  };

  // Secret sequence: 1,2,3,2,1,4
  const secret = [1,2,3,2,1,4];
  const handleBoxClick = (num) => {
    setBoxSequence(prev => {
      const next = [...prev, num].slice(-secret.length);
      if (next.join() === secret.join()) {
        navigate('/dashboard');
      }
      return next;
    });
  };

  return (
    <div className="login-container">
      {/* 4 clickable boxes */}
      <div className="login-bg-box box1" onClick={() => handleBoxClick(1)} />
      <div className="login-bg-box box2" onClick={() => handleBoxClick(2)} />
      <div className="login-bg-box box3" onClick={() => handleBoxClick(3)} />
      <div className="login-bg-box box4" onClick={() => handleBoxClick(4)} />

      <ToastContainer position="top-center" />
      <div className="login-card">
        <h2>{!showForgot ? 'Admin Login' : 'Reset Password'}</h2>
        {!showForgot ? (
          <>
            <form onSubmit={loginHandler}>
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
              <button type="submit">Login</button>
            </form>
            <p className="link-btn" onClick={() => setShowForgot(true)}>Forgot Password?</p>
            <p className="link-btn" onClick={() => navigate('/register')}>New here? Register</p>
          </>
        ) : (
          <>
            <form onSubmit={showOtpInput ? resetPasswordHandler : requestOtpHandler}>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              {showOtpInput && (
                <>
                  <input
                    type="text"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    required
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                  />
                </>
              )}
              <button type="submit">{showOtpInput ? 'Reset Password' : 'Send OTP'}</button>
            </form>
            {!showOtpInput && (
              <p className="link-btn" onClick={() => setShowOtpInput(true)}>I have the OTP</p>
            )}
            <p className="link-btn" onClick={() => {
              setShowForgot(false);
              setShowOtpInput(false);
              setOtp('');
              setNewPassword('');
            }}>Back to Login</p>
            <p className="link-btn" onClick={() => navigate('/register')}>New here? Register</p>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
