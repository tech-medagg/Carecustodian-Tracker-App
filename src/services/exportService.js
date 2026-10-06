// src/services/exportService.js
// Export Hub for Field Sales & Mileage Reimbursement Claims (Excel XLSX, PDF Invoices, CSV)

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Format currency in INR (₹)
 */
export const formatINR = (val) => {
  const num = Number(val) || 0;
  return `₹${num.toLocaleString('en-IN')}`;
};

const parseToDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val?.toDate === 'function') return val.toDate();
  if (typeof val === 'object' && val.seconds !== undefined) return new Date(val.seconds * 1000);
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Format date string (YYYY-MM-DD to DD/MM/YYYY)
 */
export const formatDate = (dateVal) => {
  if (!dateVal) return 'N/A';
  try {
    const d = parseToDate(dateVal);
    return !d ? String(dateVal) : d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateVal);
  }
};

/**
 * Export Multi-Sheet Excel Spreadsheet (.xlsx)
 */
export const exportMileageExcel = ({
  trips = [],
  visits = [],
  salesmen = [],
  settings = {},
  filterLabel = 'All Time',
}) => {
  const wb = XLSX.utils.book_new();
  const costPerKm = Number(settings.costPerKm || 3);

  // ── Sheet 1: Salesmen Expense & Performance Summary ──
  const summaryData = salesmen.map((salesman, idx) => {
    const sId = salesman.uid || salesman.id;
    const sTrips = trips.filter((t) => t.userId === sId || t.salesmanId === sId);
    const sVisits = visits.filter((v) => v.assignedTo === sId || v.salesmanId === sId);
    const sCompletedVisits = sVisits.filter((v) => v.status === 'Completed');
    const sVerifiedVisits = sVisits.filter((v) => v.isGeofenceVerified);

    const totalKm = sTrips.reduce((acc, t) => acc + (Number(t.distance) || 0), 0);
    const travelCost = sTrips.reduce((acc, t) => acc + (Number(t.cost) || (Number(t.distance) || 0) * costPerKm), 0);

    return {
      'S.No': idx + 1,
      'Sales Representative': salesman.name || salesman.displayName || salesman.email,
      'Email': salesman.email,
      'Phone': salesman.phone || 'N/A',
      'Total Trips': sTrips.length,
      'Total Distance (Km)': Number(totalKm.toFixed(1)),
      'Reimbursement Rate (INR/Km)': costPerKm,
      'Total Reimbursement (INR)': Math.round(travelCost),
      'Planned Visits': sVisits.length,
      'Completed Visits': sCompletedVisits.length,
      'GPS Verified Visits': sVerifiedVisits.length,
      'Visit Success Rate': sVisits.length ? `${Math.round((sCompletedVisits.length / sVisits.length) * 100)}%` : '0%',
    };
  });

  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Salesmen Summary');

  // ── Sheet 2: Itemized Trip Logs ──
  const tripsData = trips.map((t, idx) => {
    const sName = t.salesmanName || (salesmen.find((s) => s.uid === t.userId)?.name) || t.userName || 'Field Agent';
    const startLoc = t.startLocation?.name || t.from || 'Origin';
    const endLoc = t.endLocation?.name || t.to || (t.isEarlyTermination ? 'Stopped Early' : 'Destination');
    const km = Number(t.distance) || 0;
    const tripCost = Number(t.cost) || Math.round(km * (t.ratePerKm || costPerKm));

    return {
      'Trip ID': t.id || `TRIP-${idx + 1}`,
      'Date': formatDate(t.startTime || t.createdAt),
      'Salesman': sName,
      'Origin': startLoc,
      'Destination / End Address': endLoc,
      'Distance (Km)': Number(km.toFixed(1)),
      'Rate (INR/Km)': t.ratePerKm || costPerKm,
      'Reimbursement (INR)': tripCost,
      'Status': t.status || 'Completed',
      'Completion Mode': t.autoCompleted ? 'Auto-Arrival' : (t.isEarlyTermination ? 'Early Stop' : 'Standard'),
      'Associated Hospital/Client': t.customerName || 'N/A',
    };
  });

  const tripsWs = XLSX.utils.json_to_sheet(tripsData);
  XLSX.utils.book_append_sheet(wb, tripsWs, 'Trip Logs');

  // ── Sheet 3: Client Visits & GPS Verification Audit ──
  const visitsData = visits.map((v, idx) => {
    const sName = (salesmen.find((s) => s.uid === v.assignedTo)?.name) || v.salesmanName || 'Field Agent';
    return {
      'Visit ID': v.id || `VISIT-${idx + 1}`,
      'Date': v.scheduledDate || formatDate(v.createdAt),
      'Hospital / Client': v.customerName || 'N/A',
      'Salesman': sName,
      'Priority': v.priority || 'Medium',
      'Status': v.status || 'Completed',
      'GPS Geofence Status': v.isGeofenceVerified ? 'GPS Verified' : (v.checkInLocation ? 'Offsite Check-in' : 'No GPS'),
      'Discrepancy (Meters)': v.gpsDiscrepancyMeters !== undefined ? `${v.gpsDiscrepancyMeters} m` : 'N/A',
      'Has Photo Proof': v.photoProof ? 'YES' : 'NO',
      'Has Signature': v.signatureProof ? 'YES' : 'NO',
      'Outcome': v.outcome || 'Completed',
      'Discussion Notes': v.notes || v.discussionNotes || '',
    };
  });

  const visitsWs = XLSX.utils.json_to_sheet(visitsData);
  XLSX.utils.book_append_sheet(wb, visitsWs, 'Visits Audit');

  // Write file
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `Medagg_Field_Reimbursement_Report_${dateStr}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Export Formatted PDF Expense Claim & Reimbursement Invoice
 */
export const exportMileagePdf = ({
  trips = [],
  visits = [],
  salesmen = [],
  settings = {},
  selectedSalesmanName = null,
  dateRangeLabel = 'Current Period',
}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const costPerKm = Number(settings.costPerKm || 3);
  const companyName = settings.companyName || 'Medagg Carecustodian';

  // Total Calculations
  const totalKm = trips.reduce((acc, t) => acc + (Number(t.distance) || 0), 0);
  const totalTravelCost = trips.reduce((acc, t) => acc + (Number(t.cost) || (Number(t.distance) || 0) * costPerKm), 0);
  const grandTotal = totalTravelCost;

  // ── Header Banner ──

  doc.setFillColor(15, 23, 42); // Navy Dark
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName.toUpperCase(), 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Field Sales Travel & Mileage Reimbursement Claim Sheet (₹' + costPerKm + '/km)', 14, 21);

  const reportDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  doc.text(`Generated: ${reportDate} | Period: ${dateRangeLabel}`, 14, 27);

  if (selectedSalesmanName) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(56, 189, 248);
    doc.text(`Agent: ${selectedSalesmanName}`, 140, 14);
  }

  // ── Key Metrics Summary Cards ──
  const startY = 38;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, startY, 182, 24, 2, 2, 'FD');

  const cardWidth = 182 / 3;
  
  // Metric 1: Total Distance
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL DISTANCE', 14 + 6, startY + 8);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${totalKm.toFixed(1)} Km`, 14 + 6, startY + 18);

  // Metric 2: Reimbursement Rate
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('RATE PER KM', 14 + cardWidth + 6, startY + 8);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`INR ${costPerKm}/km`, 14 + cardWidth + 6, startY + 18);

  // Metric 3: Grand Total Reimbursement
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL REIMBURSEMENT', 14 + cardWidth * 2 + 6, startY + 8);
  doc.setTextColor(16, 185, 129); // Green
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`INR ${Math.round(grandTotal)}`, 14 + cardWidth * 2 + 6, startY + 18);

  // ── Table 1: Itemized Trip Log ──
  const tableTripsData = trips.slice(0, 35).map((t, i) => {
    const sName = t.salesmanName || (salesmen.find((s) => s.uid === t.userId)?.name) || t.userName || 'Agent';
    const dest = t.endLocation?.name || t.to || 'Destination';
    const km = Number(t.distance) || 0;
    const fare = Number(t.cost) || Math.round(km * (t.ratePerKm || costPerKm));
    return [
      i + 1,
      formatDate(t.startTime || t.createdAt),
      sName,
      dest.length > 28 ? dest.substring(0, 26) + '…' : dest,
      `${km.toFixed(1)} km`,
      `₹${t.ratePerKm || costPerKm}/km`,
      `₹${fare}`,
      t.isEarlyTermination ? 'Early Stop' : 'Completed',
    ];
  });

  doc.autoTable({
    startY: startY + 28,
    head: [['#', 'Date', 'Salesman', 'Destination / End Point', 'Distance', 'Rate', 'Amount', 'Status']],
    body: tableTripsData,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  });

  // ── Sign-off & Approvals Section ──
  const finalY = doc.lastAutoTable.finalY + 16;
  if (finalY < 260) {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    // Salesman Signature
    doc.line(14, finalY + 12, 65, finalY + 12);
    doc.text('Claimant Signature', 14, finalY + 17);

    // Manager Approval
    doc.line(80, finalY + 12, 130, finalY + 12);
    doc.text('Verified by Territory Manager', 80, finalY + 17);

    // Finance / Admin
    doc.line(145, finalY + 12, 196, finalY + 12);
    doc.text('Authorized Finance Approval', 145, finalY + 17);
  }

  // Save PDF
  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`Medagg_Expense_Claim_${dateStr}.pdf`);
};
