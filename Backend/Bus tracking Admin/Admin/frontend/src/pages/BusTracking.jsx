import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RealTimeTracking from '../components/tracking/RealTimeTracking';
import PastHistory from '../components/tracking/PastHistory';

const BusTracking = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('realtime');

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Background with animated elements to represent tracking */}
      <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full">
          {/* Grid lines representing a map */}
          <div className="absolute inset-0" style={{ 
            backgroundImage: `
              linear-gradient(to right, rgba(99, 102, 241, 0.2) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(99, 102, 241, 0.2) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}></div>
          
          {/* Animated circles representing signals */}
          <div className="absolute left-1/4 top-1/3">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
          </div>
          <div className="absolute right-1/3 top-2/3">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
          </div>
          <div className="absolute left-2/3 top-1/4">
            <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
            <div className="absolute inset-0 bg-purple-500 rounded-full animate-ping opacity-75"></div>
          </div>
        </div>
      </div>

      {/* Header with back button */}
      <header className="relative z-10 bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-full hover:bg-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold">Bus Tracking System</h1>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-green-500 w-2 h-2 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-400">Live System</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 container mx-auto px-4 py-6">
        {/* Tracking mode selector */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 mb-6 border border-gray-700 shadow-lg">
          <div className="flex justify-center">
            <div className="inline-flex rounded-lg overflow-hidden">
              <button
                className={`px-6 py-3 font-medium ${
                  activeTab === 'realtime'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                } transition-colors duration-200`}
                onClick={() => setActiveTab('realtime')}
              >
                <div className="flex items-center space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span>Real-Time Tracking</span>
                </div>
              </button>
              <button
                className={`px-6 py-3 font-medium ${
                  activeTab === 'history'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                } transition-colors duration-200`}
                onClick={() => setActiveTab('history')}
              >
                <div className="flex items-center space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  <span>Past History</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Content based on selected tab */}
        {activeTab === 'realtime' ? (
          <RealTimeTracking />
        ) : (
          <PastHistory />
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-gray-800/50 backdrop-blur-sm border-t border-gray-700 py-4 mt-6">
        <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
          <p>Bus Tracking System &copy; {new Date().getFullYear()} | Real-time GPS Monitoring</p>
        </div>
      </footer>
    </div>
  );
};

export default BusTracking;
