import { Patient, ChronicLog, LanguageCode } from '../types';
import { ChronicTrendAnalysis } from '../engine/chronicEngine';

export interface ChronicPdfInput {
  patient: Patient;
  analysis: ChronicTrendAnalysis;
  language?: LanguageCode;
  aiSummary?: string;
}

export async function generateChronicWeeklyPdf(input: ChronicPdfInput): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const { patient, analysis, language = 'en', aiSummary } = input;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const dateRangeStr = `${new Date(Date.now() - 7 * 86400000).toLocaleDateString('en-GB')} - ${new Date().toLocaleDateString('en-GB')}`;

  // 1. Header Banner
  doc.setFillColor(15, 56, 53); // Deep Emerald #0F3835
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('NIRAMAY - WEEKLY CHRONIC CARE SUMMARY', 14, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(178, 223, 216);
  doc.text(`Generated: ${new Date().toLocaleString()} | Period: ${dateRangeStr}`, 14, 23);

  let y = 36;

  // 2. Patient Profile Card
  doc.setFillColor(243, 247, 246);
  doc.setDrawColor(213, 226, 223);
  doc.roundedRect(14, y, 182, 22, 3, 3, 'FD');

  doc.setTextColor(15, 56, 53);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Patient: ${patient.name} (${patient.age || '30'}y, ${patient.gender || 'Unspecified'})`, 18, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(74, 99, 96);
  doc.text(`Village / Household: ${patient.village || 'Local Village'} | Contact: ${(patient as any).contactNumber || 'N/A'}`, 18, y + 15);

  y += 28;

  // 3. Glycemic & Lifestyle KPI Metrics
  const riskColor = analysis.riskLevel === 'high' ? [211, 47, 47] : analysis.riskLevel === 'medium' ? [217, 119, 6] : [30, 107, 99];
  
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(213, 226, 223);
  doc.roundedRect(14, y, 182, 30, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 56, 53);
  doc.text('CLINICAL KPI SUMMARY (7-DAY MOVING STATS)', 18, y + 7);

  // Column 1: Morning Glucose
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(74, 99, 96);
  doc.text('Fasting Glucose (Avg):', 18, y + 15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 56, 53);
  doc.text(`${analysis.morningGlucoseAvg7d || 'N/A'} mg/dL`, 18, y + 23);

  // Column 2: Trend Slope
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(74, 99, 96);
  doc.text('Glucose Trend Slope:', 72, y + 15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(analysis.trendDirection === 'rising' ? 211 : 30, analysis.trendDirection === 'rising' ? 47 : 107, 47);
  doc.text(`${analysis.trendDirection.toUpperCase()} (${analysis.glucoseSlope > 0 ? '+' : ''}${analysis.glucoseSlope} /day)`, 72, y + 23);

  // Column 3: Adherence Rate
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(74, 99, 96);
  doc.text('Medication Adherence:', 130, y + 15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(analysis.adherenceRatePercent >= 80 ? 30 : 217, 107, 99);
  doc.text(`${analysis.adherenceRatePercent}%`, 130, y + 23);

  // Column 4: Risk Badge
  doc.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
  doc.roundedRect(165, y + 10, 24, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(analysis.riskLevel.toUpperCase(), 177, y + 18, { align: 'center' });

  y += 36;

  // 4. Glucose Trend Visual Vector Chart
  doc.setFillColor(250, 252, 251);
  doc.setDrawColor(213, 226, 223);
  doc.roundedRect(14, y, 182, 48, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 56, 53);
  doc.text('GLUCOSE READINGS (LAST 7 LOGS)', 18, y + 6);

  // Target range band (70 - 140 mg/dL)
  const chartX = 22;
  const chartY = y + 12;
  const chartW = 166;
  const chartH = 30;

  doc.setFillColor(230, 246, 244);
  doc.rect(chartX, chartY + 10, chartW, 14, 'F'); // Normal range zone

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 120, 115);
  doc.text('Target (70-140 mg/dL)', chartX + 2, chartY + 18);

  const logsToPlot = analysis.recentLogs.slice(-7);
  if (logsToPlot.length > 0) {
    const step = chartW / Math.max(logsToPlot.length - 1, 1);
    
    // Draw points and lines
    doc.setDrawColor(30, 107, 99);
    doc.setLineWidth(0.7);

    for (let i = 0; i < logsToPlot.length; i++) {
      const val = logsToPlot[i].morningGlucose || logsToPlot[i].eveningGlucose || 110;
      // Map 60-260 mg/dL to chart height
      const py = chartY + chartH - Math.max(2, Math.min(chartH - 2, ((val - 60) / 200) * chartH));
      const px = chartX + (logsToPlot.length > 1 ? i * step : chartW / 2);

      if (i > 0) {
        const prevVal = logsToPlot[i - 1].morningGlucose || logsToPlot[i - 1].eveningGlucose || 110;
        const prevPy = chartY + chartH - Math.max(2, Math.min(chartH - 2, ((prevVal - 60) / 200) * chartH));
        const prevPx = chartX + (i - 1) * step;
        doc.line(prevPx, prevPy, px, py);
      }

      // Draw dot
      doc.setFillColor(val > 180 ? 211 : 30, val > 180 ? 47 : 107, 99);
      doc.circle(px, py, 1.4, 'FD');

      // Date label
      doc.setFontSize(6);
      doc.setTextColor(80, 95, 90);
      const dateLabel = logsToPlot[i].date.substring(5);
      doc.text(dateLabel, px, chartY + chartH + 4, { align: 'center' });
      doc.text(`${val}`, px, py - 2.5, { align: 'center' });
    }
  }

  y += 56;

  // 5. Daily Data Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 56, 53);
  doc.text('7-DAY DAILY CLINICAL LOG TABLE', 14, y);

  y += 4;
  doc.setFillColor(15, 56, 53);
  doc.rect(14, y, 182, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Date', 18, y + 4.2);
  doc.text('Morning (Fast)', 45, y + 4.2);
  doc.text('Evening (Post)', 78, y + 4.2);
  doc.text('Meds Taken', 112, y + 4.2);
  doc.text('Exercise (Min)', 142, y + 4.2);
  doc.text('Water (Gl)', 175, y + 4.2);

  y += 6;

  for (let i = 0; i < logsToPlot.length; i++) {
    const row = logsToPlot[i];
    doc.setFillColor(i % 2 === 0 ? 255 : 243, i % 2 === 0 ? 255 : 247, i % 2 === 0 ? 255 : 246);
    doc.rect(14, y, 182, 5.5, 'F');

    doc.setTextColor(17, 34, 34);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(row.date, 18, y + 3.8);
    doc.text(row.morningGlucose ? `${row.morningGlucose} mg/dL` : '-', 45, y + 3.8);
    doc.text(row.eveningGlucose ? `${row.eveningGlucose} mg/dL` : '-', 78, y + 3.8);
    doc.text(row.medicationAdherence ? 'YES' : 'NO / MISSED', 112, y + 3.8);
    doc.text(`${row.exerciseMinutes || 0} min`, 142, y + 3.8);
    doc.text(`${row.waterIntake || 0} glasses`, 175, y + 3.8);

    y += 5.5;
  }

  y += 5;

  // 6. Clinical Guidance & Nudges
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(213, 226, 223);
  doc.roundedRect(14, y, 182, 34, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 56, 53);
  doc.text('EVIDENCE-BASED CLINICAL RECOMMENDATIONS & NUDGES', 18, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(50, 60, 58);

  const activeNudge = analysis.matchedNudges[0]?.text || 'Maintain regular schedule and healthy nutrition.';
  const lines = doc.splitTextToSize(`• Recommendation: ${activeNudge}`, 174);
  doc.text(lines, 18, y + 13);

  if (aiSummary) {
    const aiLines = doc.splitTextToSize(`• AI Clinical Review: ${aiSummary}`, 174);
    doc.text(aiLines, 18, y + 23);
  }

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(130, 150, 145);
  doc.text('Nirāmay Clinical Decision Support System • Generated securely on-device for clinical consultation.', 105, 287, { align: 'center' });

  return doc.output('blob');
}
