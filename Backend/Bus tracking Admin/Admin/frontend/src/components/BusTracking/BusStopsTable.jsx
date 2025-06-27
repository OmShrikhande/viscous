import React, { useState } from 'react';

const BusStopsTable = ({ busStops }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sort bus stops by sequence number if available, otherwise keep original order
  const sortedStops = [...busStops].sort((a, b) => {
    if (a.sequence && b.sequence) {
      return a.sequence - b.sequence;
    }
    return 0;
  });
  
  // Filter stops based on search term
  const filteredStops = sortedStops.filter(stop => 
    stop.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Calculate statistics
  const totalStops = sortedStops.length;
  
  return (
    <div className="w-full">
      {/* Search and statistics */}
      <div className="p-3 bg-black/30 border-b border-white/20">
        <input
          type="text"
          placeholder="Search stops..."
          className="w-full p-2 bg-white/10 border border-white/30 rounded-md mb-3 text-white placeholder-blue-200/70 focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        <div className="text-sm text-blue-200">
          <span className="font-semibold">Total:</span> {totalStops} stops
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-white/5">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Stop Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Sequence</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Reached Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filteredStops.length > 0 ? (
              filteredStops.map((stop, index) => (
                <tr key={stop.id || index} className={index % 2 === 0 ? 'bg-white/5' : 'bg-white/10'}>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-white">
                    {stop.name}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-blue-200">
                    {stop.sequence || index + 1}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-blue-200">
                    <span className="bg-blue-500/20 px-2 py-1 rounded-full">
                      {stop.reachedTime || 'Not reached yet'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="px-6 py-4 text-center text-sm text-blue-200">
                  {searchTerm ? 'No matching stops found' : 'No bus stops available'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BusStopsTable;