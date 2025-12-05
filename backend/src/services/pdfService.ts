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

  // Primary red color from dashboard (#dc2626 - Tailwind red-600)
  const primaryRed = '#dc2626';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Travel Voucher - ${data.voucherNumber}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
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
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #ffffff;
      color: #1f2937;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .voucher-container {
      width: 210mm;
      min-height: 297mm;
      background: #ffffff;
    }

    /* Header Section - Gradient Red with Overlays */
    .header {
      background: linear-gradient(135deg, #c62828 0%, #e53935 100%);
      color: white;
      padding: 40px 50px;
      position: relative;
      overflow: hidden;
    }

    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -10%;
      width: 300px;
      height: 300px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 50%;
    }

    .header::after {
      content: '';
      position: absolute;
      bottom: -30%;
      left: -5%;
      width: 200px;
      height: 200px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 50%;
    }

    .header-content {
      position: relative;
      z-index: 1;
      text-align: left;
    }

    .header-content h1 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .header-content .address {
      font-size: 13px;
      margin-bottom: 12px;
      opacity: 0.95;
      font-weight: 400;
      text-transform: uppercase;
    }

    .header-content .contact {
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
      opacity: 0.9;
    }

    .header-content .contact span {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Travel Voucher Banner */
    .voucher-banner {
      background: #ffffff;
      margin: -20px auto 0;
      padding: 10px 30px;
      width: fit-content;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      position: relative;
      z-index: 10;
    }

    .voucher-banner h2 {
      font-size: 14px;
      font-weight: 700;
      color: ${primaryRed};
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 0;
    }

    /* Details Section with Red Left Border */
    .details-section {
      margin: 15px 0 0 0;
      background: #ffffff;
      border-left: 8px solid ${primaryRed};
      padding: 25px 30px;
      position: relative;
    }

    .details-content {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px 50px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .info-label {
      font-size: 7px;
      font-weight: 600;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-value {
      font-size: 10px;
      font-weight: 700;
      color: #111827;
      line-height: 1.3;
    }

    /* Section Title */
    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: #111827;
      margin: 20px 20px 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding-bottom: 6px;
      border-bottom: 2px solid ${primaryRed};
    }

    /* Tables */
    .table-container {
      margin: 0 20px 18px;
      border: 1px solid #e5e7eb;
      overflow: hidden;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      background: #ffffff;
    }

    thead {
      background: ${primaryRed};
      color: #ffffff;
    }

    thead th {
      padding: 8px 6px;
      text-align: left;
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    tbody tr {
      border-bottom: 1px solid #e5e7eb;
    }

    tbody tr:nth-child(even) {
      background: #f9fafb;
    }

    tbody tr:last-child {
      border-bottom: none;
    }

    tbody td {
      padding: 7px 6px;
      font-size: 8px;
      color: #374151;
    }

    tbody td:first-child {
      text-align: center;
      font-weight: 600;
      color: #111827;
    }

    /* Footer */
    .footer {
      margin-top: 20px;
      padding: 12px 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      background: #f9fafb;
    }

    .footer p {
      font-size: 7px;
      color: #6b7280;
      margin: 1px 0;
    }

    .footer p strong {
      color: #374151;
      font-weight: 600;
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
      <div class="header-content">
        <h1>${providerName.toUpperCase()}</h1>
        <div class="address">${address.toUpperCase()}</div>
        <div class="contact">
          <span>${contactNumber}</span>
          <span>${email}</span>
        </div>
      </div>
    </div>

    <!-- Travel Voucher Banner -->
    <div class="voucher-banner">
      <h2>TRAVEL VOUCHER</h2>
    </div>

    <!-- Details Section -->
    <div class="details-section">
      <div class="details-content">
        <div class="info-item">
          <div class="info-label">RESERVATION NUMBER</div>
          <div class="info-value">${data.voucherNumber || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">RESERVATION DATE</div>
          <div class="info-value">${formatDate(data.reservationDate)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">GROUP CODE</div>
          <div class="info-value">${data.groupCode || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">GUEST NAME</div>
          <div class="info-value">${data.guestName || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">GUEST MOBILE</div>
          <div class="info-value">${data.guestMobile || 'N/A'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">TOTAL PASSENGERS</div>
          <div class="info-value">ADT: ${data.paxCount} | CHD: 0 | INF: 0 = ${data.paxCount}</div>
        </div>
      </div>
    </div>

    ${data.hotelSchedules && data.hotelSchedules.length > 0 ? `
    <!-- Hotel Schedules -->
    <div class="section-title">HOTEL SCHEDULES</div>
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
    <div class="section-title">MOVEMENT DETAILS</div>
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
    <div class="section-title">FLIGHT DETAILS</div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Date</th>
            <th>Carrier</th>
            <th>Number</th>
            <th>Airport</th>
            <th>ETD</th>
            <th>ETA</th>
          </tr>
        </thead>
        <tbody>
          ${data.flightDetails.map((flight) => {
            // For arrival (AA), show arrival airport; for departure (AD), show departure airport
            const airport = flight.type === 'AA' 
              ? (flight.arrivalAirport || flight.from || 'N/A')
              : (flight.departureAirport || flight.to || 'N/A');
            
            return `
            <tr>
              <td>${flight.type || 'N/A'}</td>
              <td>${formatDate(flight.date)}</td>
              <td>${flight.carrier || 'N/A'}</td>
              <td>${flight.number || 'N/A'}</td>
              <td>${airport}</td>
              <td>${formatTime(flight.etd)}</td>
              <td>${formatTime(flight.eta)}</td>
            </tr>
            `;
          }).join('')}
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
// NOTE: In production, prefer bundled Chromium (comes with Puppeteer) for reliability
function findChromeExecutable(): string | undefined {
  const fs = require('fs');
  const os = require('os');
  const platform = os.platform();

  // Check environment variable first (useful for production when explicitly set)
  // If CHROME_PATH is explicitly set, use it (user knows what they're doing)
  if (process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH) {
    const envPath = process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
    if (envPath && fs.existsSync(envPath)) {
      return envPath;
    }
  }

  // For production on Linux, prefer bundled Chromium to avoid snap/installation issues
  // Only check for system Chrome if explicitly requested via USE_SYSTEM_CHROME env var
  if (platform === 'linux' && !process.env.USE_SYSTEM_CHROME) {
    // Skip system Chrome detection on Linux - use bundled Chromium
    return undefined;
  }

  // Platform-specific paths (mainly for Windows and macOS, or when USE_SYSTEM_CHROME is set)
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
  } else if (platform === 'linux' && process.env.USE_SYSTEM_CHROME) {
    // Linux paths - only check if USE_SYSTEM_CHROME is set
    // Skip chromium-browser (requires snap) and /snap/bin/chromium
    possiblePaths.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium', // Only check this if not snap-based
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
    if (path && fs.existsSync(path)) {
      // On Linux, verify it's not a snap-based chromium-browser wrapper
      if (platform === 'linux' && path.includes('chromium')) {
        try {
          const { execSync } = require('child_process');
          const realPath = execSync(`readlink -f "${path}"`, { encoding: 'utf8' }).trim();
          // If it points to snap, skip it
          if (realPath.includes('/snap/')) {
            continue;
          }
        } catch (e) {
          // If we can't check, skip to be safe
          continue;
        }
      }
      return path;
    }
  }

  return undefined; // Will use bundled Chromium (recommended for production)
}

// Generate PDF from HTML using Puppeteer
export async function generateVoucherPDF(data: VoucherPdfData): Promise<Buffer> {
  const startTime = Date.now();
  const logPrefix = '[PDF-VOUCHER]';
  let browser;
  
  console.log(`${logPrefix} ========== START: Generating Voucher PDF ==========`);
  console.log(`${logPrefix} Timestamp: ${new Date().toISOString()}`);
  console.log(`${logPrefix} Voucher Number: ${data.voucherNumber || 'N/A'}`);
  console.log(`${logPrefix} Guest Name: ${data.guestName || 'N/A'}`);
  console.log(`${logPrefix} Group Code: ${data.groupCode || 'N/A'}`);
  console.log(`${logPrefix} Hotel Schedules: ${data.hotelSchedules?.length || 0}`);
  console.log(`${logPrefix} Movement Details: ${data.movementDetails?.length || 0}`);
  console.log(`${logPrefix} Flight Details: ${data.flightDetails?.length || 0}`);
  
  try {
    // Prefer bundled Chromium for production reliability
    // Only use system Chrome if explicitly set via CHROME_PATH or USE_SYSTEM_CHROME
    console.log(`${logPrefix} Finding Chrome executable...`);
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
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-breakpad',
        '--disable-client-side-phishing-detection',
        '--disable-default-apps',
        '--disable-features=TranslateUI',
        '--disable-hang-monitor',
        '--disable-ipc-flooding-protection',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-renderer-backgrounding',
        '--disable-sync',
        '--disable-translate',
        '--metrics-recording-only',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
        '--enable-automation',
        '--password-store=basic',
        '--use-mock-keychain',
      ],
      timeout: 60000,
    };

    // Use system Chrome/Chromium only if explicitly provided
    // Otherwise use bundled Chromium (most reliable for production)
    if (chromePath) {
      console.log(`${logPrefix} ✓ Using system browser: ${chromePath}`);
      launchOptions.executablePath = chromePath;
    } else {
      console.log(`${logPrefix} ✓ Using bundled Chromium (recommended for production)`);
      console.log(`${logPrefix}   Note: Bundled Chromium is more reliable and doesn't require system installation`);
      console.log(`${logPrefix}   To use system Chrome, set CHROME_PATH or USE_SYSTEM_CHROME environment variable`);
    }

    console.log(`${logPrefix} Launching browser...`);
    const browserStartTime = Date.now();
    browser = await puppeteer.launch(launchOptions);
    const browserDuration = Date.now() - browserStartTime;
    console.log(`${logPrefix} ✓ Browser launched in ${browserDuration}ms`);

    console.log(`${logPrefix} Creating new page...`);
    const page = await browser.newPage();
    console.log(`${logPrefix} ✓ Page created`);

    console.log(`${logPrefix} Generating HTML template...`);
    const htmlStartTime = Date.now();
    const html = generateVoucherHTML(data);
    const htmlDuration = Date.now() - htmlStartTime;
    console.log(`${logPrefix} ✓ HTML generated in ${htmlDuration}ms`);
    console.log(`${logPrefix} HTML length: ${html.length} characters`);

    console.log(`${logPrefix} Setting page content and waiting for resources...`);
    const contentStartTime = Date.now();
    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });
    const contentDuration = Date.now() - contentStartTime;
    console.log(`${logPrefix} ✓ Page content loaded in ${contentDuration}ms`);

    console.log(`${logPrefix} Generating PDF...`);
    const pdfStartTime = Date.now();
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
    const pdfDuration = Date.now() - pdfStartTime;
    const totalDuration = Date.now() - startTime;
    const bufferSize = Buffer.from(pdfBuffer).length;
    
    console.log(`${logPrefix} ✅ SUCCESS: PDF generated`);
    console.log(`${logPrefix} PDF size: ${(bufferSize / 1024).toFixed(2)} KB`);
    console.log(`${logPrefix} PDF generation duration: ${pdfDuration}ms`);
    console.log(`${logPrefix} Total duration: ${totalDuration}ms`);
    console.log(`${logPrefix} ========== END: PDF Generated Successfully ==========`);

    return Buffer.from(pdfBuffer);
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`${logPrefix} ❌ EXCEPTION: Error generating PDF`);
    console.error(`${logPrefix} Duration before error: ${totalDuration}ms`);
    console.error(`${logPrefix} Error Type: ${error?.constructor?.name || 'Unknown'}`);
    console.error(`${logPrefix} Error Message: ${error?.message || 'Unknown error'}`);
    console.error(`${logPrefix} Error Stack:`, error?.stack || 'No stack trace available');
    
    if (error?.name) {
      console.error(`${logPrefix} Error Name: ${error.name}`);
    }
    
    console.error(`${logPrefix} Voucher Number: ${data.voucherNumber || 'N/A'}`);
    console.error(`${logPrefix} ========== END: Exception ==========`);
    throw new Error(`Failed to generate PDF: ${error?.message || 'Unknown error'}`);
  } finally {
    if (browser) {
      console.log(`${logPrefix} Closing browser...`);
      try {
        await browser.close();
        console.log(`${logPrefix} ✓ Browser closed`);
      } catch (closeError: any) {
        console.error(`${logPrefix} ⚠️ Error closing browser: ${closeError?.message || 'Unknown error'}`);
      }
    }
  }
}

