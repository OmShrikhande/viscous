/**
 * Excel Service for Bus Tracking System
 * 
 * This service handles:
 * 1. Daily distance tracking with dates
 * 2. Route information logging
 * 3. Stop arrival times and data
 * 4. Bus performance metrics
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

class ExcelService {
  constructor() {
    this.excelDir = path.join(__dirname, '../excel-reports');
    this.dailyReportFile = path.join(this.excelDir, 'daily-bus-tracking.xlsx');
    this.stopReportFile = path.join(this.excelDir, 'stop-arrival-log.xlsx');
    
    // Ensure directory exists
    this.ensureDirectoryExists();
  }

  ensureDirectoryExists() {
    if (!fs.existsSync(this.excelDir)) {
      fs.mkdirSync(this.excelDir, { recursive: true });
      console.log(`✅ Created Excel reports directory: ${this.excelDir}`);
    }
  }

  /**
   * Get current date in IST format (YYYY-MM-DD)
   */
  getCurrentISTDate() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istTime = new Date(now.getTime() + istOffset);
    return istTime.toISOString().slice(0, 10);
  }

  /**
   * Get current time in IST format (HH:MM:SS)
   */
  getCurrentISTTime() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    return istTime.toISOString().slice(11, 19);
  }

  /**
   * Log daily distance data to Excel
   */
  async logDailyDistance(data) {
    try {
      const date = this.getCurrentISTDate();
      const time = this.getCurrentISTTime();
      
      let workbook;
      let worksheet;
      
      // Check if file exists
      if (fs.existsSync(this.dailyReportFile)) {
        workbook = XLSX.readFile(this.dailyReportFile);
        worksheet = workbook.Sheets['Daily Tracking'] || workbook.Sheets[workbook.SheetNames[0]];
      } else {
        // Create new workbook
        workbook = XLSX.utils.book_new();
        worksheet = XLSX.utils.aoa_to_sheet([
          ['Date', 'Time', 'Route Number', 'Daily Distance (km)', 'Total Distance (km)', 'Latitude', 'Longitude', 'Speed (km/h)', 'Status', 'Remarks']
        ]);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Tracking');
      }

      // Convert worksheet to array of arrays
      const wsData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      
      // Find if entry for today already exists
      let todayRowIndex = -1;
      for (let i = 1; i < wsData.length; i++) {
        if (wsData[i][0] === date) {
          todayRowIndex = i;
          break;
        }
      }

      const newRowData = [
        date,
        time,
        data.routeNumber || 'Route-1',
        data.dailyDistance ? parseFloat(data.dailyDistance).toFixed(2) : '0.00',
        data.totalDistance ? parseFloat(data.totalDistance).toFixed(2) : '0.00',
        data.latitude ? parseFloat(data.latitude).toFixed(6) : '',
        data.longitude ? parseFloat(data.longitude).toFixed(6) : '',
        data.speed ? parseFloat(data.speed).toFixed(2) : '0.00',
        data.status || 'Active',
        data.remarks || `Updated at ${time}`
      ];

      if (todayRowIndex !== -1) {
        // Update existing row
        wsData[todayRowIndex] = newRowData;
      } else {
        // Add new row
        wsData.push(newRowData);
      }

      // Convert back to worksheet
      const newWorksheet = XLSX.utils.aoa_to_sheet(wsData);
      
      // Set column widths
      newWorksheet['!cols'] = [
        { wch: 12 }, // Date
        { wch: 10 }, // Time
        { wch: 12 }, // Route Number
        { wch: 15 }, // Daily Distance
        { wch: 15 }, // Total Distance
        { wch: 12 }, // Latitude
        { wch: 12 }, // Longitude
        { wch: 12 }, // Speed
        { wch: 10 }, // Status
        { wch: 20 }  // Remarks
      ];

      // Update workbook
      workbook.Sheets['Daily Tracking'] = newWorksheet;
      
      // Write file
      XLSX.writeFile(workbook, this.dailyReportFile);
      
      console.log(`✅ Daily distance logged to Excel: ${data.dailyDistance}km on ${date}`);
      return true;
    } catch (error) {
      console.error('❌ Error logging daily distance to Excel:', error);
      return false;
    }
  }

  /**
   * Log stop arrival data to Excel
   */
  async logStopArrival(stopData) {
    try {
      const date = this.getCurrentISTDate();
      const time = this.getCurrentISTTime();
      
      let workbook;
      let worksheet;
      
      // Check if file exists
      if (fs.existsSync(this.stopReportFile)) {
        workbook = XLSX.readFile(this.stopReportFile);
        worksheet = workbook.Sheets['Stop Arrivals'] || workbook.Sheets[workbook.SheetNames[0]];
      } else {
        // Create new workbook
        workbook = XLSX.utils.book_new();
        worksheet = XLSX.utils.aoa_to_sheet([
          ['Date', 'Time', 'Stop ID', 'Stop Name', 'Route Number', 'Arrival Time', 'Latitude', 'Longitude', 'Distance from Stop (m)', 'Status', 'Remarks']
        ]);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Stop Arrivals');
      }

      // Convert worksheet to array of arrays
      const wsData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      
      const newRowData = [
        date,
        time,
        stopData.stopId || '',
        stopData.stopName || '',
        stopData.routeNumber || 'Route-1',
        stopData.arrivalTime || time,
        stopData.latitude ? parseFloat(stopData.latitude).toFixed(6) : '',
        stopData.longitude ? parseFloat(stopData.longitude).toFixed(6) : '',
        stopData.distanceFromStop ? parseFloat(stopData.distanceFromStop).toFixed(2) : '',
        stopData.status || 'Reached',
        stopData.remarks || `Bus reached ${stopData.stopName || 'stop'}`
      ];

      // Add new row
      wsData.push(newRowData);

      // Convert back to worksheet
      const newWorksheet = XLSX.utils.aoa_to_sheet(wsData);
      
      // Set column widths
      newWorksheet['!cols'] = [
        { wch: 12 }, // Date
        { wch: 10 }, // Time
        { wch: 8 },  // Stop ID
        { wch: 20 }, // Stop Name
        { wch: 12 }, // Route Number
        { wch: 12 }, // Arrival Time
        { wch: 12 }, // Latitude
        { wch: 12 }, // Longitude
        { wch: 15 }, // Distance from Stop
        { wch: 10 }, // Status
        { wch: 25 }  // Remarks
      ];

      // Update workbook
      workbook.Sheets['Stop Arrivals'] = newWorksheet;
      
      // Write file
      XLSX.writeFile(workbook, this.stopReportFile);
      
      console.log(`✅ Stop arrival logged to Excel: ${stopData.stopName} at ${time} on ${date}`);
      return true;
    } catch (error) {
      console.error('❌ Error logging stop arrival to Excel:', error);
      return false;
    }
  }

  /**
   * Get daily summary from Excel
   */
  async getDailySummary(date = null) {
    try {
      if (!fs.existsSync(this.dailyReportFile)) {
        return null;
      }

      const targetDate = date || this.getCurrentISTDate();
      const workbook = XLSX.readFile(this.dailyReportFile);
      const worksheet = workbook.Sheets['Daily Tracking'] || workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      const dailyData = data.find(row => row.Date === targetDate);
      return dailyData || null;
    } catch (error) {
      console.error('❌ Error reading daily summary from Excel:', error);
      return null;
    }
  }

  /**
   * Get stop arrivals for a specific date
   */
  async getStopArrivals(date = null) {
    try {
      if (!fs.existsSync(this.stopReportFile)) {
        return [];
      }

      const targetDate = date || this.getCurrentISTDate();
      const workbook = XLSX.readFile(this.stopReportFile);
      const worksheet = workbook.Sheets['Stop Arrivals'] || workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      const stopArrivals = data.filter(row => row.Date === targetDate);
      return stopArrivals || [];
    } catch (error) {
      console.error('❌ Error reading stop arrivals from Excel:', error);
      return [];
    }
  }

  /**
   * Generate monthly report
   */
  async generateMonthlyReport(year, month) {
    try {
      const monthlyReportFile = path.join(this.excelDir, `monthly-report-${year}-${month.toString().padStart(2, '0')}.xlsx`);
      
      // Read daily data
      if (!fs.existsSync(this.dailyReportFile)) {
        console.log('No daily data available for monthly report');
        return false;
      }

      const workbook = XLSX.readFile(this.dailyReportFile);
      const worksheet = workbook.Sheets['Daily Tracking'] || workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      // Filter data for the specific month
      const monthlyData = data.filter(row => {
        const rowDate = new Date(row.Date);
        return rowDate.getFullYear() === year && (rowDate.getMonth() + 1) === month;
      });

      if (monthlyData.length === 0) {
        console.log(`No data found for ${year}-${month}`);
        return false;
      }

      // Create monthly report workbook
      const monthlyWorkbook = XLSX.utils.book_new();
      
      // Add daily data sheet
      const dailySheet = XLSX.utils.json_to_sheet(monthlyData);
      XLSX.utils.book_append_sheet(monthlyWorkbook, dailySheet, 'Daily Data');
      
      // Create summary sheet
      const totalDistance = monthlyData.reduce((sum, row) => {
        const dailyDist = parseFloat(row['Daily Distance (km)']) || 0;
        return sum + dailyDist;
      }, 0);
      
      const averageDistance = totalDistance / monthlyData.length;
      const maxDistance = Math.max(...monthlyData.map(row => parseFloat(row['Daily Distance (km)']) || 0));
      const minDistance = Math.min(...monthlyData.map(row => parseFloat(row['Daily Distance (km)']) || 0));
      
      const summaryData = [
        ['Metric', 'Value'],
        ['Month', `${year}-${month.toString().padStart(2, '0')}`],
        ['Total Days', monthlyData.length],
        ['Total Distance (km)', totalDistance.toFixed(2)],
        ['Average Daily Distance (km)', averageDistance.toFixed(2)],
        ['Maximum Daily Distance (km)', maxDistance.toFixed(2)],
        ['Minimum Daily Distance (km)', minDistance.toFixed(2)]
      ];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(monthlyWorkbook, summarySheet, 'Summary');
      
      // Write monthly report
      XLSX.writeFile(monthlyWorkbook, monthlyReportFile);
      
      console.log(`✅ Monthly report generated: ${monthlyReportFile}`);
      return monthlyReportFile;
    } catch (error) {
      console.error('❌ Error generating monthly report:', error);
      return false;
    }
  }

  /**
   * Get Excel file paths for download
   */
  getExcelFilePaths() {
    return {
      dailyReport: this.dailyReportFile,
      stopReport: this.stopReportFile,
      reportsDirectory: this.excelDir
    };
  }
}

module.exports = new ExcelService();