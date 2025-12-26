import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export interface InvoicePdfData {
  invoiceNumber: string;
  date: string;
  sessionType: string;
  studio: string;
  service: string;
  timeSlot: string;
  startTime: string;
  endTime: string;
  actualDuration: string;
  crew?: string;
  cameras?: number;
  lineItems: Array<{ label: string; amount: number }>;
  total: number;
}

export async function generateInvoicePdf(data: InvoicePdfData): Promise<void> {
  const doc = new jsPDF();
  
  // Generate QR code with error handling
  let qrDataUrl: string | null = null;
  try {
    qrDataUrl = await QRCode.toDataURL(
      `https://expquotes.lovable.app/session/${data.invoiceNumber}`,
      { 
        width: 80, 
        margin: 1,
        type: 'image/png'
      }
    );
  } catch (e) {
    console.warn('QR Code generation failed, continuing without it', e);
  }
  
  // Header
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('EXP Studio', 20, 25);
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text('Invoice', 20, 35);
  
  // QR Code (top right)
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', 150, 10, 40, 40);
    } catch (e) {
      console.warn('Failed to add QR code to PDF', e);
    }
  }
  
  // Invoice details
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Invoice #: ${data.invoiceNumber.slice(0, 8)}`, 20, 50);
  doc.text(`Date: ${data.date}`, 20, 57);
  doc.setTextColor(0, 0, 0);
  
  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 65, 190, 65);
  
  // Session Info section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Session Details', 20, 80);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  
  let y = 92;
  const labelX = 20;
  const valueX = 80;
  
  const addRow = (label: string, value: string) => {
    doc.setTextColor(100, 100, 100);
    doc.text(label, labelX, y);
    doc.setTextColor(0, 0, 0);
    doc.text(value, valueX, y);
    y += 8;
  };
  
  addRow('Session Type:', data.sessionType);
  addRow('Studio:', data.studio);
  addRow('Service:', data.service);
  addRow('Time Slot:', data.timeSlot);
  
  // Time details with highlight
  y += 4;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(18, y - 6, 172, 28, 3, 3, 'F');
  y += 2;
  
  addRow('Start Time:', data.startTime);
  addRow('End Time:', data.endTime);
  
  // Highlight actual duration
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('Duration:', labelX, y);
  doc.setTextColor(0, 0, 0);
  doc.text(data.actualDuration, valueX, y);
  doc.setFont('helvetica', 'normal');
  y += 10;
  
  if (data.crew) {
    addRow('Crew:', data.crew);
  }
  if (data.cameras) {
    addRow('Cameras:', `${data.cameras}`);
  }
  
  // Line Items section
  y += 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, 190, y);
  y += 15;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Billing Details', 20, y);
  y += 12;
  
  // Table header
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('Description', 20, y);
  doc.text('Amount', 170, y, { align: 'right' });
  y += 4;
  doc.line(20, y, 190, y);
  y += 8;
  
  // Line items
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  
  data.lineItems.forEach(item => {
    doc.text(item.label, 20, y);
    doc.text(`$${item.amount.toFixed(2)}`, 170, y, { align: 'right' });
    y += 8;
  });
  
  // Total section
  y += 4;
  doc.setDrawColor(100, 100, 100);
  doc.line(20, y, 190, y);
  y += 12;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', 20, y);
  doc.setFontSize(16);
  doc.text(`$${data.total.toFixed(2)}`, 170, y, { align: 'right' });
  
  // Footer
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('EXP Studio | expstudio.com', 105, 280, { align: 'center' });
  doc.text('Thank you for your business!', 105, 286, { align: 'center' });
  
  // Use blob-based download for better browser compatibility
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `EXP-Invoice-${data.invoiceNumber.slice(0, 8)}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}
