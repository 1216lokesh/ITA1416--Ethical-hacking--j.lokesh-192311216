// Report Service - handles PDF and CSV generation
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const reportService = {
  generateCSV(scan) {
    const rows = [];

    // Header
    rows.push(['NetSecure - Network Security Scan Report']);
    rows.push(['Project: Network Port Scanning, Service Fingerprinting, and Risk Prioritization System']);
    rows.push([]);
    rows.push(['Target Information']);
    rows.push(['Scan ID', scan.id]);
    rows.push(['Target IP', scan.target]);
    rows.push(['Hostname', scan.hostname || 'N/A']);
    rows.push(['Scan Type', scan.scanType]);
    rows.push(['Scan Date', new Date(scan.date).toLocaleString()]);
    rows.push(['Duration', scan.duration]);
    rows.push(['Overall Risk', scan.riskLevel]);
    rows.push([]);

    // Port Results
    rows.push(['Port Scanning Results']);
    rows.push(['Port', 'Protocol', 'State', 'Service', 'Description']);
    (scan.ports || []).forEach(p => {
      rows.push([p.port, p.protocol, p.state, p.service, p.description || '']);
    });
    rows.push([]);

    // Service Results
    rows.push(['Service Fingerprinting Results']);
    rows.push(['Port', 'Service', 'Version', 'Confidence', 'Risk Level']);
    (scan.services || []).forEach(s => {
      rows.push([s.port, s.service, s.version, s.confidence + '%', s.riskLevel]);
    });
    rows.push([]);

    // Risk Findings
    rows.push(['Risk Assessment Findings']);
    rows.push(['ID', 'Title', 'Service', 'Port', 'Risk Level', 'Score', 'Recommendation']);
    (scan.findingDetails || []).forEach(f => {
      rows.push([f.id, f.title, f.service, f.port, f.riskLevel, f.score, f.recommendation]);
    });

    // Convert to CSV string
    const csvContent = rows.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NetSecure_Report_${scan.id}_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  },

  generatePDF(scan) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    // ===== HEADER =====
    doc.setFillColor(10, 14, 26);
    doc.rect(0, 0, pageW, 40, 'F');
    doc.setTextColor(0, 255, 136);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('NetSecure', 15, 18);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Network Security Assessment Report', 15, 28);
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.text('Network Port Scanning, Service Fingerprinting & Risk Prioritization System', 15, 36);

    // Date on right
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - 15, 20, { align: 'right' });
    doc.text(`Report ID: ${scan.id}`, pageW - 15, 28, { align: 'right' });

    let yPos = 50;

    // ===== TARGET INFO =====
    doc.setFillColor(26, 32, 48);
    doc.roundedRect(10, yPos, pageW - 20, 40, 3, 3, 'F');
    doc.setTextColor(0, 255, 136);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Target Information', 15, yPos + 8);

    doc.setTextColor(220, 220, 220);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const col1x = 15, col2x = 70, col3x = 130, col4x = 170;
    doc.text('Target IP:', col1x, yPos + 18);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(scan.target, col2x, yPos + 18);

    doc.setTextColor(220, 220, 220);
    doc.setFont('helvetica', 'normal');
    doc.text('Hostname:', col1x, yPos + 26);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(scan.hostname || 'N/A', col2x, yPos + 26);

    doc.setTextColor(220, 220, 220);
    doc.setFont('helvetica', 'normal');
    doc.text('Scan Type:', col3x, yPos + 18);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(scan.scanType, col4x, yPos + 18);

    doc.setTextColor(220, 220, 220);
    doc.setFont('helvetica', 'normal');
    doc.text('Risk Level:', col3x, yPos + 26);

    const riskColor = scan.riskLevel === 'Critical' ? [239, 68, 68] : scan.riskLevel === 'High' ? [249, 115, 22] : scan.riskLevel === 'Medium' ? [234, 179, 8] : [34, 197, 94];
    doc.setTextColor(...riskColor);
    doc.setFont('helvetica', 'bold');
    doc.text(scan.riskLevel, col4x, yPos + 26);

    doc.setTextColor(220, 220, 220);
    doc.setFont('helvetica', 'normal');
    doc.text('Scan Date:', col1x, yPos + 34);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(new Date(scan.date).toLocaleString(), col2x, yPos + 34);

    doc.setTextColor(220, 220, 220);
    doc.setFont('helvetica', 'normal');
    doc.text('Duration:', col3x, yPos + 34);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(scan.duration, col4x, yPos + 34);

    yPos += 50;

    // ===== SCAN SUMMARY =====
    const summaryData = [
      ['Total Ports Scanned', String(scan.totalPorts), 'Open Ports', String(scan.openPorts)],
      ['Closed Ports', String(scan.closedPorts), 'Filtered Ports', String(scan.filteredPorts)],
      ['Total Findings', String(scan.findings || (scan.findingDetails || []).length), 'Overall Risk', scan.riskLevel],
    ];

    doc.setTextColor(0, 255, 136);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Scan Summary', 15, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: summaryData,
      theme: 'grid',
      styles: { fillColor: [26, 32, 48], textColor: [220, 220, 220], fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { textColor: [150, 150, 150], fontStyle: 'normal' }, 2: { textColor: [150, 150, 150], fontStyle: 'normal' } },
      margin: { left: 10, right: 10 },
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // ===== PORT SCANNING RESULTS =====
    doc.setTextColor(0, 255, 136);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Port Scanning Results', 15, yPos);
    yPos += 5;

    const portRows = (scan.ports || []).map(p => [
      p.port, p.protocol, p.state, p.service, p.description || ''
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Port', 'Protocol', 'State', 'Service', 'Description']],
      body: portRows,
      theme: 'grid',
      headStyles: { fillColor: [0, 100, 60], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fillColor: [26, 32, 48], textColor: [220, 220, 220], fontSize: 8 },
      alternateRowStyles: { fillColor: [30, 40, 60] },
      margin: { left: 10, right: 10 },
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // ===== SERVICE FINGERPRINTING =====
    doc.setTextColor(0, 255, 136);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Service Fingerprinting Results', 15, yPos);
    yPos += 5;

    const serviceRows = (scan.services || []).map(s => [
      s.port, s.service, s.version, s.confidence + '%', s.status, s.riskLevel
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Port', 'Service', 'Version', 'Confidence', 'Status', 'Risk']],
      body: serviceRows,
      theme: 'grid',
      headStyles: { fillColor: [0, 80, 120], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fillColor: [26, 32, 48], textColor: [220, 220, 220], fontSize: 8 },
      alternateRowStyles: { fillColor: [30, 40, 60] },
      margin: { left: 10, right: 10 },
    });

    yPos = doc.lastAutoTable.finalY + 10;
    if (yPos > 240) { doc.addPage(); yPos = 15; }

    // ===== RISK FINDINGS =====
    doc.setTextColor(239, 68, 68);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Risk Assessment Findings', 15, yPos);
    yPos += 5;

    const findingRows = (scan.findingDetails || []).map(f => [
      f.id, f.title, f.service, f.riskLevel, f.score
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['ID', 'Title', 'Service', 'Risk', 'Score']],
      body: findingRows,
      theme: 'grid',
      headStyles: { fillColor: [120, 30, 30], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fillColor: [26, 32, 48], textColor: [220, 220, 220], fontSize: 8 },
      alternateRowStyles: { fillColor: [30, 40, 60] },
      margin: { left: 10, right: 10 },
    });

    yPos = doc.lastAutoTable.finalY + 10;
    if (yPos > 240) { doc.addPage(); yPos = 15; }

    // ===== RECOMMENDATIONS =====
    doc.setTextColor(0, 212, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Security Recommendations', 15, yPos);
    yPos += 5;

    const recRows = (scan.findingDetails || []).map(f => [
      f.riskLevel, f.service, f.recommendation || 'Review and remediate'
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Priority', 'Service', 'Recommended Action']],
      body: recRows,
      theme: 'grid',
      headStyles: { fillColor: [0, 80, 100], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fillColor: [26, 32, 48], textColor: [220, 220, 220], fontSize: 8 },
      alternateRowStyles: { fillColor: [30, 40, 60] },
      columnStyles: { 2: { cellWidth: 100 } },
      margin: { left: 10, right: 10 },
    });

    // ===== FOOTER =====
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(10, 14, 26);
      doc.rect(0, 285, pageW, 15, 'F');
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('NetSecure - Network Port Scanning, Service Fingerprinting, and Risk Prioritization System | Capstone Project', 15, 292);
      doc.text(`Page ${i} of ${totalPages}`, pageW - 15, 292, { align: 'right' });
      if (scan.isRealScan) {
        doc.setTextColor(0, 255, 136);
        doc.text(`CONFIDENTIAL — REAL NMAP AUDIT REPORT FOR ${scan.target}`, pageW / 2, 296, { align: 'center' });
      } else {
        doc.setTextColor(150, 150, 150);
        doc.text(`NETWORK SECURITY ASSESSMENT RECORD — ARCHIVED SCAN ${scan.id}`, pageW / 2, 296, { align: 'center' });
      }
    }

    doc.save(`NetSecure_Report_${scan.id}_${Date.now()}.pdf`);
  },
};
