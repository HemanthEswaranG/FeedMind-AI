import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generateSummaryPDF = async (formTitle, summaryContent, fileName = null) => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Add header
  pdf.setFontSize(24);
  pdf.setFont(undefined, 'bold');
  pdf.text('FeedMind AI', margin, yPosition);
  yPosition += 12;

  // Add form title
  pdf.setFontSize(18);
  pdf.setFont(undefined, 'bold');
  const formTitleLines = pdf.splitTextToSize(formTitle || 'Overall Summary', contentWidth);
  pdf.text(formTitleLines, margin, yPosition);
  yPosition += formTitleLines.length * 6 + 5;

  // Add separator line
  pdf.setDrawColor(100, 150, 230);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // Add timestamp
  pdf.setFontSize(10);
  pdf.setFont(undefined, 'normal');
  pdf.setTextColor(120, 120, 120);
  const timestamp = new Date().toLocaleString();
  pdf.text(`Generated on: ${timestamp}`, margin, yPosition);
  yPosition += 8;

  // Reset text color
  pdf.setTextColor(0, 0, 0);

  // Add AI Insights
  pdf.setFontSize(13);
  pdf.setFont(undefined, 'bold');
  pdf.text('AI Insights Summary', margin, yPosition);
  yPosition += 8;

  pdf.setFontSize(11);
  pdf.setFont(undefined, 'normal');

  // Split summary content and add it to PDF
  const contentLines = pdf.splitTextToSize(summaryContent, contentWidth - 5);
  
  contentLines.forEach((line) => {
    // Check if we need a new page
    if (yPosition + 6 > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }
    pdf.text(line, margin + 3, yPosition);
    yPosition += 6;
  });

  // Add footer
  yPosition = pageHeight - 15;
  pdf.setFontSize(9);
  pdf.setFont(undefined, 'normal');
  pdf.setTextColor(150, 150, 150);
  pdf.text('© FeedMind AI - Intelligent Feedback Analytics', margin, yPosition);
  
  try {
    const totalPages = pdf.internal.pages.length;
    pdf.text(`Page ${totalPages} of ${totalPages}`, pageWidth - margin - 20, yPosition);
  } catch (e) {
    console.warn('[PDF] Could not add page count:', e);
  }

  // Save PDF
  const fileNameToUse = fileName || `Form_Summary_${new Date().toISOString().slice(0, 10)}.pdf`;
  pdf.save(fileNameToUse);
};

