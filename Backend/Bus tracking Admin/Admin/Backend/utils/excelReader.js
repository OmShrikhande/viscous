/**
 * Utility to read Excel files
 */
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

/**
 * Read data from an Excel file
 * @param {string} filePath - Path to the Excel file
 * @param {string} sheetName - Name of the sheet to read (optional)
 * @returns {Array} Array of objects representing the Excel data
 */
function readExcelFile(filePath, sheetName = null) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`Excel file not found: ${filePath}`);
      return [];
    }

    // Read the Excel file
    const workbook = XLSX.readFile(filePath);
    
    // Get the sheet name (use provided sheet name or first sheet)
    const sheet = sheetName || workbook.SheetNames[0];
    
    // Get the worksheet
    const worksheet = workbook.Sheets[sheet];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`Read ${data.length} rows from Excel file: ${filePath}`);
    return data;
  } catch (error) {
    console.error('Error reading Excel file:', error);
    return [];
  }
}

/**
 * Get bus stops from Route2 Excel file
 * @param {string} busId - Bus ID to filter stops (if applicable)
 * @returns {Array} Array of bus stop objects
 */
function getBusStopsFromExcel(busId = null) {
  // Path to the Route2 Excel file
  const route2FilePath = path.resolve(__dirname, '../../../../../Route2.xlsx');
  
  console.log(`Reading bus stops from: ${route2FilePath}`);
  
  // Read the Excel file
  const stopsData = readExcelFile(route2FilePath);
  
  // Process the data to extract stop information
  const stops = stopsData.map((row, index) => {
    return {
      id: row.ID || `stop-${index + 1}`,
      name: row.Name || row.StopName || `Stop ${index + 1}`,
      latitude: row.Latitude || row.Lat || 0,
      longitude: row.Longitude || row.Lng || 0,
      sequence: row.Sequence || index + 1,
      busId: row.BusId || row.BusID || busId || 'default',
      reached: false,
      reachedTime: null
    };
  });
  
  // Filter by bus ID if provided
  const filteredStops = busId 
    ? stops.filter(stop => stop.busId === busId || stop.busId === 'default')
    : stops;
  
  console.log(`Found ${filteredStops.length} bus stops${busId ? ` for bus ${busId}` : ''}`);
  return filteredStops;
}

module.exports = {
  readExcelFile,
  getBusStopsFromExcel
};