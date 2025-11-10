import puppeteer from 'puppeteer';
import { VoucherPdfData } from '../types/voucher';

// Helper function to format date (DD-MM-YYYY)
function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return 'N/A';
  }
}

// Helper function to format time (HH:MM)
function formatTime(timeString: string): string {
  if (!timeString) return 'N/A';
  if (timeString.includes('T')) {
    const timePart = timeString.split('T')[1];
    return timePart ? timePart.slice(0, 5) : 'N/A';
  }
  if (timeString.includes(':')) {
    return timeString.slice(0, 5);
  }
  return 'N/A';
}

// Generate HTML template for voucher
function generateVoucherHTML(data: VoucherPdfData): string {
  const providerName = data.umrahVisaProvider?.partyName || 'UMRA SERVICES';
  const address = data.umrahVisaProvider?.address || 'JEDDAH - SAUDI ARABIA';
  const contactNumber = data.umrahVisaProvider?.contactNumber || data.umrahVisaProvider?.whatsappNumber || '+966 538634100';
  const email = data.umrahVisaProvider?.email || 'info@test.com.sa';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Travel Voucher - ${data.voucherNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: A4;
      margin: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #ffffff;
      color: #1e293b;
      line-height: 1.6;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .voucher-container {
      width: 210mm;
      min-height: 297mm;
      background: #ffffff;
      position: relative;
    }

    /* Header Section */
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
      color: #ffffff;
      padding: 30px 20px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: #3b82f6;
    }

    .header h1 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 10px;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .header .address {
      font-size: 13px;
      margin-bottom: 8px;
      opacity: 0.95;
    }

    .header .contact {
      font-size: 11px;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 15px;
      flex-wrap: wrap;
      margin-top: 10px;
    }

    .header .contact span {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    /* Reservation Details Card */
    .reservation-card {
      margin: 20px;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border: 1px solid #e2e8f0;
      overflow: hidden;
      position: relative;
    }

    .reservation-card::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 5px;
      background: #3b82f6;
    }

    .card-header {
      padding: 15px 20px;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .card-header h2 {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .card-content {
      padding: 20px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .info-label {
      font-size: 9px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-value {
      font-size: 11px;
      font-weight: 500;
      color: #1e293b;
    }

    /* Section Title */
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin: 25px 20px 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Tables */
    .table-container {
      margin: 0 20px 25px;
      overflow: hidden;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      background: #ffffff;
    }

    thead {
      background: #0f172a;
      color: #ffffff;
    }

    thead th {
      padding: 12px 10px;
      text-align: left;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    tbody tr {
      border-bottom: 1px solid #e2e8f0;
    }

    tbody tr:nth-child(even) {
      background: #f8fafc;
    }

    tbody td {
      padding: 10px;
      font-size: 9px;
      color: #1e293b;
    }

    tbody td:first-child {
      text-align: center;
      font-weight: 600;
    }

    /* Footer */
    .footer {
      margin-top: 30px;
      padding: 20px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      text-align: center;
    }

    .footer p {
      font-size: 9px;
      color: #64748b;
      margin: 3px 0;
    }

    /* Print Styles */
    @media print {
      body {
        margin: 0;
        padding: 0;
      }

      .voucher-container {
        width: 210mm;
        min-height: 297mm;
      }

      .header {
        page-break-after: avoid;
      }

      .reservation-card,
      .table-container {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="voucher-container">
    <!-- Header -->
    <div class="header">
      <h1>${providerName.toUpperCase()}</h1>
      <div class="address">📍 ${address.toUpperCase()}</div>
      <div class="contact">
        <span>📞 ${contactNumber}</span>
        <span style="opacity: 0.5;">•</span>
        <span>✉ ${email}</span>
      </div>
    </div>

    <!-- Reservation Details -->
    <div class="reservation-card">
      <div class="card-header">
        <h2>📋 RESERVATION DETAILS</h2>
      </div>
      <div class="card-content">
        <div class="info-item">
          <div class="info-label">Reservation Number</div>
          <div class="info-value">${data.reservationNumber || data.voucherNumber || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Number of Passengers</div>
          <div class="info-value">ADT: ${data.paxCount} | CHD: 0 | INF: 0 = ${data.paxCount}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Reservation Date</div>
          <div class="info-value">${formatDate(data.reservationDate)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Guest Name</div>
          <div class="info-value">${data.guestName || 'N/A'}</div>
        </div>
        <div class="info-item"></div>
        <div class="info-item">
          <div class="info-label">Guest Mobile</div>
          <div class="info-value">${data.guestMobile || 'N/A'}</div>
        </div>
        <div class="info-item"></div>
        <div class="info-item"></div>
        <div class="info-item">
          <div class="info-label">Group Code</div>
          <div class="info-value">${data.groupCode || 'N/A'}</div>
        </div>
      </div>
    </div>

    ${data.hotelSchedules && data.hotelSchedules.length > 0 ? `
    <!-- Hotel Schedules -->
    <div class="section-title">🏨 HOTEL SCHEDULES</div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Location</th>
            <th>Hotel Name</th>
            <th>Days</th>
            <th>Check In</th>
            <th>Check Out</th>
          </tr>
        </thead>
        <tbody>
          ${data.hotelSchedules.map((hotel) => `
            <tr>
              <td>${hotel.number}</td>
              <td>${hotel.location || 'N/A'}</td>
              <td>${hotel.hotelName || 'N/A'}</td>
              <td>${hotel.days}</td>
              <td>${formatDate(hotel.checkIn)}</td>
              <td>${formatDate(hotel.checkOut)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    ${data.movementDetails && data.movementDetails.length > 0 ? `
    <!-- Movement Details -->
    <div class="section-title">🚌 MOVEMENT DETAILS</div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Sr</th>
            <th>Route</th>
            <th>Date</th>
            <th>Time</th>
            <th>From Location</th>
            <th>To Location</th>
          </tr>
        </thead>
        <tbody>
          ${data.movementDetails.map((movement) => `
            <tr>
              <td>${movement.sr}</td>
              <td>${movement.route || 'Auto'}</td>
              <td>${formatDate(movement.date)}</td>
              <td>${formatTime(movement.time)}</td>
              <td>${movement.from ? `${movement.from}${movement.fromLocation ? `, ${movement.fromLocation}` : ''}` : 'N/A'}</td>
              <td>${movement.to ? `${movement.to}${movement.toLocation ? `, ${movement.toLocation}` : ''}` : 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    ${data.flightDetails && data.flightDetails.length > 0 ? `
    <!-- Flight Details -->
    <div class="section-title">✈️ FLIGHT DETAILS</div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Date</th>
            <th>Carrier</th>
            <th>Number</th>
            <th>From</th>
            <th>To</th>
            <th>ETD</th>
            <th>ETA</th>
          </tr>
        </thead>
        <tbody>
          ${data.flightDetails.map((flight) => `
            <tr>
              <td>${flight.type || 'N/A'}</td>
              <td>${formatDate(flight.date)}</td>
              <td>${flight.carrier || 'N/A'}</td>
              <td>${flight.number || 'N/A'}</td>
              <td>${flight.from || 'N/A'}</td>
              <td>${flight.to || 'N/A'}</td>
              <td>${formatTime(flight.etd)}</td>
              <td>${formatTime(flight.eta)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      <p><strong>Generated by Moulavi ERP</strong></p>
      <p>This document is system generated. Terms and conditions apply.</p>
    </div>
  </div>
</body>
</html>
  `;
}

// Helper to find Chrome/Chromium executable (Windows, Linux, macOS)
function findChromeExecutable(): string | undefined {
  const fs = require('fs');
  const os = require('os');
  const platform = os.platform();

  // Check environment variable first (useful for production)
  if (process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH) {
    const envPath = process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
    if (fs.existsSync(envPath!)) {
      return envPath!;
    }
  }

  // Platform-specific paths
  const possiblePaths: string[] = [];

  if (platform === 'win32') {
    // Windows paths
    possiblePaths.push(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
      process.env.PROGRAMFILES + '\\Google\\Chrome\\Application\\chrome.exe',
      process.env['PROGRAMFILES(X86)'] + '\\Google\\Chrome\\Application\\chrome.exe',
    );
  } else if (platform === 'linux') {
    // Linux paths (common production locations)
    possiblePaths.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
    );
  } else if (platform === 'darwin') {
    // macOS paths
    possiblePaths.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    );
  }

  // Check each path
  for (const path of possiblePaths.filter(Boolean)) {
    if (fs.existsSync(path)) {
      return path;
    }
  }

  return undefined; // Will use bundled Chromium
}

// Generate PDF from HTML using Puppeteer
export async function generateVoucherPDF(data: VoucherPdfData): Promise<Buffer> {
  let browser;
  try {
    // Try to use system Chrome first (more reliable on Windows)
    const chromePath = findChromeExecutable();
    
    const launchOptions: any = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--single-process',
      ],
      timeout: 60000,
    };

    // Use system Chrome/Chromium if available, otherwise use bundled Chromium
    // In production (Linux), bundled Chromium usually works fine
    if (chromePath) {
      console.log('Using system browser:', chromePath);
      launchOptions.executablePath = chromePath;
    } else {
      console.log('Using bundled Chromium (default)');
      // On Linux production, bundled Chromium should work without issues
      // The ICU error is primarily a Windows development issue
    }

    // Launch browser
    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();

    // Generate HTML
    const html = generateVoucherHTML(data);

    // Set content and wait for fonts/styles to load
    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm',
      },
      preferCSSPageSize: true,
    });

    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

