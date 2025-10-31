import { jsPDF } from 'jspdf';
// Import autoTable as named export (it's exported as both named and default)
import { autoTable } from 'jspdf-autotable';

// Extend jsPDF type to include autoTable and lastAutoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable?: {
      finalY: number;
    };
  }
}

interface VoucherPdfData {
  voucherNumber: string;
  reservationDate: string;
  guestName: string;
  guestMobile: string;
  groupCode: string;
  paxCount: number;
  hotelSchedules: Array<{
    number: number;
    location: string;
    hotelName: string;
    days: number;
    checkIn: string;
    checkOut: string;
  }>;
  movementDetails: Array<{
    sr: number;
    route: string;
    date: string;
    time: string;
    fromLocation: string;
    toLocation: string;
  }>;
  flightDetails: Array<{
    type: string;
    date: string;
    carrier: string;
    number: string;
    from: string;
    to: string;
    etd: string;
    eta: string;
  }>;
}

export function generateVoucherPDF(data: VoucherPdfData): void {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  });
  const pageWidth = doc.internal.pageSize.getWidth(); // A4 = 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // A4 = 297mm
  const margin = 15;
  const availableWidth = pageWidth - 2 * margin; // 210 - 30 = 180mm available for content
  const redColor = '#c62828';
  const lightGray = '#f9f9f9';
  const darkGray = '#424242';
  let yPos = 0;

  // Helper function to format date (DD-MM-YYYY)
  const formatDate = (dateString: string) => {
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
  };

  // Helper function to format time (HH:MM)
  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    if (timeString.includes('T')) {
      const timePart = timeString.split('T')[1];
      return timePart ? timePart.slice(0, 5) : 'N/A';
    }
    if (timeString.includes(':')) {
      return timeString.slice(0, 5);
    }
    return 'N/A';
  };

  // Convert hex color to RGB
  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16),
        ]
      : [198, 40, 40];
  };

  const [redR, redG, redB] = hexToRgb(redColor);

  // ========== RED HEADER BAR ==========
  doc.setFillColor(redR, redG, redB);
  doc.rect(0, 0, pageWidth, 42, 'F');
  yPos = 18;

  // Company Name in Header (White Text)
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('UMRA SERVICES', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Address (White Text, Smaller)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('JEDDAH - SAUDI ARABIA', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  // Contact Info (White Text, Even Smaller)
  doc.setFontSize(9);
  doc.text('OPERATION DEPARTMENT: +966 538634100', pageWidth / 2 - 30, yPos);
  doc.text('|', pageWidth / 2, yPos);
  doc.text('info@test.com.sa', pageWidth / 2 + 30, yPos);
  
  // ========== WATERMARK / BACKGROUND PATTERN ==========
  // Subtle watermark in light gray (drawn first so it's behind content)
  doc.setTextColor(240, 240, 240);
  doc.setFontSize(120);
  doc.setFont('helvetica', 'bold');
  doc.text('TEST', pageWidth / 2, pageHeight / 2, {
    align: 'center',
    angle: -45,
  });
  doc.setTextColor(0, 0, 0);

  // ========== RESERVATION SUMMARY CARD ==========
  yPos = 52;
  
  // Card background with border
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(255, 255, 255);
  const cardHeight = 45;
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, cardHeight, 3, 3, 'FD');
  
  // Red accent line on left
  doc.setFillColor(redR, redG, redB);
  doc.rect(margin, yPos, 4, cardHeight, 'F');

  // Card title
  yPos += 8;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(redR, redG, redB);
  doc.text('RESERVATION SUMMARY', margin + 8, yPos);

  // Card content
  yPos += 5;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  // Reservation Number
  doc.setFont('helvetica', 'bold');
  doc.text('Reservation Number:', margin + 8, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.voucherNumber, margin + 60, yPos);
  yPos += 6;

  // Reservation Date
  doc.setFont('helvetica', 'bold');
  doc.text('Reservation Date:', margin + 8, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(data.reservationDate), margin + 60, yPos);
  yPos += 6;

  // Guest Name
  doc.setFont('helvetica', 'bold');
  doc.text('Guest Name:', margin + 8, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.guestName || 'N/A', margin + 60, yPos);
  yPos += 6;

  // Number of Passengers
  doc.setFont('helvetica', 'bold');
  doc.text('Number of Passengers:', margin + 8, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(`PAX: ${data.paxCount}`, margin + 60, yPos);
  yPos += 6;

  // Guest Mobile
  doc.setFont('helvetica', 'bold');
  doc.text('Guest Mobile:', margin + 8, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.guestMobile || 'N/A', margin + 60, yPos);
  yPos += 6;

  // Group Code
  doc.setFont('helvetica', 'bold');
  doc.text('Group Code:', margin + 8, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.groupCode || 'N/A', margin + 60, yPos);

  yPos = 105;

  // ========== HOTEL SCHEDULES TABLE ==========
  if (data.hotelSchedules && data.hotelSchedules.length > 0) {
    // Section Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(redR, redG, redB);
    doc.text('HOTEL SCHEDULES', margin, yPos);
    yPos += 3;

    // Prepare hotel data for autotable
    const hotelRows = data.hotelSchedules.map((hotel) => [
      hotel.number.toString(),
      hotel.location || 'N/A',
      hotel.hotelName || 'N/A',
      hotel.days.toString(),
      formatDate(hotel.checkIn),
      formatDate(hotel.checkOut),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Location', 'Hotel Name', 'Days', 'Check In', 'Check Out']],
      body: hotelRows,
      theme: 'striped',
      tableWidth: availableWidth,
      headStyles: {
        fillColor: [198, 40, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [0, 0, 0],
        overflow: 'linebreak',
      },
      alternateRowStyles: {
        fillColor: [249, 249, 249],
      },
      margin: { left: margin, right: margin },
      styles: {
        cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
        lineWidth: 0.1,
        lineColor: [220, 220, 220],
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { cellWidth: 12 }, // #
        1: { cellWidth: 35 }, // Location
        2: { cellWidth: 50 }, // Hotel Name
        3: { cellWidth: 20 }, // Days
        4: { cellWidth: 32 }, // Check In
        5: { cellWidth: 31 }, // Check Out (total = 180mm)
      },
    });

    yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos + 50;
  }

  // ========== MOVEMENT DETAILS TABLE ==========
  if (data.movementDetails && data.movementDetails.length > 0) {
    // Section Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(redR, redG, redB);
    doc.text('MOVEMENT DETAILS', margin, yPos);
    yPos += 3;

    // Prepare movement data for autotable
    const movementRows = data.movementDetails.map((movement) => [
      movement.sr.toString(),
      movement.route || 'Auto',
      formatDate(movement.date),
      formatTime(movement.time),
      movement.fromLocation || 'N/A',
      movement.toLocation || 'N/A',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Sr', 'Route', 'Date', 'Time', 'From Location', 'To Location']],
      body: movementRows,
      theme: 'striped',
      tableWidth: availableWidth,
      headStyles: {
        fillColor: [198, 40, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [0, 0, 0],
        overflow: 'linebreak',
      },
      alternateRowStyles: {
        fillColor: [249, 249, 249],
      },
      margin: { left: margin, right: margin },
      styles: {
        cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
        lineWidth: 0.1,
        lineColor: [220, 220, 220],
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { cellWidth: 12 }, // Sr
        1: { cellWidth: 25 }, // Route
        2: { cellWidth: 28 }, // Date
        3: { cellWidth: 22 }, // Time
        4: { cellWidth: 48 }, // From Location
        5: { cellWidth: 45 }, // To Location (total = 180mm)
      },
    });

    yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos + 50;
  }

  // Check if we need a new page for flight details
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = margin + 10;
  }

  // ========== FLIGHT DETAILS TABLE ==========
  if (data.flightDetails && data.flightDetails.length > 0) {
    // Section Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(redR, redG, redB);
    doc.text('FLIGHT DETAILS', margin, yPos);
    yPos += 3;

    // Prepare flight data for autotable
    const flightRows = data.flightDetails.map((flight) => [
      flight.type || 'N/A',
      formatDate(flight.date),
      flight.carrier || 'N/A',
      flight.number || 'N/A',
      flight.from || 'N/A',
      flight.to || 'N/A',
      formatTime(flight.etd),
      formatTime(flight.eta),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [
        ['Type', 'Date', 'Carrier', 'Number', 'From', 'To', 'ETD', 'ETA'],
      ],
      body: flightRows,
      theme: 'striped',
      tableWidth: availableWidth,
      headStyles: {
        fillColor: [198, 40, 40],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [0, 0, 0],
        overflow: 'linebreak',
      },
      alternateRowStyles: {
        fillColor: [249, 249, 249],
      },
      margin: { left: margin, right: margin },
      styles: {
        cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
        lineWidth: 0.1,
        lineColor: [220, 220, 220],
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { cellWidth: 16 }, // Type
        1: { cellWidth: 26 }, // Date
        2: { cellWidth: 18 }, // Carrier
        3: { cellWidth: 20 }, // Number
        4: { cellWidth: 28 }, // From
        5: { cellWidth: 28 }, // To
        6: { cellWidth: 21 }, // ETD
        7: { cellWidth: 21 }, // ETA (total = 178mm)
      },
    });

    yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos + 50;
  }

  // ========== FOOTER ==========
  const footerY = pageHeight - 20;

  // Footer divider line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  // Footer text
  yPos = footerY + 5;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Generated by Moulavi ERP',
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );

  yPos += 4;
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(
    'This document is system generated. Terms and conditions apply.',
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );

  // ========== SAVE PDF ==========
  const fileName = `Voucher_${data.voucherNumber}_${data.guestName
    .replace(/\s+/g, '_')
    .slice(0, 20)}.pdf`;
  doc.save(fileName);
}
