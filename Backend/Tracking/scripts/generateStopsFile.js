/**
 * Generate Stops File
 * 
 * This script reads the Excel file and generates a text file with the stop data.
 * It can be run manually to update the stops data file.
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Path to the Excel file (relative to project root)
const EXCEL_FILE_PATH = path.join(__dirname, '../../Route2.xlsx');

// Path to the output text file
const OUTPUT_FILE_PATH = path.join(__dirname, '../data/stops.txt');

/**
 * Read the Excel file and generate a text file with the stop data
 */
const generateStopsFile = async () => {
  try {
    console.log('Reading Excel file...');
    
    // Check if the Excel file exists
    if (!fs.existsSync(EXCEL_FILE_PATH)) {
      console.error(`Excel file not found at ${EXCEL_FILE_PATH}`);
      return;
    }
    
    // Read the Excel file
    const workbook = XLSX.readFile(EXCEL_FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert the worksheet to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`Found ${data.length} stops in Excel file`);
    
    // Create the output directory if it doesn't exist
    const outputDir = path.dirname(OUTPUT_FILE_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Format the data for the text file
    let textContent = 'STOP ID,LATITUDE,LONGITUDE,NAME,DESCRIPTION\n';
    
    data.forEach(stop => {
      const id = stop.ID || 'unknown';
      const lat = stop.Latitude || 0;
      const lng = stop.Longitude || 0;
      const name = stop.Name || '';
      const desc = stop.Description || '';
      
      textContent += `${id},${lat},${lng},${name},${desc}\n`;
    });
    
    // Write the data to the text file
    fs.writeFileSync(OUTPUT_FILE_PATH, textContent, 'utf8');
    
    console.log(`Stops data written to ${OUTPUT_FILE_PATH}`);
    
    // Also create a JSON file for easier parsing
    const jsonFilePath = OUTPUT_FILE_PATH.replace('.txt', '.json');
    fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 2), 'utf8');
    
    console.log(`Stops data also written to ${jsonFilePath}`);
    
    // Create a human-readable formatted file
    const formattedFilePath = OUTPUT_FILE_PATH.replace('.txt', '_formatted.txt');
    let formattedContent = 'BUS STOPS DATA\n';
    formattedContent += '==============\n\n';
    
    data.forEach((stop, index) => {
      formattedContent += `Stop #${index + 1}: ${stop.Name || stop.ID || 'Unknown'}\n`;
      formattedContent += `  ID: ${stop.ID || 'N/A'}\n`;
      formattedContent += `  Coordinates: ${stop.Latitude || 0}, ${stop.Longitude || 0}\n`;
      if (stop.Description) {
        formattedContent += `  Description: ${stop.Description}\n`;
      }
      formattedContent += '\n';
    });
    
    fs.writeFileSync(formattedFilePath, formattedContent, 'utf8');
    
    console.log(`Formatted stops data written to ${formattedFilePath}`);
    
  } catch (error) {
    console.error('Error generating stops file:', error);
  }
};

// Run the function
generateStopsFile()
  .then(() => {
    console.log('Done!');
  })
  .catch(error => {
    console.error('Error:', error);
  });