export const generateDetailedPDF = async (formTitle, summaryContent, formData = null) => {
  try {
    // Validate inputs
    if (!formTitle || typeof formTitle !== 'string') {
      throw new Error('Invalid form title: must be a non-empty string');
    }
    if (!summaryContent || typeof summaryContent !== 'string') {
      throw new Error('Invalid summary content: must be a non-empty string');
    }

    console.log('[PDF] Starting structured PDF generation...', { formTitle, contentLength: summaryContent.length });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    console.log('[PDF] jsPDF instance created successfully');

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // ===== HEADER WITH BRANDING =====
    pdf.setFillColor(25, 27, 56); // Deep blue background
    pdf.rect(0, 0, pageWidth, 35, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.setFont(undefined, 'bold');
    pdf.text('FeedMind AI', margin, 15);

    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    pdf.text('Intelligent Feedback Analytics Report', margin, 23);

    yPosition = 45;

    // ===== TITLE SECTION =====
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(18);
    pdf.setFont(undefined, 'bold');
    const titleLines = pdf.splitTextToSize(`${formTitle}`, contentWidth);
    pdf.text(titleLines, margin, yPosition);
    yPosition += titleLines.length * 7 + 5;

    // ===== TIMESTAMP & METADATA =====
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += 5;

    // Separator line
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPosition + 2, pageWidth - margin, yPosition + 2);
    yPosition += 10;

    // ===== PARSE CONTENT INTO SECTIONS =====
    const sections = parseStructuredContent(summaryContent);

    // ===== RENDER EACH SECTION =====
    for (const section of sections) {
      yPosition = renderSection(pdf, section, margin, contentWidth, pageHeight, yPosition);
      yPosition += 5; // Space between sections
    }

    // ===== ADD PAGE NUMBERS =====
    try {
      const totalPages = pdf.internal.pages.length;
      console.log('[PDF] Total pages created:', totalPages);
      
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 15, pageHeight - 8);
      }
    } catch (pageError) {
      console.warn('[PDF] Could not add page numbers:', pageError);
    }

    // Generate safe filename
    const safeTitle = formTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileNameToUse = `Report_${safeTitle}_${new Date().toISOString().slice(0, 10)}.pdf`;
    
    console.log('[PDF] Saving PDF with filename:', fileNameToUse);
    pdf.save(fileNameToUse);
    console.log('[PDF] PDF saved successfully');
  } catch (error) {
    console.error('[PDF] Error in generateDetailedPDF:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
};

// Helper function to parse structured content
const parseStructuredContent = (content) => {
  const normalized = String(content || '').replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');

  const sectionDefs = [
    {
      key: 'positive',
      title: 'Positive Feedback',
      color: [34, 197, 94],
      icon: '✓',
      heading: /^(?:positive|positive\s+feedback|strengths?)\s*:?\s*(.*)$/i,
    },
    {
      key: 'negative',
      title: 'Negative Feedback',
      color: [239, 68, 68],
      icon: '!',
      heading: /^(?:negative|negative\s+feedback|issues?|concerns?|pain\s*points?)\s*:?\s*(.*)$/i,
    },
    {
      key: 'improvements',
      title: 'Suggested Improvements',
      color: [245, 158, 11],
      icon: '◀',
      heading: /^(?:areas\s+for\s+improvement|improvements?|changes?)\s*:?\s*(.*)$/i,
    },
    {
      key: 'suggestions',
      title: 'AI Suggestions & Recommendations',
      color: [34, 211, 238],
      icon: '★',
      heading: /^(?:ai\s+suggestions?(?:\s*&\s*recommendations)?|recommendations?|suggestions?)\s*:?\s*(.*)$/i,
    },
    {
      key: 'priorities',
      title: 'Priorities & Action Items',
      color: [168, 85, 247],
      icon: '⊕',
      heading: /^(?:priorities?|action\s+items?|next\s+steps?)\s*:?\s*(.*)$/i,
    },
  ];

  const byKey = Object.fromEntries(sectionDefs.map((def) => [def.key, []]));
  let activeKey = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const test = line.trim();

    let switched = false;
    for (const def of sectionDefs) {
      const m = test.match(def.heading);
      if (m) {
        activeKey = def.key;
        const inline = (m[1] || '').trim();
        if (inline) byKey[activeKey].push(inline);
        switched = true;
        break;
      }
    }

    if (switched || !activeKey) continue;
    if (!test) continue;
    byKey[activeKey].push(test);
  }

  const structured = sectionDefs.map((def) => ({
    title: def.title,
    color: def.color,
    icon: def.icon,
    content: byKey[def.key].join('\n').trim(),
  }));

  // Always return full structure so report never collapses to only one section.
  const withFallback = structured.map((section) => ({
    ...section,
    content: section.content || 'No clear points were extracted for this section from the AI response.',
  }));

  const hasAnySignal = withFallback.some(
    (section) => section.content !== 'No clear points were extracted for this section from the AI response.'
  );

  if (!hasAnySignal) {
    return [
      {
        title: 'Summary Report',
        color: [99, 102, 241],
        icon: '◉',
        content: normalized || 'No summary content available.',
      },
    ];
  }

  return withFallback;
};

// Helper function to render a section
const renderSection = (pdf, section, margin, contentWidth, pageHeight, startY) => {
  let yPosition = startY;
  const headerHeight = 10;
  const contentGap = 5;

  // Check if we need a new page
  if (yPosition + 20 > pageHeight - 20) {
    pdf.addPage();
    yPosition = margin;
  }

  // Section header with colored background
  pdf.setFillColor(section.color[0], section.color[1], section.color[2]);
  pdf.rect(margin, yPosition, contentWidth, headerHeight, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(12);
  pdf.setFont(undefined, 'bold');
  pdf.text(`${section.icon} ${section.title}`, margin + 3, yPosition + 6.6);

  yPosition += headerHeight + contentGap;
  pdf.setTextColor(0, 0, 0);

  // Section content
  pdf.setFontSize(10);
  pdf.setFont(undefined, 'normal');

  const contentLines = pdf.splitTextToSize(section.content, contentWidth - 5);
  
  contentLines.forEach((line) => {
    // Check if we need a new page
    if (yPosition + 5 > pageHeight - 15) {
      pdf.addPage();
      yPosition = margin;
    }
    pdf.text(line, margin + 2, yPosition);
    yPosition += 5;
  });

  return yPosition;
};

export const downloadPDFFromElement = async (elementId, fileName) => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error('Element not found');
      return;
    }

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 10;

    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - 20;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;
    }

    pdf.save(fileName || `document_${Date.now()}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};
