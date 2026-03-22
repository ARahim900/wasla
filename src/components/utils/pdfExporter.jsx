/**
 * Wasla Property Solutions - Complete PDF Export Solution
 * Customized, Dynamic Inspection Reports with Bilingual Support
 * Version 2.0 - Production Ready
 */

import jsPDF from 'jspdf';

// ============================================
// CONFIGURATION & CONSTANTS
// ============================================
const CONFIG = {
  company: {
    name: 'Wasla Property Solutions',
    nameAr: 'وصلة للحلول العقارية',
    registration: 'CR. 1068375',
    email: 'info@waslaoman.com',
    phone: '+968 90699799',
    workHours: '9:00 a.m. to 5:00 p.m.'
  },
  urls: {
    logo: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b44f73a9997833d114376d/f255c3751_image.png',
    watermark: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b44f73a9997833d114376d/f255c3751_image.png'
  },
  layout: {
    margin: 40,
    pageWidth: 595.28,
    pageHeight: 841.89,
    photoColumns: 2,
    photoHeight: 120,
    photoGap: 20
  },
  colors: {
    primary: [3, 51, 102],      // Navy blue
    success: [34, 197, 94],     // Green
    danger: [239, 68, 68],      // Red
    warning: [251, 146, 60],    // Orange
    neutral: [107, 114, 128],   // Gray
    headerBg: [245, 245, 250],  // Light gray
    sectionBg: [240, 248, 255]  // Light blue
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Load image from URL and convert to Base64
 */
async function loadImageAsBase64(url, timeout = 5000) {
  if (!url || !url.startsWith('http')) {
    console.warn(`Invalid URL provided: ${url}`);
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, { 
      signal: controller.signal,
      cache: 'force-cache'
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Failed to load image: ${url}`, error);
    return null;
  }
}

/**
 * Filter and validate inspection data for customized reports
 */
function processInspectionData(rawData) {
  const processed = {
    ...rawData,
    clientName: rawData.clientName || rawData.client || 'Client',
    date: rawData.date || new Date().toLocaleDateString(),
    inspector: rawData.inspector || 'Inspector',
    location: rawData.location || 'Property Location',
    sections: [],
    images: [],
    metadata: rawData.metadata || {}
  };

  // Process areas into sections, only including affected areas
  if (rawData.areas && Array.isArray(rawData.areas)) {
    rawData.areas.forEach(area => {
      const affectedItems = [];
      const sectionPhotos = [];

      // Check each item in the area
      if (area.items && Array.isArray(area.items)) {
        area.items.forEach(item => {
          // Only include items that are affected (not N/A or Pass without comments)
          const isAffected = 
            item.status === 'Fail' || 
            (item.status === 'Pass' && item.comments && item.comments !== 'No additional comments') ||
            (item.photos && item.photos.length > 0);

          if (isAffected) {
            affectedItems.push({
              point: item.name || 'Inspection Point',
              status: item.status || 'N/A',
              comments: item.comments || ''
            });

            // Collect photos with proper captions
            if (item.photos && Array.isArray(item.photos)) {
              item.photos.forEach(photo => {
                if (photo.url) {
                  sectionPhotos.push({
                    url: photo.url,
                    caption: `${item.name}: ${photo.description || item.comments || ''}`.trim(),
                    status: item.status
                  });
                }
              });
            }
          }
        });
      }

      // Only add section if it has affected items
      if (affectedItems.length > 0 || sectionPhotos.length > 0) {
        processed.sections.push({
          title: area.name || 'Inspection Area',
          findings: affectedItems,
          photos: sectionPhotos,
          isAffected: true
        });
      }
    });
  }

  // Process recommendations - only include if present
  if (rawData.recommendations && Array.isArray(rawData.recommendations)) {
    processed.recommendations = rawData.recommendations.filter(r => r && r.trim());
  }

  // Process summary - only include if present
  if (rawData.summary && rawData.summary.trim()) {
    processed.summary = rawData.summary;
  }

  return processed;
}

/**
 * Add watermark to current page
 */
function addWatermark(doc, watermarkBase64) {
  if (!watermarkBase64) return;
  
  try {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const size = 250;
    
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.08 }));
    doc.addImage(
      watermarkBase64, 
      'PNG', 
      (pageWidth - size) / 2, 
      (pageHeight - size) / 2, 
      size, 
      size
    );
    doc.restoreGraphicsState();
  } catch (error) {
    console.warn('Failed to add watermark:', error);
  }
}

/**
 * Check and handle page breaks
 */
function checkPageBreak(doc, currentY, spaceNeeded, watermarkBase64) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = CONFIG.layout.margin;
  
  if (currentY + spaceNeeded > pageHeight - margin) {
    doc.addPage();
    addWatermark(doc, watermarkBase64);
    return margin;
  }
  return currentY;
}

/**
 * Add section header with background
 */
function addSectionHeader(doc, title, currentY, isMain = false) {
  const margin = CONFIG.layout.margin;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - (margin * 2);
  
  // Background
  const bgColor = isMain ? CONFIG.colors.primary : CONFIG.colors.sectionBg;
  doc.setFillColor(...bgColor);
  doc.rect(margin, currentY - 5, contentWidth, isMain ? 30 : 24, 'F');
  
  // Text
  const textColor = isMain ? [255, 255, 255] : CONFIG.colors.primary;
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isMain ? 16 : 14);
  doc.text(title, margin + 10, currentY + (isMain ? 15 : 12));
  
  doc.setTextColor(0, 0, 0);
  return currentY + (isMain ? 35 : 30);
}

/**
 * Add text paragraph with proper wrapping
 */
function addParagraph(doc, text, currentY, options = {}) {
  const margin = CONFIG.layout.margin;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - (margin * 2);
  
  const fontSize = options.fontSize || 11;
  const fontStyle = options.fontStyle || 'normal';
  const indent = options.indent || 0;
  const lineHeight = fontSize * 1.2;
  
  doc.setFont('helvetica', fontStyle);
  doc.setFontSize(fontSize);
  
  const lines = doc.splitTextToSize(text, contentWidth - indent);
  
  lines.forEach(line => {
    doc.text(line, margin + indent, currentY);
    currentY += lineHeight;
  });
  
  return currentY + (options.spaceAfter || 10);
}

/**
 * Add photo grid with proper error handling
 */
async function addPhotoGrid(doc, photos, startY, watermarkBase64) {
  const margin = CONFIG.layout.margin;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - (margin * 2);
  
  const cols = CONFIG.layout.photoColumns;
  const gap = CONFIG.layout.photoGap;
  const photoWidth = (contentWidth - gap * (cols - 1)) / cols;
  const photoHeight = CONFIG.layout.photoHeight;
  
  let currentY = startY;
  let currentCol = 0;
  let photosProcessed = 0;

  for (const photo of photos) {
    if (!photo.url) continue;
    
    // Check for page break
    if (currentY + photoHeight + 40 > pageHeight - margin) {
      doc.addPage();
      addWatermark(doc, watermarkBase64);
      currentY = margin;
      currentCol = 0;
    }
    
    const x = margin + (currentCol * (photoWidth + gap));
    
    try {
      const photoBase64 = await loadImageAsBase64(photo.url);
      
      if (photoBase64) {
        // Add photo
        doc.addImage(photoBase64, 'JPEG', x, currentY, photoWidth, photoHeight);
        
        // Add border
        doc.setDrawColor(200, 200, 200);
        doc.rect(x, currentY, photoWidth, photoHeight);
        
        // Add caption
        if (photo.caption) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(60, 60, 60);
          
          const captionLines = doc.splitTextToSize(photo.caption, photoWidth - 4);
          let captionY = currentY + photoHeight + 8;
          
          captionLines.slice(0, 2).forEach(line => {
            doc.text(line, x + 2, captionY);
            captionY += 10;
          });
          
          doc.setTextColor(0, 0, 0);
        }
        
        // Add status indicator
        if (photo.status) {
          const statusColor = photo.status === 'Pass' ? CONFIG.colors.success : 
                            photo.status === 'Fail' ? CONFIG.colors.danger : 
                            CONFIG.colors.neutral;
          doc.setFillColor(...statusColor);
          doc.circle(x + photoWidth - 10, currentY + 10, 4, 'F');
        }
        
        photosProcessed++;
      } else {
        throw new Error('Failed to load image');
      }
    } catch (error) {
      // Draw placeholder for failed images
      doc.setFillColor(240, 240, 240);
      doc.rect(x, currentY, photoWidth, photoHeight, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(x, currentY, photoWidth, photoHeight);
      
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('Image not available', x + photoWidth/2, currentY + photoHeight/2, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }
    
    // Move to next position
    currentCol++;
    if (currentCol >= cols) {
      currentCol = 0;
      currentY += photoHeight + 50;
    }
  }
  
  // Adjust Y if we ended mid-row
  if (currentCol > 0) {
    currentY += photoHeight + 50;
  }
  
  return currentY;
}

// ============================================
// CONTENT TEMPLATES
// ============================================

const CONTENT = {
  english: {
    overview: (clientName) => `Dear Mr./Ms. ${clientName},

Thank you for choosing Wasla Real Estate Solutions to carry out the inspection of your property. This report presents the inspection findings and measurements as documented on site on the date of the visit, and the presence of certain observations is common in property inspections.

Please review the attached report carefully before making your final decision. If you require any further clarification regarding the condition of the property, please feel free to contact us by phone or email between 9:00 a.m. and 5:00 p.m.

Email: ${CONFIG.company.email} | Mobile: ${CONFIG.company.phone}`,
    
    noPropertyPerfect: `Every building has imperfections or items that are ready for maintenance. It's the inspector's task to discover and report these so you can make informed decisions. This report should not be used as a tool to demean property, but rather as a way to illuminate the realities of the property.`,
    
    notAppraisal: `When an appraiser determines worth, only the most obvious conditions of a property are taken into account to establish a safe loan amount. In effect, the appraiser is representing the interests of the lender. Home inspectors focus more on the interests of the prospective buyer; and, although inspectors must be careful not to make any statements relating to property value, their findings can help buyers more completely understand the true costs of ownership.`,
    
    maintenanceCosts: `Homeowners should plan to spend around 1% of the total value of a property in maintenance costs, annually. (Annual costs of rental property maintenance are often 2%, or more.) If considerably less than this percentage has been invested during several years preceding an inspection, the property will usually show the obvious signs of neglect; and the new property owners may be required to invest significant time and money to address accumulated maintenance needs.`,
    
    scope: `This report details the outcome of a visual survey of the property detailed in the annexed inspection checklist in order to check the quality of workmanship against applicable standards. It covers both the interior and the exterior of the property as well as garden, driveway and garage if relevant. Areas not inspected, for whatever reason, cannot guarantee that these areas are free from defects. This report was formed as per the client request as a supportive opinion to enable him to have better understanding about property conditions. Our opinion does not study the property value or the engineering of the structure rather it studies the functionality of the property.`,
    
    confidentiality: `The inspection report is prepared for the Client for the purpose of informing of the major deficiencies in the condition of the subject property and is solely and exclusively for Client's own information and may not be relied upon by any other person. Client may distribute copies of the inspection report to the seller and the real estate agents directly involved in this transaction, but Client and Inspector do not in any way intend to benefit said seller or the real estate agents directly or indirectly through this Agreement or the inspection report.`
  },
  
  arabic: {
    overview: `نظرة عامة`,
    noPropertyPerfect: `لا يوجد عقار مثالي`,
    notAppraisal: `هذا التقرير ليس تقييمًا سعريًا`,
    maintenanceCosts: `تكاليف الصيانة أمر طبيعي`,
    scope: `نطاق الفحص`,
    confidentiality: `سرية التقرير`
  }
};

// ============================================
// MAIN EXPORT FUNCTION
// ============================================

export async function exportInspectionReport(rawData, options = {}) {
  const startTime = Date.now();
  
  try {
    // Process and filter data for customized report
    const reportData = processInspectionData(rawData);
    
    // Check if there's any content to report
    if (reportData.sections.length === 0 && !reportData.summary && !reportData.recommendations?.length) {
      throw new Error('No inspection findings to report. All areas marked as N/A or unaffected.');
    }
    
    // Initialize PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
      compress: true
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = CONFIG.layout.margin;
    
    // Load assets
    const [logoBase64, watermarkBase64] = await Promise.all([
      loadImageAsBase64(options.logoUrl || CONFIG.urls.logo),
      loadImageAsBase64(options.watermarkUrl || CONFIG.urls.watermark)
    ]);
    
    let currentY = margin;
    
    // ============================================
    // PAGE 1: COVER PAGE
    // ============================================
    addWatermark(doc, watermarkBase64);
    
    // Company Logo
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', margin, currentY, 140, 70);
      } catch (e) {
        console.warn('Failed to add logo:', e);
      }
    }
    currentY += 90;
    
    // Report Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(...CONFIG.colors.primary);
    doc.text('PROPERTY INSPECTION REPORT', pageWidth / 2, currentY, { align: 'center' });
    currentY += 40;
    
    doc.setFontSize(14);
    doc.setTextColor(...CONFIG.colors.neutral);
    doc.text('تقرير فحص العقار', pageWidth / 2, currentY, { align: 'center' });
    currentY += 60;
    
    // Report Metadata Box
    doc.setFillColor(...CONFIG.colors.headerBg);
    doc.roundedRect(margin, currentY - 10, pageWidth - margin * 2, 120, 5, 5, 'F');
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    
    const metadata = [
      ['Report Date:', reportData.date],
      ['Property Location:', reportData.location],
      ['Client Name:', reportData.clientName],
      ['Inspector:', reportData.inspector],
      ['Report Reference:', `WSL-${Date.now().toString().slice(-6)}`]
    ];
    
    metadata.forEach(([label, value], index) => {
      const y = currentY + (index * 22);
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin + 20, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + 150, y);
    });
    
    currentY += 140;
    
    // Report Status Summary
    if (reportData.sections.length > 0) {
      doc.setFillColor(...CONFIG.colors.sectionBg);
      doc.roundedRect(margin, currentY, pageWidth - margin * 2, 60, 5, 5, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Report Summary:', margin + 20, currentY + 20);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Areas Inspected: ${reportData.sections.length}`, margin + 20, currentY + 40);
      
      const totalFindings = reportData.sections.reduce((sum, s) => sum + (s.findings?.length || 0), 0);
      doc.text(`Total Issues Found: ${totalFindings}`, margin + 250, currentY + 40);
    }
    
    // ============================================
    // PAGE 2: BILINGUAL OVERVIEW
    // ============================================
    doc.addPage();
    addWatermark(doc, watermarkBase64);
    currentY = margin;
    
    // English Overview
    currentY = addSectionHeader(doc, 'OVERVIEW', currentY, true);
    currentY = addParagraph(doc, CONTENT.english.overview(reportData.clientName), currentY);
    currentY += 20;
    
    // Notice Sections
    currentY = addSectionHeader(doc, 'IMPORTANT NOTICES', currentY);
    
    // No property is perfect
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('No property is perfect.', margin, currentY);
    currentY += 15;
    currentY = addParagraph(doc, CONTENT.english.noPropertyPerfect, currentY, { indent: 10 });
    
    // Not an appraisal
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('This report is not an appraisal.', margin, currentY);
    currentY += 15;
    currentY = addParagraph(doc, CONTENT.english.notAppraisal, currentY, { indent: 10 });
    
    // Maintenance costs
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Maintenance costs are normal.', margin, currentY);
    currentY += 15;
    currentY = addParagraph(doc, CONTENT.english.maintenanceCosts, currentY, { indent: 10 });
    
    // ============================================
    // PAGE 3: SCOPE & CONFIDENTIALITY
    // ============================================
    doc.addPage();
    addWatermark(doc, watermarkBase64);
    currentY = margin;
    
    currentY = addSectionHeader(doc, 'SCOPE OF THE INSPECTION', currentY, true);
    currentY = addParagraph(doc, CONTENT.english.scope, currentY);
    currentY += 20;
    
    currentY = addSectionHeader(doc, 'CONFIDENTIALITY OF THE REPORT', currentY, true);
    currentY = addParagraph(doc, CONTENT.english.confidentiality, currentY);
    
    // ============================================
    // INSPECTION FINDINGS (CUSTOMIZED SECTIONS)
    // ============================================
    if (reportData.sections.length > 0) {
      doc.addPage();
      addWatermark(doc, watermarkBase64);
      currentY = margin;
      
      currentY = addSectionHeader(doc, 'INSPECTION FINDINGS', currentY, true);
      
      // Summary box
      doc.setFillColor(...CONFIG.colors.headerBg);
      doc.roundedRect(margin, currentY, pageWidth - margin * 2, 40, 3, 3, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`This report contains findings for ${reportData.sections.length} affected area(s).`, margin + 10, currentY + 25);
      currentY += 60;
      
      // Process each section
      for (let sectionIndex = 0; sectionIndex < reportData.sections.length; sectionIndex++) {
        const section = reportData.sections[sectionIndex];
        
        // Check page break for section header
        currentY = checkPageBreak(doc, currentY, 100, watermarkBase64);
        
        // Section header with number
        doc.setFillColor(...CONFIG.colors.primary);
        doc.rect(margin, currentY, pageWidth - margin * 2, 28, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text(`${sectionIndex + 1}. ${section.title}`, margin + 10, currentY + 18);
        doc.setTextColor(0, 0, 0);
        currentY += 38;
        
        // Findings
        if (section.findings && section.findings.length > 0) {
          section.findings.forEach((finding, findingIndex) => {
            currentY = checkPageBreak(doc, currentY, 50, watermarkBase64);
            
            // Finding container
            doc.setFillColor(250, 250, 250);
            doc.roundedRect(margin + 10, currentY, pageWidth - margin * 2 - 20, 45, 2, 2, 'F');
            
            // Finding point
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text(`${sectionIndex + 1}.${findingIndex + 1} ${finding.point}`, margin + 20, currentY + 15);
            
            // Status with color coding
            const statusColors = {
              'Pass': CONFIG.colors.success,
              'Fail': CONFIG.colors.danger,
              'N/A': CONFIG.colors.neutral
            };
            
            const statusColor = statusColors[finding.status] || CONFIG.colors.neutral;
            doc.setTextColor(...statusColor);
            doc.setFont('helvetica', 'bold');
            doc.text(finding.status, pageWidth - margin - 60, currentY + 15);
            doc.setTextColor(0, 0, 0);
            
            // Comments
            if (finding.comments && finding.comments !== 'No additional comments') {
              doc.setFont('helvetica', 'italic');
              doc.setFontSize(10);
              doc.setTextColor(80, 80, 80);
              const commentLines = doc.splitTextToSize(finding.comments, pageWidth - margin * 2 - 40);
              doc.text(commentLines[0] || '', margin + 20, currentY + 32);
              doc.setTextColor(0, 0, 0);
            }
            
            currentY += 55;
          });
        }
        
        // Photos for this section
        if (section.photos && section.photos.length > 0) {
          currentY = checkPageBreak(doc, currentY, 150, watermarkBase64);
          
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.text('Supporting Images:', margin, currentY);
          currentY += 20;
          
          currentY = await addPhotoGrid(doc, section.photos, currentY, watermarkBase64);
        }
        
        currentY += 20;
      }
    }
    
    // ============================================
    // SUMMARY & RECOMMENDATIONS
    // ============================================
    if (reportData.summary || (reportData.recommendations && reportData.recommendations.length > 0)) {
      doc.addPage();
      addWatermark(doc, watermarkBase64);
      currentY = margin;
      
      if (reportData.summary) {
        currentY = addSectionHeader(doc, 'EXECUTIVE SUMMARY', currentY, true);
        currentY = addParagraph(doc, reportData.summary, currentY);
        currentY += 30;
      }
      
      if (reportData.recommendations && reportData.recommendations.length > 0) {
        currentY = addSectionHeader(doc, 'RECOMMENDATIONS', currentY, true);
        
        reportData.recommendations.forEach((rec, index) => {
          currentY = checkPageBreak(doc, currentY, 30, watermarkBase64);
          
          doc.setFillColor(255, 243, 224);
          doc.rect(margin, currentY - 5, pageWidth - margin * 2, 25, 'F');
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(11);
          doc.text(`${index + 1}. ${rec}`, margin + 10, currentY + 10);
          currentY += 30;
        });
      }
    }
    
    // ============================================
    // SIGNATURE PAGE
    // ============================================
    doc.addPage();
    addWatermark(doc, watermarkBase64);
    currentY = margin;
    
    currentY = addSectionHeader(doc, 'CLIENT ACKNOWLEDGMENT', currentY, true);
    
    // Signature block
    doc.setFillColor(...CONFIG.colors.headerBg);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 200, 5, 5, 'F');
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    
    const signatureFields = [
      ['Client Name:', reportData.clientName],
      ['Date:', reportData.date],
      ['', ''],
      ['Client Signature:', '_________________________________'],
      ['', ''],
      ['Inspector:', reportData.inspector],
      ['Inspector Signature:', '_________________________________'],
      ['', ''],
      ['Company Stamp:', '_________________________________']
    ];
    
    signatureFields.forEach(([label, value], index) => {
      const y = currentY + 20 + (index * 18);
      if (label) {
        doc.setFont('helvetica', 'bold');
        doc.text(label, margin + 20, y);
        doc.setFont('helvetica', 'normal');
        if (value) doc.text(value, margin + 150, y);
      }
    });
    
    currentY += 220;
    
    // Footer
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...CONFIG.colors.primary);
    doc.text('Property Inspection Report is Annexed', pageWidth / 2, currentY, { align: 'center' });
    currentY += 25;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`${CONFIG.company.name} ${CONFIG.company.registration}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 18;
    doc.setFontSize(10);
    doc.text(`${CONFIG.company.nameAr} ${CONFIG.company.registration}`, pageWidth / 2, currentY, { align: 'center' });
    
    // ============================================
    // ADD PAGE NUMBERS & FOOTERS
    // ============================================
    const totalPages = doc.internal.getNumberOfPages();
    
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Page number
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...CONFIG.colors.neutral);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 20, { align: 'center' });
      
      // Footer line
      doc.setDrawColor(...CONFIG.colors.headerBg);
      doc.setLineWidth(0.5);
      doc.line(margin, pageHeight - 35, pageWidth - margin, pageHeight - 35);
    }
    
    // ============================================
    // SAVE PDF
    // ============================================
    const filename = options.filename || `Inspection_Report_${reportData.clientName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    doc.save(filename);
    
    console.log(`PDF generated successfully in ${Date.now() - startTime}ms`);
    return { success: true, filename };
    
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw new Error(`Failed to generate PDF: ${error.message}`);
  }
}

// ============================================
// SIMPLIFIED API FOR QUICK USE
// ============================================

export function generatePDF(inspectionData) {
  return exportInspectionReport(inspectionData, {
    filename: `Wasla_Inspection_${Date.now()}.pdf`
  });
}

// ============================================
// HTML FALLBACK FOR PERFECT BILINGUAL DISPLAY
// ============================================

export function generateHTMLReport(reportData) {
  const processed = processInspectionData(reportData);
  
  const html = `
<!DOCTYPE html>
<html lang="ar" dir="auto">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inspection Report - ${processed.clientName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Open Sans', sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
    }
    
    .arabic {
      font-family: 'Amiri', serif;
      direction: rtl;
      text-align: right;
      font-size: 1.1em;
    }
    
    .container {
      max-width: 210mm;
      margin: 0 auto;
      background: white;
      box-shadow: 0 0 20px rgba(0,0,0,0.1);
    }
    
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.05;
      z-index: -1;
      width: 400px;
      height: 400px;
    }
    
    .header {
      background: linear-gradient(135deg, #033366 0%, #0066cc 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    
    .header img {
      max-width: 200px;
      margin-bottom: 20px;
    }
    
    .header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
    }
    
    .section {
      padding: 40px;
      border-bottom: 1px solid #eee;
    }
    
    .section-title {
      background: #f8f9fa;
      padding: 15px;
      margin: -40px -40px 20px;
      font-size: 1.5em;
      font-weight: bold;
      color: #033366;
    }
    
    .bilingual {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin: 20px 0;
    }
    
    .finding {
      background: #f8f9fa;
      padding: 15px;
      margin: 10px 0;
      border-left: 4px solid #033366;
      border-radius: 4px;
    }
    
    .status-pass { border-left-color: #22c55e; }
    .status-fail { border-left-color: #ef4444; }
    .status-na { border-left-color: #6b7280; }
    
    .photo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    
    .photo-item {
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
    }
    
    .photo-item img {
      width: 100%;
      height: 200px;
      object-fit: cover;
    }
    
    .photo-caption {
      padding: 10px;
      font-size: 0.9em;
      color: #666;
    }
    
    .signature-block {
      margin-top: 40px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    
    .signature-line {
      border-bottom: 2px solid #333;
      margin: 30px 0 10px;
      width: 300px;
    }
    
    @media print {
      body { background: white; }
      .container { box-shadow: none; }
      .section { page-break-inside: avoid; }
      .no-print { display: none; }
      .watermark { opacity: 0.03; }
    }
  </style>
</head>
<body>
  <img class="watermark" src="${CONFIG.urls.watermark}" alt="">
  
  <div class="container">
    <!-- Header -->
    <div class="header">
      <img src="${CONFIG.urls.logo}" alt="Wasla Property Solutions">
      <h1>Property Inspection Report</h1>
      <h2 class="arabic">تقرير فحص العقار</h2>
    </div>
    
    <!-- Metadata -->
    <div class="section">
      <table style="width: 100%; font-size: 1.1em;">
        <tr><td><strong>Client:</strong></td><td>${processed.clientName}</td></tr>
        <tr><td><strong>Date:</strong></td><td>${processed.date}</td></tr>
        <tr><td><strong>Location:</strong></td><td>${processed.location}</td></tr>
        <tr><td><strong>Inspector:</strong></td><td>${processed.inspector}</td></tr>
      </table>
    </div>
    
    <!-- Bilingual Overview -->
    <div class="section">
      <div class="section-title">Overview / نظرة عامة</div>
      <div class="bilingual">
        <div>
          <p>${CONTENT.english.overview(processed.clientName)}</p>
        </div>
        <div class="arabic">
          <p>عزيزي السيد/السيدة ${processed.clientName}،</p>
          <p>نشكر لكم اختياركم وصلة للحلول العقارية للقيام بفحص العقار الخاص بكم...</p>
        </div>
      </div>
    </div>
    
    <!-- Findings -->
    ${processed.sections.map((section, index) => `
      <div class="section">
        <div class="section-title">${index + 1}. ${section.title}</div>
        ${section.findings.map(finding => `
          <div class="finding status-${finding.status.toLowerCase()}">
            <strong>${finding.point}</strong>
            <span style="float: right; color: ${
              finding.status === 'Pass' ? '#22c55e' : 
              finding.status === 'Fail' ? '#ef4444' : '#6b7280'
            };">${finding.status}</span>
            ${finding.comments ? `<div style="margin-top: 10px; font-style: italic; color: #666;">${finding.comments}</div>` : ''}
          </div>
        `).join('')}
        
        ${section.photos && section.photos.length ? `
          <div class="photo-grid">
            ${section.photos.map(photo => `
              <div class="photo-item">
                <img src="${photo.url}" alt="${photo.caption || ''}">
                <div class="photo-caption">${photo.caption || ''}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `).join('')}
    
    <!-- Recommendations -->
    ${processed.recommendations && processed.recommendations.length ? `
      <div class="section">
        <div class="section-title">Recommendations / التوصيات</div>
        <ol>
          ${processed.recommendations.map(rec => `<li style="margin: 10px 0;">${rec}</li>`).join('')}
        </ol>
      </div>
    ` : ''}
    
    <!-- Signature -->
    <div class="section">
      <div class="section-title">Client Acknowledgment</div>
      <div class="signature-block">
        <p><strong>Client Name:</strong> ${processed.clientName}</p>
        <div class="signature-line"></div>
        <p>Client Signature</p>
        
        <p style="margin-top: 30px;"><strong>Inspector:</strong> ${processed.inspector}</p>
        <div class="signature-line"></div>
        <p>Inspector Signature</p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 40px; background: #033366; color: white;">
      <p style="font-size: 1.2em; font-weight: bold;">Wasla Property Solutions CR. 1068375</p>
      <p class="arabic" style="color: white;">وصلة للحلول العقارية س.ت 1068375</p>
    </div>
  </div>
  
  <!-- Print Button -->
  <div style="text-align: center; padding: 20px;" class="no-print">
    <button onclick="window.print()" style="
      background: #033366;
      color: white;
      padding: 15px 40px;
      font-size: 1.1em;
      border: none;
      border-radius: 5px;
      cursor: pointer;
    ">Print Report / Save as PDF</button>
  </div>
</body>
</html>`;
  
  return html;
}

// ============================================
// EXPORT ALL FUNCTIONS
// ============================================

export default {
  exportInspectionReport,
  generatePDF,
  generateHTMLReport,
  processInspectionData,
  loadImageAsBase64
};