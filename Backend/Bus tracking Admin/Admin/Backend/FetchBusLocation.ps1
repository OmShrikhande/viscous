# Bus Location Data Fetcher
# This script fetches bus location data for a specific date

# Configuration
$port = 5000
$busId = "bus-1"
$date = "2023-06-01"  # Use a past date where data might exist

# Function to fetch bus location data
function Get-BusLocationData {
    param (
        [string]$BusId,
        [string]$Date,
        [int]$Port
    )
    
    $url = "http://localhost:${Port}/api/bus-location/${BusId}/history?date=${Date}"
    
    Write-Host "Fetching bus location data:" -ForegroundColor Cyan
    Write-Host "  Bus ID: $BusId" -ForegroundColor Cyan
    Write-Host "  Date:   $Date" -ForegroundColor Cyan
    Write-Host "  URL:    $url" -ForegroundColor Cyan
    Write-Host ""
    
    try {
        $response = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 10
        
        if ($response.success -eq $true) {
            if ($response.locations -and $response.locations.Count -gt 0) {
                Write-Host "Found $($response.locations.Count) location records" -ForegroundColor Green
                
                # Get the latest location
                $latestLocation = $response.locations | Sort-Object -Property timestamp -Descending | Select-Object -First 1
                
                Write-Host "`nLatest Location Data:" -ForegroundColor Yellow
                Write-Host "----------------------------------------" -ForegroundColor Yellow
                Write-Host "Latitude:  $($latestLocation.latitude)" -ForegroundColor White
                Write-Host "Longitude: $($latestLocation.longitude)" -ForegroundColor White
                Write-Host "Timestamp: $($latestLocation.timestamp)" -ForegroundColor White
                if ($latestLocation.speed) {
                    Write-Host "Speed:     $($latestLocation.speed) km/h" -ForegroundColor White
                }
                
                # Return all locations for further processing if needed
                return $response.locations
            } else {
                Write-Host "No location data found for the specified date." -ForegroundColor Yellow
                Write-Host "Try a different date where data exists." -ForegroundColor Yellow
                return $null
            }
        } else {
            Write-Host "API request failed: $($response.message)" -ForegroundColor Red
            return $null
        }
    } catch {
        Write-Host "Error fetching bus location data: $_" -ForegroundColor Red
        Write-Host "Make sure the server is running on port $Port" -ForegroundColor Red
        return $null
    }
}

# Main script execution
Write-Host "Bus Location Data Fetcher" -ForegroundColor Magenta
Write-Host "=========================" -ForegroundColor Magenta
Write-Host ""

# Check if server is running
try {
    $serverCheck = Invoke-RestMethod -Uri "http://localhost:${port}/api/config" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
    Write-Host "Server is running on port $port" -ForegroundColor Green
} catch {
    Write-Host "Server does not appear to be running on port $port" -ForegroundColor Red
    Write-Host "Please start the server before running this script" -ForegroundColor Red
    exit
}

# Fetch data for the specified date
$locationData = Get-BusLocationData -BusId $busId -Date $date -Port $port

# If no data found, try a different date
if ($null -eq $locationData) {
    Write-Host "`nTrying with a different date..." -ForegroundColor Yellow
    $alternateDate = "2023-05-01"
    Write-Host "Attempting with date: $alternateDate" -ForegroundColor Yellow
    $locationData = Get-BusLocationData -BusId $busId -Date $alternateDate -Port $port
}

# If still no data, try with mock data date
if ($null -eq $locationData) {
    Write-Host "`nTrying with mock data date..." -ForegroundColor Yellow
    $mockDate = "2023-01-01"
    Write-Host "Attempting with date: $mockDate" -ForegroundColor Yellow
    $locationData = Get-BusLocationData -BusId $busId -Date $mockDate -Port $port
}

Write-Host "`nScript execution complete" -ForegroundColor Magenta
