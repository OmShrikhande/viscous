import React, { useState, useEffect } from 'react';
import ProfessionalDashboard from '../components/dashboard/ProfessionalDashboard';
import FuturisticBackground from '../components/backgrounds/FuturisticBackground';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    general: {
      siteName: 'WebGuru Admin',
      siteDescription: 'Advanced Admin Management System',
      timezone: 'UTC',
      language: 'en',
      dateFormat: 'DD/MM/YYYY',
      theme: 'dark'
    },
    security: {
      twoFactorAuth: false,
      sessionTimeout: 30,
      passwordPolicy: 'strong',
      loginAttempts: 5,
      ipWhitelist: '',
      encryptionLevel: 'AES-256'
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: false,
      smsNotifications: false,
      weeklyReports: true,
      systemAlerts: true,
      userRegistrations: true
    },
    system: {
      maintenanceMode: false,
      debugMode: false,
      cacheEnabled: true,
      backupFrequency: 'daily',
      logLevel: 'info',
      maxFileSize: '10MB'
    }
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    // Simulate API call
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1000);
  };

  const resetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to default?')) {
      // Reset to default values
      setSettings({
        general: {
          siteName: 'WebGuru Admin',
          siteDescription: 'Advanced Admin Management System',
          timezone: 'UTC',
          language: 'en',
          dateFormat: 'DD/MM/YYYY',
          theme: 'dark'
        },
        security: {
          twoFactorAuth: false,
          sessionTimeout: 30,
          passwordPolicy: 'strong',
          loginAttempts: 5,
          ipWhitelist: '',
          encryptionLevel: 'AES-256'
        },
        notifications: {
          emailNotifications: true,
          pushNotifications: false,
          smsNotifications: false,
          weeklyReports: true,
          systemAlerts: true,
          userRegistrations: true
        },
        system: {
          maintenanceMode: false,
          debugMode: false,
          cacheEnabled: true,
          backupFrequency: 'daily',
          logLevel: 'info',
          maxFileSize: '10MB'
        }
      });
    }
  };

  const tabs = [
    { id: 'general', name: 'General', icon: '⚙️' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'notifications', name: 'Notifications', icon: '🔔' },
    { id: 'system', name: 'System', icon: '🖥️' }
  ];

  const SettingCard = ({ title, children }) => (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 
                  hover:bg-white/15 transition-all duration-300">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      {children}
    </div>
  );

  const ToggleSwitch = ({ enabled, onChange, label, description }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <div className="text-white font-medium">{label}</div>
        {description && <div className="text-gray-300 text-sm">{description}</div>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
          enabled ? 'bg-green-500' : 'bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  const InputField = ({ label, value, onChange, type = 'text', options = null }) => (
    <div className="mb-4">
      <label className="block text-white text-sm font-medium mb-2">{label}</label>
      {options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg 
                   text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {options.map(option => (
            <option key={option.value} value={option.value} className="text-black">
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg 
                   text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      )}
    </div>
  );

  return (
    <FuturisticBackground variant="settings">
      <ProfessionalDashboard>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">System Settings</h1>
              <p className="text-orange-200">Configure and customize your admin panel</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={resetSettings}
                className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 
                         text-white px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105"
              >
                🔄 Reset
              </button>
              <button
                onClick={saveSettings}
                disabled={saving}
                className={`bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 
                         text-white px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105
                         ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {saving ? '💾 Saving...' : saved ? '✅ Saved!' : '💾 Save Settings'}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-2 border border-white/20">
            <div className="flex space-x-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-orange-500 text-white shadow-lg'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="text-xl">{tab.icon}</span>
                  <span className="font-medium">{tab.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Settings Content */}
          <div className="space-y-6">
            {activeTab === 'general' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SettingCard title="Basic Information">
                  <InputField
                    label="Site Name"
                    value={settings.general.siteName}
                    onChange={(value) => handleSettingChange('general', 'siteName', value)}
                  />
                  <InputField
                    label="Site Description"
                    value={settings.general.siteDescription}
                    onChange={(value) => handleSettingChange('general', 'siteDescription', value)}
                  />
                  <InputField
                    label="Language"
                    value={settings.general.language}
                    onChange={(value) => handleSettingChange('general', 'language', value)}
                    options={[
                      { value: 'en', label: 'English' },
                      { value: 'es', label: 'Spanish' },
                      { value: 'fr', label: 'French' },
                      { value: 'de', label: 'German' }
                    ]}
                  />
                </SettingCard>

                <SettingCard title="Display Settings">
                  <InputField
                    label="Timezone"
                    value={settings.general.timezone}
                    onChange={(value) => handleSettingChange('general', 'timezone', value)}
                    options={[
                      { value: 'UTC', label: 'UTC' },
                      { value: 'EST', label: 'Eastern Time' },
                      { value: 'PST', label: 'Pacific Time' },
                      { value: 'GMT', label: 'Greenwich Mean Time' }
                    ]}
                  />
                  <InputField
                    label="Date Format"
                    value={settings.general.dateFormat}
                    onChange={(value) => handleSettingChange('general', 'dateFormat', value)}
                    options={[
                      { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                      { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                      { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
                    ]}
                  />
                  <InputField
                    label="Theme"
                    value={settings.general.theme}
                    onChange={(value) => handleSettingChange('general', 'theme', value)}
                    options={[
                      { value: 'dark', label: 'Dark Theme' },
                      { value: 'light', label: 'Light Theme' },
                      { value: 'auto', label: 'Auto (System)' }
                    ]}
                  />
                </SettingCard>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SettingCard title="Authentication">
                  <ToggleSwitch
                    enabled={settings.security.twoFactorAuth}
                    onChange={(value) => handleSettingChange('security', 'twoFactorAuth', value)}
                    label="Two-Factor Authentication"
                    description="Add an extra layer of security to admin accounts"
                  />
                  <InputField
                    label="Session Timeout (minutes)"
                    value={settings.security.sessionTimeout}
                    onChange={(value) => handleSettingChange('security', 'sessionTimeout', value)}
                    type="number"
                  />
                  <InputField
                    label="Max Login Attempts"
                    value={settings.security.loginAttempts}
                    onChange={(value) => handleSettingChange('security', 'loginAttempts', value)}
                    type="number"
                  />
                </SettingCard>

                <SettingCard title="Security Policies">
                  <InputField
                    label="Password Policy"
                    value={settings.security.passwordPolicy}
                    onChange={(value) => handleSettingChange('security', 'passwordPolicy', value)}
                    options={[
                      { value: 'weak', label: 'Weak (6+ characters)' },
                      { value: 'medium', label: 'Medium (8+ chars, mixed case)' },
                      { value: 'strong', label: 'Strong (12+ chars, symbols)' }
                    ]}
                  />
                  <InputField
                    label="Encryption Level"
                    value={settings.security.encryptionLevel}
                    onChange={(value) => handleSettingChange('security', 'encryptionLevel', value)}
                    options={[
                      { value: 'AES-128', label: 'AES-128' },
                      { value: 'AES-256', label: 'AES-256' },
                      { value: 'RSA-2048', label: 'RSA-2048' }
                    ]}
                  />
                  <InputField
                    label="IP Whitelist"
                    value={settings.security.ipWhitelist}
                    onChange={(value) => handleSettingChange('security', 'ipWhitelist', value)}
                  />
                </SettingCard>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SettingCard title="Communication Preferences">
                  <ToggleSwitch
                    enabled={settings.notifications.emailNotifications}
                    onChange={(value) => handleSettingChange('notifications', 'emailNotifications', value)}
                    label="Email Notifications"
                    description="Receive notifications via email"
                  />
                  <ToggleSwitch
                    enabled={settings.notifications.pushNotifications}
                    onChange={(value) => handleSettingChange('notifications', 'pushNotifications', value)}
                    label="Push Notifications"
                    description="Browser push notifications"
                  />
                  <ToggleSwitch
                    enabled={settings.notifications.smsNotifications}
                    onChange={(value) => handleSettingChange('notifications', 'smsNotifications', value)}
                    label="SMS Notifications"
                    description="Text message alerts for critical events"
                  />
                </SettingCard>

                <SettingCard title="Alert Types">
                  <ToggleSwitch
                    enabled={settings.notifications.systemAlerts}
                    onChange={(value) => handleSettingChange('notifications', 'systemAlerts', value)}
                    label="System Alerts"
                    description="Server and system status notifications"
                  />
                  <ToggleSwitch
                    enabled={settings.notifications.userRegistrations}
                    onChange={(value) => handleSettingChange('notifications', 'userRegistrations', value)}
                    label="User Registrations"
                    description="Notify when new users register"
                  />
                  <ToggleSwitch
                    enabled={settings.notifications.weeklyReports}
                    onChange={(value) => handleSettingChange('notifications', 'weeklyReports', value)}
                    label="Weekly Reports"
                    description="Automated weekly summary reports"
                  />
                </SettingCard>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SettingCard title="System Configuration">
                  <ToggleSwitch
                    enabled={settings.system.maintenanceMode}
                    onChange={(value) => handleSettingChange('system', 'maintenanceMode', value)}
                    label="Maintenance Mode"
                    description="Put the system in maintenance mode"
                  />
                  <ToggleSwitch
                    enabled={settings.system.debugMode}
                    onChange={(value) => handleSettingChange('system', 'debugMode', value)}
                    label="Debug Mode"
                    description="Enable detailed error logging"
                  />
                  <ToggleSwitch
                    enabled={settings.system.cacheEnabled}
                    onChange={(value) => handleSettingChange('system', 'cacheEnabled', value)}
                    label="Cache Enabled"
                    description="Enable system caching for better performance"
                  />
                </SettingCard>

                <SettingCard title="Performance & Storage">
                  <InputField
                    label="Backup Frequency"
                    value={settings.system.backupFrequency}
                    onChange={(value) => handleSettingChange('system', 'backupFrequency', value)}
                    options={[
                      { value: 'hourly', label: 'Hourly' },
                      { value: 'daily', label: 'Daily' },
                      { value: 'weekly', label: 'Weekly' },
                      { value: 'monthly', label: 'Monthly' }
                    ]}
                  />
                  <InputField
                    label="Log Level"
                    value={settings.system.logLevel}
                    onChange={(value) => handleSettingChange('system', 'logLevel', value)}
                    options={[
                      { value: 'error', label: 'Error Only' },
                      { value: 'warn', label: 'Warning & Error' },
                      { value: 'info', label: 'Info, Warning & Error' },
                      { value: 'debug', label: 'All Logs' }
                    ]}
                  />
                  <InputField
                    label="Max File Upload Size"
                    value={settings.system.maxFileSize}
                    onChange={(value) => handleSettingChange('system', 'maxFileSize', value)}
                    options={[
                      { value: '1MB', label: '1 MB' },
                      { value: '5MB', label: '5 MB' },
                      { value: '10MB', label: '10 MB' },
                      { value: '50MB', label: '50 MB' }
                    ]}
                  />
                </SettingCard>
              </div>
            )}
          </div>

          {/* System Status */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4">System Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="bg-green-500/20 rounded-xl p-4">
                  <div className="text-2xl mb-2">🟢</div>
                  <div className="text-white font-medium">Database</div>
                  <div className="text-green-300 text-sm">Connected</div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="bg-green-500/20 rounded-xl p-4">
                  <div className="text-2xl mb-2">🟢</div>
                  <div className="text-white font-medium">Server</div>
                  <div className="text-green-300 text-sm">Running</div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="bg-yellow-500/20 rounded-xl p-4">
                  <div className="text-2xl mb-2">🟡</div>
                  <div className="text-white font-medium">Cache</div>
                  <div className="text-yellow-300 text-sm">75% Full</div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="bg-green-500/20 rounded-xl p-4">
                  <div className="text-2xl mb-2">🟢</div>
                  <div className="text-white font-medium">Backup</div>
                  <div className="text-green-300 text-sm">Up to Date</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProfessionalDashboard>
    </FuturisticBackground>
  );
};

export default Settings;