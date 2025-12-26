import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { PhaseTotals, TASK_POINTS, ProjectTask, TaskLevel, TaskStatus, MemberStatusBreakdown } from '@/types/teamProject';

export interface TaskPdfData {
  id: string;
  title: string;
  level: TaskLevel;
  status: TaskStatus;
  assigneeName: string | null;
  value: number;
}

export interface PhasePdfData extends PhaseTotals {
  tasks?: TaskPdfData[];
  revenueByStatus?: {
    members: MemberStatusBreakdown[];
    unclaimed: MemberStatusBreakdown;
    totals: MemberStatusBreakdown;
  };
}

export interface ProjectPayoutPdfData {
  projectName: string;
  reportDate: string;
  phases: PhasePdfData[];
  grandTotals: {
    revenue: number;
    studioShare: number;
    teamPool: number;
  };
}

export async function generateProjectPayoutPdf(data: ProjectPayoutPdfData): Promise<void> {
  const doc = new jsPDF();
  
  // Generate QR code
  let qrDataUrl: string | null = null;
  try {
    qrDataUrl = await QRCode.toDataURL(
      `https://expquotes.lovable.app/projects`,
      { width: 80, margin: 1, type: 'image/png' }
    );
  } catch (e) {
    console.warn('QR Code generation failed', e);
  }

  const formatCurrency = (amount: number) => 
    `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  let y = 25;
  const pageHeight = 280;
  const leftMargin = 20;
  const rightMargin = 190;

  const checkPageBreak = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight) {
      doc.addPage();
      y = 25;
      return true;
    }
    return false;
  };

  // Header
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('EXP Studio', leftMargin, y);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Team Project Payout Report', leftMargin, y + 10);
  
  // QR Code
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', 150, 10, 40, 40);
    } catch (e) {
      console.warn('Failed to add QR code', e);
    }
  }

  y = 50;
  
  // Project details
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Project: ${data.projectName || 'Untitled Project'}`, leftMargin, y);
  doc.text(`Date: ${data.reportDate}`, leftMargin, y + 7);
  doc.setTextColor(0, 0, 0);
  
  y += 20;
  
  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(leftMargin, y, rightMargin, y);
  y += 10;

  // Render each phase
  data.phases.forEach((phase, phaseIndex) => {
    checkPageBreak(60);
    
    // Phase header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(phase.phaseName, leftMargin, y);
    doc.text(formatCurrency(phase.phaseRevenue), rightMargin, y, { align: 'right' });
    y += 8;
    
    // Studio/Team split
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Studio Share (50%): ${formatCurrency(phase.studioShare)}`, leftMargin, y);
    y += 5;
    doc.text(`Team Pool (50%): ${formatCurrency(phase.teamPool)}  |  ${phase.totalPoints} total points`, leftMargin, y);
    y += 10;
    doc.setTextColor(0, 0, 0);
    
    // Member payouts table header
    if (phase.memberPayouts.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text('Team Member', leftMargin, y);
      doc.text('Task Breakdown', 85, y);
      doc.text('Points', 145, y);
      doc.text('Payout', rightMargin, y, { align: 'right' });
      y += 3;
      doc.setDrawColor(180, 180, 180);
      doc.line(leftMargin, y, rightMargin, y);
      y += 6;
      
      // Member rows
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      phase.memberPayouts.forEach((payout) => {
        checkPageBreak(20);
        
        // Name and role
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(payout.memberName, leftMargin, y);
        if (payout.role) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(payout.role, leftMargin + doc.getTextWidth(payout.memberName) + 3, y);
          doc.setTextColor(0, 0, 0);
        }
        
        // Task breakdown
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const taskBreakdown = `Lv1: ${payout.lv1Tasks}×${TASK_POINTS.lv1}=${payout.lv1Points} | Lv2: ${payout.lv2Tasks}×${TASK_POINTS.lv2}=${payout.lv2Points} | Lv3: ${payout.lv3Tasks}×${TASK_POINTS.lv3}=${payout.lv3Points}`;
        doc.text(taskBreakdown, 85, y);
        
        // Points
        doc.setFontSize(9);
        doc.text(`${payout.totalPoints} (${payout.percentOfPool.toFixed(1)}%)`, 145, y);
        
        // Payout
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(formatCurrency(payout.payout), rightMargin, y, { align: 'right' });
        
        y += 8;
      });
    } else {
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text('No team members assigned', leftMargin, y);
      y += 8;
      doc.setTextColor(0, 0, 0);
    }
    
    y += 5;

    // Revenue by Status Table (if available)
    if (phase.revenueByStatus && (phase.revenueByStatus.members.length > 0 || phase.revenueByStatus.unclaimed.totalValue > 0)) {
      checkPageBreak(60);
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('REVENUE BY STATUS', leftMargin, y);
      y += 8;
      
      // Table header
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text('Member', leftMargin, y);
      doc.text('Done', 80, y, { align: 'center' });
      doc.text('In Progress', 110, y, { align: 'center' });
      doc.text('To Do', 140, y, { align: 'center' });
      doc.text('Total', rightMargin, y, { align: 'right' });
      y += 3;
      doc.setDrawColor(180, 180, 180);
      doc.line(leftMargin, y, rightMargin, y);
      y += 5;
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      // Member rows
      phase.revenueByStatus.members.forEach(m => {
        checkPageBreak(8);
        doc.setFontSize(8);
        const displayName = m.role ? `${m.memberName} (${m.role})` : m.memberName;
        doc.text(displayName.substring(0, 25), leftMargin, y);
        doc.setTextColor(34, 139, 34);
        doc.text(m.doneValue > 0 ? formatCurrency(m.doneValue) : '—', 80, y, { align: 'center' });
        doc.setTextColor(180, 120, 20);
        doc.text(m.inProgressValue > 0 ? formatCurrency(m.inProgressValue) : '—', 110, y, { align: 'center' });
        doc.setTextColor(100, 100, 100);
        doc.text(m.todoValue > 0 ? formatCurrency(m.todoValue) : '—', 140, y, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(m.totalValue), rightMargin, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        y += 6;
      });
      
      // Unclaimed row
      if (phase.revenueByStatus.unclaimed.totalValue > 0) {
        checkPageBreak(8);
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text('Unclaimed', leftMargin, y);
        doc.text(phase.revenueByStatus.unclaimed.doneValue > 0 ? formatCurrency(phase.revenueByStatus.unclaimed.doneValue) : '—', 80, y, { align: 'center' });
        doc.text(phase.revenueByStatus.unclaimed.inProgressValue > 0 ? formatCurrency(phase.revenueByStatus.unclaimed.inProgressValue) : '—', 110, y, { align: 'center' });
        doc.text(phase.revenueByStatus.unclaimed.todoValue > 0 ? formatCurrency(phase.revenueByStatus.unclaimed.todoValue) : '—', 140, y, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(phase.revenueByStatus.unclaimed.totalValue), rightMargin, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        y += 6;
      }
      
      // Totals row
      doc.setDrawColor(180, 180, 180);
      doc.line(leftMargin, y, rightMargin, y);
      y += 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL', leftMargin, y);
      doc.setTextColor(34, 139, 34);
      doc.text(formatCurrency(phase.revenueByStatus.totals.doneValue), 80, y, { align: 'center' });
      doc.setTextColor(180, 120, 20);
      doc.text(formatCurrency(phase.revenueByStatus.totals.inProgressValue), 110, y, { align: 'center' });
      doc.setTextColor(100, 100, 100);
      doc.text(formatCurrency(phase.revenueByStatus.totals.todoValue), 140, y, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      doc.text(formatCurrency(phase.revenueByStatus.totals.totalValue), rightMargin, y, { align: 'right' });
      y += 10;
    }

    // Task Board Detail (if tasks exist)
    if (phase.tasks && phase.tasks.length > 0) {
      checkPageBreak(40);
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('TASK BOARD DETAIL', leftMargin, y);
      y += 10;
      
      const statusGroups: { status: TaskStatus; label: string; icon: string }[] = [
        { status: 'done', label: 'DONE', icon: '[x]' },
        { status: 'in_progress', label: 'IN PROGRESS', icon: '[~]' },
        { status: 'todo', label: 'TO DO', icon: '[ ]' }
      ];
      
      statusGroups.forEach(({ status, label, icon }) => {
        const statusTasks = phase.tasks!.filter(t => t.status === status);
        if (statusTasks.length === 0) return;
        
        checkPageBreak(25);
        
        // Status header
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        if (status === 'done') doc.setTextColor(34, 139, 34);
        else if (status === 'in_progress') doc.setTextColor(180, 120, 20);
        else doc.setTextColor(100, 100, 100);
        doc.text(`${icon} ${label} (${statusTasks.length} tasks)`, leftMargin, y);
        y += 6;
        
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        
        statusTasks.forEach(task => {
          checkPageBreak(8);
          
          // Task title
          const title = task.title || 'Untitled Task';
          doc.text(title.substring(0, 40), leftMargin + 5, y);
          
          // Level badge
          doc.setFont('helvetica', 'bold');
          doc.text(task.level.toUpperCase(), 100, y);
          
          // Value
          doc.text(formatCurrency(task.value), 125, y);
          
          // Assignee
          doc.setFont('helvetica', 'normal');
          doc.text(task.assigneeName || 'Unclaimed', 160, y);
          
          y += 6;
        });
        
        y += 4;
      });
    }
    
    // Phase divider
    if (phaseIndex < data.phases.length - 1) {
      doc.setDrawColor(220, 220, 220);
      doc.line(leftMargin, y, rightMargin, y);
      y += 12;
    }
  });

  // Grand Totals section (if multiple phases)
  if (data.phases.length > 1) {
    checkPageBreak(50);
    
    y += 5;
    doc.setDrawColor(100, 100, 100);
    doc.line(leftMargin, y, rightMargin, y);
    y += 12;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('GRAND TOTALS', leftMargin, y);
    y += 12;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    doc.text('Total Project Revenue', leftMargin, y);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(data.grandTotals.revenue), rightMargin, y, { align: 'right' });
    y += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.text('Total Studio Share', leftMargin, y);
    doc.setTextColor(34, 139, 34);
    doc.text(`+${formatCurrency(data.grandTotals.studioShare)}`, rightMargin, y, { align: 'right' });
    y += 8;
    
    doc.setTextColor(0, 0, 0);
    doc.text('Total Team Payouts', leftMargin, y);
    doc.setTextColor(180, 50, 50);
    doc.text(`-${formatCurrency(data.grandTotals.teamPool)}`, rightMargin, y, { align: 'right' });
    y += 10;
    
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(180, 180, 180);
    doc.line(leftMargin, y, rightMargin, y);
    y += 8;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Margin', leftMargin, y);
    doc.text('50%', rightMargin, y, { align: 'right' });
  }

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('EXP Studio | expstudio.org', 105, 276, { align: 'center' });
  doc.text(`Points System: Lv1 = ${TASK_POINTS.lv1} pts | Lv2 = ${TASK_POINTS.lv2} pts | Lv3 = ${TASK_POINTS.lv3} pts`, 105, 282, { align: 'center' });

  // Download
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = blobUrl;
  const filename = data.projectName 
    ? `EXP-Payout-${data.projectName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`
    : `EXP-Payout-Report.pdf`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}
