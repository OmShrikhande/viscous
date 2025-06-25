import React from 'react';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatTime = (timeStr) => {
  if (!timeStr) return 'N/A';
  const d = new Date(timeStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getStatusClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'present':
      return 'text-green-600 font-bold';
    case 'absent':
      return 'text-red-600 font-bold';
    case 'halfday':
      return 'text-yellow-600 font-bold';
    default:
      return 'text-gray-700';
  }
};

const UserAttenednce = ({ attendance, loading }) => {
  if (loading) {
    return <div>Loading attendance...</div>;
  }
  if (!attendance || attendance.length === 0) {
    return <div>No attendance records found.</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left">
        <thead>
          <tr>
            <th className="py-2 px-4">Date</th>
            <th className="py-2 px-4">Status</th>
            <th className="py-2 px-4">Check In</th>
            <th className="py-2 px-4">Check Out</th>
            
            <th className="py-2 px-4">Location</th>
            {/* Add more columns if your data has more fields */}
          </tr>
        </thead>
        <tbody>
          {attendance.map((att, idx) => (
            <tr key={idx}>
              <td className="py-2 px-4">{formatDate(att.date)}</td>
              <td className={`py-2 px-4 ${getStatusClass(att.status)}`}>
                {att.status ? att.status.charAt(0).toUpperCase() + att.status.slice(1) : ''}
              </td>
              <td className="py-2 px-4">{formatTime(att.loginTime)}</td>
              <td className="py-2 px-4">{formatTime(att.logoutTime)}</td>
              <td className="py-2 px-4">
                {att.location
                  ? att.location.isInOffice
                    ? 'At Office'
                    : 'Not At Office'
                  : 'N/A'}
              </td>
              {/* Add more cells if needed */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserAttenednce;