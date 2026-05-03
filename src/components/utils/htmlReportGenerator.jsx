/**
 * HTML-Based Inspection Report Generator
 * Optimized for direct printing with perfect layout matching Wasla template
 * Version 6.0 - Security fixes, consistency improvements, and enhanced features
 */

class InspectionReportGenerator {
  constructor() {
    this.config = {
      company: {
        name: 'Wasla Property Solutions',
        nameAr: 'وصلة للحلول العقارية',
        registration: '1068375',
        email: 'info@waslaoman.com',
        phone: '+968 90699799',
        logo: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b44f73a9997833d114376d/f255c3751_image.png',
        placeholderImage: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="150" viewBox="0 0 400 150"%3E%3Crect fill="%23f3f4f6" width="400" height="150"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%239ca3af"%3EImage Not Available%3C/text%3E%3C/svg%3E'
      }
    };
    this.page = { size: 'A4', orientation: 'portrait', margin: '0' };
  }

  // Security: Escape HTML to prevent XSS
  escapeHTML(str = "") {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Build the HTML string only — does not open any window. Use this for in-app rendering (iframe).
  async buildHTML(inspectionData, options = {}) {
    if (!inspectionData || typeof inspectionData !== 'object') {
      throw new Error('Invalid inspection data provided');
    }
    this.page = {
      size: options.pageSize || 'A4',
      orientation: options.orientation || 'portrait',
      margin: options.margin || '25mm 20mm 25mm 20mm'
    };
    this.embedMode = options.embedMode === true;
    const reportData = this.processInspectionData(inspectionData);
    return await this.buildCompleteHTML(reportData);
  }

  // Main generation function - writes HTML to window
  async generateReport(inspectionData, options = {}) {
    try {
      console.log('Starting report generation...');

      // Validate input data
      if (!inspectionData || typeof inspectionData !== 'object') {
        throw new Error('Invalid inspection data provided');
      }

      // Configure page settings
      this.page = {
        size: options.pageSize || 'A4',
        orientation: options.orientation || 'portrait',
        margin: options.margin || '25mm 20mm 25mm 20mm'
      };

      const reportData = this.processInspectionData(inspectionData);
      const htmlContent = await this.buildCompleteHTML(reportData);

      // Use pre-opened window if provided (for mobile compatibility), otherwise open new
      const reportWindow = options.targetWindow || window.open('', 'wasla_report');

      if (!reportWindow || reportWindow.closed || typeof reportWindow.closed === 'undefined') {
        throw new Error('Pop-up blocked. Please allow pop-ups for this site to view the report. Check your browser settings or the address bar for a blocked pop-up icon.');
      }

      // Attach onload BEFORE writing content to prevent race condition
      const onLoaded = () => {
        console.log('Report loaded successfully');
        if (options.autoPrint) {
          setTimeout(() => {
            reportWindow.print();
          }, 500);
        }
      };

      reportWindow.addEventListener('load', onLoaded, { once: true });

      // Optional: Close window after printing when autoPrint is enabled
      try {
        reportWindow.addEventListener('afterprint', () => {
          if (options.autoPrint && !reportWindow.closed) {
            reportWindow.close();
          }
        }, { once: true });
      } catch (e) {
        // Some browsers don't support afterprint
        console.log('afterprint event not supported');
      }

      reportWindow.document.open();
      reportWindow.document.write(htmlContent);
      reportWindow.document.close();

      // Fallback for DOMContentLoaded
      reportWindow.document.addEventListener('DOMContentLoaded', onLoaded, { once: true });

      return { success: true, html: htmlContent, window: reportWindow };

    } catch (error) {
      console.error('Report generation failed:', error);
      throw error;
    }
  }

  // Process inspection data with validation
  processInspectionData(data) {
    // Enhanced validation
    if (!data || typeof data !== 'object') {
      console.error('Invalid inspection data provided');
      throw new Error('Invalid inspection data');
    }

    // Count total items and passes for grade calculation
    let totalItems = 0;
    let passCount = 0;

    const processed = {
      reference: `WSL-${Date.now().toString().slice(-6)}`,
      date: this.formatDate(data.inspection_date || new Date().toISOString()),
      client: data.client_name || 'Client',
      propertyType: this.formatPropertyType(data.property_type || ''),
      location: data.location || 'Property Location',
      inspector: data.inspector_name || 'Inspector',
      grade: '',
      affectedAreas: [],
      recommendations: [],
      categorySummary: []
    };

    // Aggregate grades per category for the executive summary
    const categoryGrades = {};

    if (data.areas && Array.isArray(data.areas)) {
      data.areas.forEach(area => {
        const affectedItems = [];
        const areaPhotos = [];

        if (area.items && Array.isArray(area.items)) {
          area.items.forEach(item => {
            // Normalize status to prevent styling misses
            const normalizedStatus = (item.status || '').trim().toLowerCase();
            const status = ['pass', 'fail', 'n/a'].includes(normalizedStatus) 
              ? normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)
              : 'N/A';
            
            totalItems++;
            if (status === 'Pass') passCount++;

            const hasIssue = status === 'Fail';
            const hasComments = status === 'Pass' && item.comments && item.comments !== 'No additional comments';
            const hasPhotos = item.photos && item.photos.length > 0;

            const itemName = item.point || item.category || 'Inspection Point';
            const grade = this.inferGrade({ status, comments: item.comments });
            const category = this.categoryFor(itemName);
            if (grade) {
              if (!categoryGrades[category]) categoryGrades[category] = [];
              categoryGrades[category].push(grade);
            }

            if (hasIssue || hasComments || hasPhotos) {
              affectedItems.push({
                name: itemName,
                status: status,
                comments: item.comments || '',
                grade,
                category
              });

              if (item.photos && Array.isArray(item.photos)) {
                item.photos.forEach(photo => {
                  if (photo.url) {
                    areaPhotos.push({
                      url: photo.url,
                      itemName: item.point || item.category || 'Inspection point',
                      description: photo.description || item.comments || 'Inspection photo'
                    });
                  }
                });
              }
            }
          });
        }

        if (affectedItems.length > 0) {
          processed.affectedAreas.push({
            name: area.name || 'Inspection Area',
            items: affectedItems,
            photos: areaPhotos
          });
        }
      });
    }

    // Calculate overall grade based on pass rate
    if (totalItems > 0) {
      const passRate = (passCount / totalItems) * 100;
      if (passRate >= 95) processed.grade = 'AAA';
      else if (passRate >= 85) processed.grade = 'AA';
      else if (passRate >= 75) processed.grade = 'A';
      else if (passRate >= 60) processed.grade = 'B';
      else if (passRate >= 45) processed.grade = 'C';
      else processed.grade = 'D';
    }

    // Build executive summary rows from category aggregates
    const categoryOrder = ['Structure', 'MEP', 'Safety', 'Finishes', 'Exterior', 'General'];
    processed.categorySummary = categoryOrder
      .filter(cat => categoryGrades[cat] && categoryGrades[cat].length > 0)
      .map(cat => {
        const grade = this.worstGrade(categoryGrades[cat]) || 'A';
        return {
          category: cat,
          grade,
          meaning: this.gradeMeaning(grade),
          risk: this.riskFromGrade(grade),
          itemCount: categoryGrades[cat].length
        };
      });

    if (data.recommendations && Array.isArray(data.recommendations)) {
      processed.recommendations = data.recommendations
        .filter(rec => rec && (typeof rec === 'string' ? rec.trim() : rec.action || rec.issue))
        .map(rec => this.normalizeRecommendation(rec));
    }

    if (processed.recommendations.length === 0 && processed.affectedAreas.length > 0) {
      processed.recommendations = this.generateDefaultRecommendations(processed.affectedAreas);
    }

    return processed;
  }

  // Convert string or partial object recommendations into a uniform structured row.
  normalizeRecommendation(rec) {
    if (typeof rec === 'string') {
      const text = rec.trim();
      const colonIdx = text.indexOf(':');
      const issue = colonIdx > -1 ? text.slice(0, colonIdx).trim() : 'General';
      const action = colonIdx > -1 ? text.slice(colonIdx + 1).trim() : text;
      const priority = this.inferPriority(action);
      return {
        issue: issue || 'General',
        priority,
        action: action || text,
        timeline: this.timelineFor(priority),
        cost: 'TBD'
      };
    }
    const priority = rec.priority || this.inferPriority(rec.action || rec.issue || '');
    return {
      issue: rec.issue || 'General',
      priority,
      action: rec.action || '',
      timeline: rec.timeline || this.timelineFor(priority),
      cost: rec.cost || 'TBD'
    };
  }

  inferPriority(text = '') {
    const t = String(text).toLowerCase();
    if (/safety|leak|electric|gas|fire|hazard|broken|crack|mold|structural|urgent/.test(t)) return 'High';
    if (/replace|repair|fix|address|service/.test(t)) return 'Medium';
    return 'Low';
  }

  timelineFor(priority) {
    if (priority === 'High') return 'Within 30 days';
    if (priority === 'Medium') return 'Within 60 days';
    return 'Within 90 days';
  }

  // Severity grading: A (Good), B (Minor), C (Moderate), D (Major), E (Critical)
  inferGrade(item) {
    const status = (item.status || '').toLowerCase();
    const comment = (item.comments || '').toLowerCase();

    if (status === 'pass') {
      return comment && comment !== 'no comments' && comment !== 'no additional comments' ? 'B' : 'A';
    }
    if (status === 'n/a' || status === 'na') return null;

    // Fail — grade by severity keywords
    if (/safety|hazard|fire|gas|electric shock|exposed wir|short circuit|structural|collapse|severe|critical|urgent/.test(comment)) return 'E';
    if (/leak|mold|crack|broken|water damage|pest|infestation|major|not working|failed/.test(comment)) return 'D';
    if (/minor|small|hairline|cosmetic|stain|discolor|scratch|chip/.test(comment)) return 'C';
    return 'D';
  }

  gradeMeaning(grade) {
    return ({ A: 'Good', B: 'Minor', C: 'Moderate', D: 'Major', E: 'Critical' })[grade] || grade;
  }

  riskFromGrade(grade) {
    if (grade === 'E' || grade === 'D') return 'High';
    if (grade === 'C') return 'Medium';
    return 'Low';
  }

  // Worst grade rank — A=1, E=5 — used to pick the dominant grade per category
  gradeRank(grade) {
    return ({ A: 1, B: 2, C: 3, D: 4, E: 5 })[grade] || 0;
  }

  worstGrade(grades) {
    let worst = null;
    grades.forEach(g => {
      if (g && (!worst || this.gradeRank(g) > this.gradeRank(worst))) worst = g;
    });
    return worst;
  }

  // Category bucketing — groups items into business categories for the executive summary
  categoryFor(itemName = '') {
    const n = String(itemName).toLowerCase();
    if (/wall|ceiling|floor|foundation|beam|column|slab|roof structure|crack|structural/.test(n)) return 'Structure';
    if (/water|pipe|plumb|drain|sewer|electric|wiring|outlet|switch|breaker|ac\b|hvac|cool|heat|hot water|tank|ventilation|gas\b|panel/.test(n)) return 'MEP';
    if (/fire|alarm|smoke|exit|emergency|safety|extinguish/.test(n)) return 'Safety';
    if (/paint|tile|marble|wood|finish|cabinet|door|window|joinery/.test(n)) return 'Finishes';
    if (/roof|garden|driveway|garage|exterior|facade|landscape|fence|gate/.test(n)) return 'Exterior';
    return 'General';
  }

  // Build complete HTML with enhanced print optimization
  async buildCompleteHTML(data) {
    const { size, orientation, margin } = this.page;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Property Inspection Report - ${this.escapeHTML(data.client)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --brand-primary: #1e3a8a;
            --brand-accent: #059669;
            --brand-grey-50: #f9fafb;
            --brand-grey-100: #f3f4f6;
            --brand-grey-200: #e5e7eb;
            --brand-grey-300: #d1d5db;
            --brand-grey-500: #6b7280;
            --brand-grey-700: #374151;
            --brand-grey-900: #111827;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 9pt;
            line-height: 1.4;
            color: #333;
            background: #f5f5f5;
        }

        .font-cairo {
            font-family: 'Cairo', 'Arabic Typesetting', 'Traditional Arabic', Arial, sans-serif;
            line-height: 1.5;
        }

        .toolbar {
            position: fixed;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
            z-index: 99999;
            pointer-events: auto;
        }

        .toolbar-btn {
            padding: 12px 24px;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            font-weight: 600;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: all 0.2s;
            font-size: 14px;
            pointer-events: auto;
        }

        .toolbar-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 8px rgba(0,0,0,0.15);
        }

        .toolbar-btn:active {
            transform: translateY(0);
        }

        .toolbar-btn:focus {
            outline: 2px solid #10b981;
            outline-offset: 2px;
        }

        .print-button {
            background: #10b981;
            color: white;
        }

        .print-button:hover {
            background: #059669;
        }

        .back-button {
            background: #6b7280;
            color: white;
        }

        .back-button:hover {
            background: #4b5563;
        }

        .report-container {
            max-width: 900px;
            margin: 20px auto;
            background: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            position: relative;
            z-index: 1;
        }

        .page {
            padding: 25mm 20mm 25mm 20mm;
            background: white;
            position: relative;
            box-sizing: border-box;
            margin: 0 auto 20px auto;
            max-width: 900px;
        }

        .page::before {
            content: "";
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 400px;
            height: 400px;
            background-image: url('${this.config.company.logo}');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            opacity: 0.05;
            z-index: 0;
            pointer-events: none;
        }

        .content {
            position: relative;
            z-index: 1;
        }

        .header-logo {
            text-align: center;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--brand-grey-200);
        }

        .header-logo img {
            width: 84px;
            height: auto;
            max-width: 100%;
        }

        /* Cover page header — Logo | Title | Report Info */
        .cover-header {
            display: grid;
            grid-template-columns: auto 1fr auto;
            gap: 16px;
            align-items: center;
            padding: 14px 18px;
            background: var(--brand-grey-50);
            border: 1px solid var(--brand-grey-200);
            border-top: 3px solid var(--brand-accent);
            border-radius: 8px;
            margin-bottom: 14px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .cover-header-logo img {
            width: 78px;
            height: auto;
            display: block;
        }

        .cover-header-title h1 {
            text-align: center;
            font-size: 16pt;
            font-weight: 700;
            color: var(--brand-primary);
            line-height: 1.15;
            letter-spacing: 0.3px;
            margin: 0;
        }

        .cover-header-title .subtitle {
            text-align: center;
            font-size: 8pt;
            color: var(--brand-grey-500);
            margin-top: 4px;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }

        .cover-header-info {
            min-width: 200px;
            font-size: 7.8pt;
            line-height: 1.5;
            color: var(--brand-grey-700);
            border-left: 2px solid var(--brand-grey-200);
            padding-left: 14px;
        }

        .cover-header-info p {
            margin: 0 0 2px 0;
        }

        .cover-header-info strong {
            color: var(--brand-primary);
            font-weight: 600;
        }

        .report-title {
            text-align: center;
            font-size: 18pt;
            font-weight: 700;
            color: var(--brand-primary);
            margin-bottom: 10px;
            letter-spacing: 0.3px;
        }

        .overview-box {
            background: var(--brand-grey-100);
            border: 1px solid var(--brand-grey-200);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 10px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .overview-header {
            text-align: center;
            font-size: 11pt;
            font-weight: 700;
            color: var(--brand-primary);
            margin-bottom: 10px;
            border-bottom: 2px solid var(--brand-accent);
            padding-bottom: 5px;
            letter-spacing: 0.3px;
        }

        .two-column {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0;
            margin-bottom: 8px;
        }

        .two-column > .column {
            padding: 0 14px;
        }

        .two-column > .column:first-child {
            padding-left: 0;
            border-right: 1px solid var(--brand-grey-200);
        }

        .two-column > .column:last-child {
            padding-right: 0;
        }

        .column {
            font-size: 7.8pt;
            line-height: 1.45;
        }

        .column p {
            margin-bottom: 5px;
        }

        .column strong {
            font-weight: 600;
        }

        .section-title {
            font-size: 10.5pt;
            font-weight: 700;
            color: var(--brand-primary);
            margin: 0 0 12px 0;
            padding: 9px 14px;
            background: var(--brand-grey-100);
            border-left: 4px solid var(--brand-accent);
            border-radius: 4px;
            letter-spacing: 0.3px;
            text-transform: uppercase;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .area-block {
            border: 1px solid var(--brand-grey-200);
            border-radius: 8px;
            padding: 14px 14px 14px 14px;
            margin-bottom: 18px;
            background: #ffffff;
        }

        .area-block table {
            margin: 0;
        }

        .area-block .photo-grid {
            margin-top: 12px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }

        th, td {
            border: 1px solid #d1d5db;
            padding: 6px;
            text-align: left;
            font-size: 8pt;
        }

        th {
            background: #f3f4f6;
            font-weight: 600;
        }

        .status-pass {
            background-color: #dcfce7;
            color: #166534;
            padding: 3px 6px;
            border-radius: 10px;
            font-size: 7pt;
            font-weight: 500;
            display: inline-block;
        }

        .status-fail {
            background-color: #fee2e2;
            color: #991b1b;
            padding: 3px 6px;
            border-radius: 10px;
            font-size: 7pt;
            font-weight: 500;
            display: inline-block;
        }

        .status-na {
            background-color: #f3f4f6;
            color: #374151;
            padding: 3px 6px;
            border-radius: 10px;
            font-size: 7pt;
            font-weight: 500;
            display: inline-block;
        }

        .signature-section {
            margin-top: 14px;
            padding-top: 10px;
            border-top: 2px solid #e5e7eb;
        }

        .signature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 10px;
        }

        .signature-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #d1d5db;
            font-size: 8pt;
        }

        .footer-note {
            text-align: center;
            margin-top: 16px;
            padding: 10px;
            background: #f9fafb;
            border-radius: 6px;
        }

        .findings-page {
            min-height: auto;
        }

        .photo-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10px;
            margin-top: 12px;
        }

        .photo-item {
            border: 1px solid var(--brand-grey-300);
            border-radius: 6px;
            overflow: hidden;
            background: white;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            page-break-inside: avoid;
            break-inside: avoid;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .photo-frame {
            position: relative;
            width: 100%;
            aspect-ratio: 4 / 3;
            background: var(--brand-grey-100);
            overflow: hidden;
        }

        .photo-frame img {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }

        .photo-caption {
            padding: 6px 8px 7px 8px;
            background: var(--brand-grey-50);
            border-top: 1px solid var(--brand-grey-200);
            font-size: 6.8pt;
            color: var(--brand-grey-700);
            line-height: 1.35;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .photo-caption .caption-label {
            display: block;
            color: var(--brand-accent);
            font-weight: 700;
            font-size: 6.5pt;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 1px;
        }

        .photo-caption .caption-text {
            display: block;
            color: var(--brand-grey-900);
            font-weight: 500;
        }

        h3 {
            font-size: 8.5pt;
            font-weight: 700;
            margin-bottom: 4px;
        }

        .info-box {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            padding: 8px 12px;
            border-radius: 6px;
            margin: 8px 0;
        }

        .recommendations-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin-top: 10px;
            border: 1px solid var(--brand-grey-200);
            border-radius: 6px;
            overflow: hidden;
        }

        .recommendations-table th {
            background: var(--brand-primary);
            color: white;
            font-weight: 600;
            font-size: 7.8pt;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            padding: 8px 10px;
            text-align: left;
            border: none;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .recommendations-table td {
            padding: 8px 10px;
            font-size: 8pt;
            border: none;
            border-bottom: 1px solid var(--brand-grey-200);
            vertical-align: top;
        }

        .recommendations-table tbody tr:nth-child(even) td {
            background: var(--brand-grey-50);
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .recommendations-table tbody tr:last-child td {
            border-bottom: none;
        }

        .priority-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 7pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .priority-high {
            background: #fee2e2;
            color: #991b1b;
        }

        .priority-medium {
            background: #fef3c7;
            color: #92400e;
        }

        .priority-low {
            background: #dcfce7;
            color: #166534;
        }

        /* Severity grade badges A-E */
        .grade-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 22px;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 8pt;
            font-weight: 800;
            letter-spacing: 0.5px;
            border: 1px solid transparent;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .grade-a { background: #dcfce7; color: #166534; border-color: #86efac; }
        .grade-b { background: #ecfccb; color: #3f6212; border-color: #bef264; }
        .grade-c { background: #fef3c7; color: #92400e; border-color: #fcd34d; }
        .grade-d { background: #ffedd5; color: #9a3412; border-color: #fdba74; }
        .grade-e { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }

        .risk-pill {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 7pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .risk-low { background: #dcfce7; color: #166534; }
        .risk-medium { background: #fef3c7; color: #92400e; }
        .risk-high { background: #fee2e2; color: #991b1b; }

        /* Executive Summary */
        .executive-summary {
            margin-bottom: 14px;
        }

        .summary-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border: 1px solid var(--brand-grey-200);
            border-radius: 6px;
            overflow: hidden;
        }

        .summary-table th {
            background: var(--brand-primary);
            color: white;
            font-weight: 600;
            font-size: 7.8pt;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            padding: 7px 10px;
            text-align: left;
            border: none;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .summary-table td {
            padding: 7px 10px;
            font-size: 8.5pt;
            border: none;
            border-bottom: 1px solid var(--brand-grey-200);
            vertical-align: middle;
        }

        .summary-table tbody tr:nth-child(even) td {
            background: var(--brand-grey-50);
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .summary-table tbody tr:last-child td {
            border-bottom: none;
        }

        .grade-legend {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 6px;
            font-size: 6.8pt;
            color: var(--brand-grey-500);
        }

        .grade-legend span { white-space: nowrap; }

        @media print {
            html, body {
                width: 210mm;
            }

            body {
                background: white;
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }

            .toolbar {
                display: none !important;
            }

            .report-container {
                max-width: 100%;
                margin: 0;
                box-shadow: none;
                width: 100%;
            }

            .page {
                padding: 0;
                page-break-after: always;
                break-after: page;
                box-sizing: border-box;
                width: 100%;
                height: auto;
                margin: 0;
                overflow: visible;
            }

            .page::before {
                display: none !important;
            }

            .page:last-child {
                page-break-after: auto;
                break-after: auto;
            }

            /* Findings flow naturally across pages */
            .findings-page {
                padding: 0;
                page-break-inside: auto;
                break-inside: auto;
                page-break-after: auto;
                break-after: auto;
            }

            @page {
                size: ${size} ${orientation};
                margin: ${margin};
                @bottom-left {
                    content: "Wasla Property Solutions";
                    font-size: 7.5pt;
                    color: #6b7280;
                    font-family: 'Inter', sans-serif;
                }
                @bottom-center {
                    content: "Confidential";
                    font-size: 7.5pt;
                    color: #9ca3af;
                    font-family: 'Inter', sans-serif;
                    letter-spacing: 0.5px;
                }
                @bottom-right {
                    content: "Page " counter(page) " of " counter(pages);
                    font-size: 7.5pt;
                    color: #6b7280;
                    font-family: 'Inter', sans-serif;
                }
            }

            .no-break,
            .header-logo {
                page-break-inside: avoid;
                break-inside: avoid;
                page-break-after: avoid;
                break-after: avoid;
            }

            /* Keep section titles attached to the content that follows */
            .section-title {
                page-break-after: avoid;
                break-after: avoid;
                page-break-inside: avoid;
                break-inside: avoid;
            }

            /* Each inspection section (Majlis, Hall, etc.) stays intact as one block.
               Browser falls back to splitting only if a section is taller than one page. */
            .area-block,
            .section-card,
            .recommendations-block {
                page-break-inside: avoid;
                break-inside: avoid;
                page-break-before: auto;
                break-before: auto;
            }

            /* Allow page breaks BETWEEN sections (default), not inside */
            .area-block + .area-block,
            .area-block + .recommendations-block {
                page-break-before: auto;
                break-before: auto;
            }

            table {
                page-break-inside: auto;
                break-inside: auto;
                width: 100%;
            }

            thead {
                display: table-header-group;
            }

            tbody {
                display: table-row-group;
            }

            tr {
                page-break-inside: avoid;
                break-inside: avoid;
            }

            img {
                max-width: 100%;
                height: auto;
                page-break-inside: avoid;
                break-inside: avoid;
            }

            .photo-grid {
                break-inside: auto;
                page-break-inside: auto;
            }

            .photo-item {
                break-inside: avoid;
                page-break-inside: avoid;
            }

            .status-pass, .status-fail, .status-na,
            .overview-box, .info-box {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }

            th {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                background: #f3f4f6 !important;
            }

            p, li {
                orphans: 3;
                widows: 3;
            }

            h1, h2, h3 {
                page-break-after: avoid;
                break-after: avoid;
            }
        }

        @media screen {
            .page {
                min-height: 277mm;
            }
            .findings-page {
                min-height: auto;
            }
        }
    </style>
</head>
<body>
    ${this.embedMode ? '' : `<div class="toolbar">
        <button class="toolbar-btn back-button"
                onclick="handleBack()"
                aria-label="Return to application"
                title="Close report and return to app">
            ← Back to App
        </button>
        <button class="toolbar-btn print-button"
                id="printButton"
                onclick="handlePrint()"
                aria-label="Print inspection report"
                title="Print or save this report as PDF">
            🖨️ Print Report
        </button>
    </div>`}

    <div class="report-container">
        ${this.renderOverviewPage(data)}
        ${this.renderScopeAndConfidentialityPage(data)}
        ${this.renderFindingsPages(data)}
    </div>

    <script>
        function handleBack() {
            try {
                if (window.opener && !window.opener.closed) {
                    window.opener.focus();
                }
                window.close();
            } catch (e) {
                // Fallback: if window.close() is blocked, navigate to app
                window.location.href = '/Inspections';
            }
        }

        function handlePrint() {
            try {
                console.log('Print button clicked');
                window.print();
            } catch (error) {
                console.error('Print error:', error);
                alert('Unable to print. Please use your browser\\'s print function (Ctrl+P or Cmd+P)');
            }
        }

        document.addEventListener('DOMContentLoaded', function() {
            const btn = document.getElementById('printButton');
            console.log('Print button loaded:', btn);
            console.log('Button position:', btn ? btn.getBoundingClientRect() : 'not found');
        });

        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                handlePrint();
            }
        });
    </script>
</body>
</html>`;
  }

  renderExecutiveSummary(data) {
    if (!data.categorySummary || data.categorySummary.length === 0) return '';
    const rows = data.categorySummary.map(row => `
      <tr>
        <td><strong>${this.escapeHTML(row.category)}</strong> <span style="color: var(--brand-grey-500); font-size: 7.5pt;">(${row.itemCount} ${row.itemCount === 1 ? 'item' : 'items'})</span></td>
        <td><span class="grade-badge grade-${row.grade.toLowerCase()}">${this.escapeHTML(row.grade)}</span> <span style="color: var(--brand-grey-700); font-size: 7.5pt;">${this.escapeHTML(row.meaning)}</span></td>
        <td><span class="risk-pill risk-${row.risk.toLowerCase()}">${this.escapeHTML(row.risk)}</span></td>
      </tr>
    `).join('');

    return `
      <div class="executive-summary">
        <h2 class="section-title">Executive Summary</h2>
        <table class="summary-table">
          <thead>
            <tr>
              <th style="width: 42%;">Category</th>
              <th style="width: 32%;">Grade</th>
              <th style="width: 26%;">Risk</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="grade-legend">
          <span><span class="grade-badge grade-a">A</span>&nbsp;Good</span>
          <span><span class="grade-badge grade-b">B</span>&nbsp;Minor</span>
          <span><span class="grade-badge grade-c">C</span>&nbsp;Moderate</span>
          <span><span class="grade-badge grade-d">D</span>&nbsp;Major</span>
          <span><span class="grade-badge grade-e">E</span>&nbsp;Critical</span>
        </div>
      </div>
    `;
  }

  renderOverviewPage(data) {
    const gradeColor = data.grade === 'D' ? '#dc2626' : data.grade === 'C' ? '#f59e0b' : '#059669';
    return `
    <div class="page">
        <div class="content">
            <div class="cover-header">
                <div class="cover-header-logo">
                    <img src="${this.config.company.logo}" alt="Wasla Logo" onerror="this.style.display='none'">
                </div>
                <div class="cover-header-title">
                    <h1>Property Inspection Report</h1>
                    <div class="subtitle">Wasla Property Solutions</div>
                </div>
                <div class="cover-header-info">
                    <p><strong>Report Ref:</strong> ${this.escapeHTML(data.reference)}</p>
                    <p><strong>Date:</strong> ${this.escapeHTML(data.date.en)}</p>
                    <p><strong>Inspector:</strong> ${this.escapeHTML(data.inspector)}</p>
                    <p><strong>Property:</strong> ${this.escapeHTML(data.propertyType)}</p>
                    <p><strong>Location:</strong> ${this.escapeHTML(data.location)}</p>
                    ${data.grade ? `<p><strong>Grade:</strong> <span style="font-weight: 700; color: ${gradeColor};">${this.escapeHTML(data.grade)}</span></p>` : ''}
                </div>
            </div>

            ${this.renderExecutiveSummary(data)}

            <div class="overview-box">
                <div class="overview-header">
                    OVERVIEW <span class="font-cairo">نظرة عامة</span>
                </div>
                
                <div class="two-column">
                    <div class="column">
                        <p>Dear <strong>${this.escapeHTML(data.client)}</strong></p>
                        <p>Thank you for choosing <strong>${this.escapeHTML(this.config.company.name)}</strong> to carry out the inspection of your property.</p>
                        <p>This report presents the inspection findings and measurements as documented on site on the date of the visit, and the presence of certain observations is common in property inspections.</p>
                        <p>Please review the attached report carefully before making your final decision. If you require any further clarification regarding the condition of the property, please feel free to contact us by phone or email between 9:00 a.m. and 5:00 p.m.</p>
                        <p><strong>Email:</strong> ${this.escapeHTML(this.config.company.email)}</p>
                        <p><strong>Mobile:</strong> ${this.escapeHTML(this.config.company.phone)}</p>
                    </div>
                    
                    <div class="column font-cairo" style="text-align: right;" dir="rtl">
                        <p>الأفاضل/ <strong>${this.escapeHTML(data.client)}</strong> المحترمون</p>
                        <p>نشكر لكم اختياركم <strong>"${this.escapeHTML(this.config.company.nameAr)}"</strong> للقيام بفحص العقار الخاص بكم.</p>
                        <p>يُقدم هذا التقرير نتائج الفحص والقياسات كما تم توثيقها ميدانيًا في تاريخ الزيارة، ووجود بعض الملاحظات يُعد أمر شائع في عمليات الفحص العقاري.</p>
                        <p>يرجى مراجعة التقرير المرفق بعناية قبل اتخاذ قراركم النهائي، و إذا كنتم بحاجة إلى توضيحات إضافية حول حالة العقار، فلا تترددوا بالتواصل معنا عبر الهاتف أو البريد الإلكتروني من الساعة 9 صباحًا حتى 5 مساءً على وسائل التواصل التالية:</p>
                        <p><strong>البريد الإلكتروني:</strong> ${this.escapeHTML(this.config.company.email)}</p>
                        <p><strong>الهاتف:</strong> ${this.escapeHTML(this.config.company.phone)}</p>
                    </div>
                </div>
            </div>

            <div class="two-column" style="margin-top: 8px;">
                <div class="column">
                    <h3>No property is perfect.</h3>
                    <p>Every building has imperfections or items that are ready for maintenance. It's the inspector's task to discover and report these so you can make informed decisions. This report should not be used as a tool to demean property, but rather as a way to illuminate the realities of the property.</p>
                </div>
                <div class="column font-cairo" style="text-align: right;" dir="rtl">
                    <h3>لا يوجد عقار مثالي</h3>
                    <p>كل عقار يحتوي على بعض العيوب أو الأجزاء التي تحتاج إلى صيانة. دور المفتش هو تحديد هذه النقاط وتقديمها بوضوح لمساعدتكم في اتخاذ قرارات مستنيرة. هذا التقرير لا يُقصد به التقليل من قيمة العقار، وإنما يهدف إلى توضيح الحالة الواقعية له.</p>
                </div>
            </div>

            <div class="two-column" style="margin-top: 8px;">
                <div class="column">
                    <h3>This report is not an appraisal.</h3>
                    <p>When an appraiser determines worth, only the most obvious conditions of a property are taken into account to establish a safe loan amount. In effect, the appraiser is representing the interests of the lender. Home inspectors focus more on the interests of the prospective buyer; and, although inspectors must be careful not to make any statements relating to property value, their findings can help buyers more completely understand the true costs of ownership.</p>
                </div>
                <div class="column font-cairo" style="text-align: right;" dir="rtl">
                    <h3>هذا التقرير ليس تقييمًا سعريًا</h3>
                    <p>عند قيام المثمن بتحديد قيمة العقار، فإنه يأخذ بعين الاعتبار فقط العيوب الظاهرة لتقدير مبلغ قرض آمن. بمعنى آخر، فإن المثمن يُمثل مصلحة الجهة المُقرضة. أما فاحص العقار، فيركز على مصلحة المشتري المحتمل. ورغم أن المفتش لا يحدد قيمة العقار، إلا أن نتائج الفحص تساعد المشتري في فهم التكاليف الحقيقية لامتلاك العقار.</p>
                </div>
            </div>

            <div class="two-column" style="margin-top: 8px;">
                <div class="column">
                    <h3>Maintenance costs are normal.</h3>
                    <p>Homeowners should plan to spend around 1% of the total value of a property in maintenance costs, annually. (Annual costs of rental property maintenance are often 2%, or more.) If considerably less than this percentage has been invested during several years preceding an inspection, the property will usually show the obvious signs of neglect; and the new property owners may be required to invest significant time and money to address accumulated maintenance needs.</p>
                </div>
                <div class="column font-cairo" style="text-align: right;" dir="rtl">
                    <h3>تكاليف الصيانة أمر طبيعي</h3>
                    <p>ينبغي على مالكي العقارات تخصيص ما يُعادل 1% من قيمة العقار سنويًا لأعمال الصيانة الدورية. أما العقارات المؤجرة فقد تصل النسبة إلى 2% أو أكثر. وإذا لم يتم استثمار هذه النسبة على مدى عدة سنوات، فستظهر مؤشرات واضحة على الإهمال، مما يُحتم على المالك الجديد دفع تكاليف كبيرة لاحقًا لمعالجة هذه الإهمالات.</p>
                </div>
            </div>
        </div>
    </div>`;
  }

  renderScopeAndConfidentialityPage(data) {
    return `
    <div class="page">
        <div class="content">
            <div class="header-logo">
                <img src="${this.config.company.logo}" alt="Wasla Logo" onerror="this.style.display='none'">
            </div>

            <div class="two-column">
                <div class="column">
                    <h3 style="font-size: 10pt; font-weight: 700; color: #4b5563; margin-bottom: 6px;">SCOPE OF THE INSPECTION:</h3>
                    <p>This report details the outcome of a visual survey of the property detailed in the annexed inspection checklist in order to check the quality of workmanship against applicable standards.</p>
                    <p>It covers both the interior and the exterior of the property as well as garden, driveway and garage if relevant. Areas not inspected, for whatever reason, cannot guarantee that these areas are free from defects.</p>
                    <p>This report was formed as per the client request as a supportive opinion to enable him to have better understanding about property conditions. Our opinion does not study the property value or the engineering of the structure rather it studies the functionality of the property. This report will be listing the property defects supported by images and videos, by showing full study of the standards of property status and functionality including other relevant elements of the property as stated in the checklist.</p>
                </div>
                <div class="column font-cairo" style="text-align: right;" dir="rtl">
                    <h3 style="font-size: 10pt; font-weight: 700; color: #4b5563; margin-bottom: 6px;">نطاق الفحص</h3>
                    <p>يوضح هذا التقرير نتيجة الفحص البصري للعقار كما هو مفصل في قائمة الفحص المرفقة، بهدف تقييم جودة التنفيذ مقارنة بالمعايير المعتمدة.</p>
                    <p>يشمل الفحص المناطق الداخلية والخارجية، بالإضافة إلى الحديقة، والممر، والجراج ( إن وُجد). كما لا يمكن ضمان خلو المناطق غير المفحوصة من العيوب لأي سببٍ كان.</p>
                    <p>وقد تم إعداد هذا التقرير بناءً على طلب العميل لتقديم رأي داعم يساعده على فهم حالة العقار بشكل أفضل. رأينا الفني لا يشمل تقييم القيمة السوقية أو التحليل الإنشائي، بل يركز على حالة العقار ووظائفه العامة. كما سيتم سرد العيوب المرصودة بناءً على دراسة كاملة لمعايير الحالة والأداء الوظيفي للعقار مشمولة بالصور والفيديوهات، إلى جانب العناصر الأخرى ذات الصلة كما هو موضح في قائمة الفحص.</p>
                </div>
            </div>

            <div class="two-column" style="margin-top: 8px;">
                <div class="column">
                    <h3 style="font-size: 10pt; font-weight: 700; color: #4b5563; margin-bottom: 6px;">CONFIDENTIALITY OF THE REPORT:</h3>
                    <p>The inspection report is to be prepared for the Client for the purpose of informing of the major deficiencies in the condition of the subject property and is solely and exclusively for Client's own information and may not be relied upon by any other person. Client may distribute copies of the inspection report to the seller and the real estate agents directly involved in this transaction, but Client and Inspector do not in any way intend to benefit said seller or the real estate agents directly or indirectly through this Agreement or the inspection report. In the event that the inspection report has been prepared for the SELLER of the subject property, an authorized representative of ${this.escapeHTML(this.config.company.name)} will return to the property, for a fee, to meet with the BUYER for a consultation to provide a better understanding of the reported conditions and answer.</p>
                </div>
                <div class="column font-cairo" style="text-align: right;" dir="rtl">
                    <h3 style="font-size: 10pt; font-weight: 700; color: #4b5563; margin-bottom: 6px;">سرية التقرير</h3>
                    <p>تم إعداد تقرير الفحص هذا خصيصًا للعميل بغرض إعلامه بالنواقص الجوهرية في حالة العقار محل الفحص، وهو للاستخدام الشخصي فقط ولا يجوز الاعتماد عليه من قبل أي طرف آخر. يجوز للعميل مشاركة نسخة من التقرير مع البائع أو وكلاء العقارات المعنيين بهذه الصفقة، إلا أن كل من العميل والفاحص لا يقصدان من خلال هذا التقرير تحقيق أي منفعة مباشرة أو غير مباشرة لهؤلاء الأطراف. وفي حال تم إعداد هذا التقرير بطلب من البائع، فإن ممثلًا معتمدًا من شركة ${this.escapeHTML(this.config.company.nameAr)} سيعود إلى العقار – مقابل رسوم – لعقد جلسة استشارية مع المشتري بهدف توضيح الملاحظات الواردة في التقرير والإجابة عن استفساراته.</p>
                </div>
            </div>

            <div class="signature-section">
                <div class="signature-grid">
                    <div>
                        <div class="signature-row">
                            <span style="font-weight: 600;">Client Name:</span>
                            <span>${this.escapeHTML(data.client)}</span>
                        </div>
                        <div class="signature-row">
                            <span style="font-weight: 600;">Signature:</span>
                            <span style="color: #9ca3af;">_____________________</span>
                        </div>
                        <div class="signature-row">
                            <span style="font-weight: 600;">Prepared by:</span>
                            <span>${this.escapeHTML(data.inspector)}</span>
                        </div>
                        <div class="signature-row">
                            <span style="font-weight: 600;">Stamp</span>
                            <span style="color: #9ca3af;">_____________________</span>
                        </div>
                        <div class="signature-row">
                            <span style="font-weight: 600;">Date:</span>
                            <span>${this.escapeHTML(data.date.en)}</span>
                        </div>
                    </div>
                    <div class="font-cairo" style="text-align: right;" dir="rtl">
                        <div class="signature-row">
                            <span>${this.escapeHTML(data.client)}</span>
                            <span style="font-weight: 600;">:اسم العميل</span>
                        </div>
                        <div class="signature-row">
                            <span style="color: #9ca3af;">_____________________</span>
                            <span style="font-weight: 600;">:التوقيع</span>
                        </div>
                        <div class="signature-row">
                            <span>${this.escapeHTML(data.inspector)}</span>
                            <span style="font-weight: 600;">:أعد التقرير بواسطة</span>
                        </div>
                        <div class="signature-row">
                            <span style="color: #9ca3af;">_____________________</span>
                            <span style="font-weight: 600;">الختم</span>
                        </div>
                        <div class="signature-row">
                            <span>${this.escapeHTML(data.date.ar)}</span>
                            <span style="font-weight: 600;">:التاريخ</span>
                        </div>
                    </div>
                </div>

                <div class="footer-note">
                    <p style="font-weight: 600; margin-bottom: 4px; font-size: 8pt;">Property Inspection report is annexed | مرفق تقرير الفحص</p>
                    <p style="font-size: 7pt; color: #6b7280;">${this.escapeHTML(this.config.company.name)} CR. ${this.escapeHTML(this.config.company.registration)} | ${this.escapeHTML(this.config.company.nameAr)} س ت ${this.escapeHTML(this.config.company.registration)}</p>
                </div>
            </div>
        </div>
    </div>`;
  }

  renderFindingsPages(data) {
    let findingsContent = '';

    if (data.affectedAreas && data.affectedAreas.length > 0) {
      data.affectedAreas.forEach((area) => {
        findingsContent += `
                <div class="area-block section-card">
                <h2 class="section-title no-break">${this.escapeHTML(area.name)}</h2>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 30%;">Item</th>
                            <th style="width: 14%; text-align: center;">Grade</th>
                            <th style="width: 56%;">Comments</th>
                        </tr>
                    </thead>
                    <tbody>`;

        area.items.forEach(item => {
          const grade = item.grade;
          const gradeBadge = grade
            ? `<span class="grade-badge grade-${grade.toLowerCase()}" title="${this.escapeHTML(this.gradeMeaning(grade))}">${this.escapeHTML(grade)}</span>`
            : `<span class="status-na">N/A</span>`;

          findingsContent += `
                        <tr>
                            <td>${this.escapeHTML(item.name)}</td>
                            <td style="text-align: center;">${gradeBadge}</td>
                            <td>${this.escapeHTML(item.comments || 'No comments')}</td>
                        </tr>`;
        });

        findingsContent += `
                    </tbody>
                </table>`;

        if (area.photos && area.photos.length > 0) {
          findingsContent += `<div class="photo-grid">`;
          area.photos.forEach(photo => {
            const itemName = photo.itemName || 'Inspection point';
            const description = photo.description || '';
            const altText = `${itemName}: ${description}`;
            findingsContent += `
                    <div class="photo-item">
                        <div class="photo-frame">
                            <img src="${photo.url}"
                                 alt="${this.escapeHTML(altText)}"
                                 onerror="this.src='${this.config.company.placeholderImage}'">
                        </div>
                        <div class="photo-caption">
                            <span class="caption-label">${this.escapeHTML(itemName)}</span>
                            <span class="caption-text">${this.escapeHTML(description)}</span>
                        </div>
                    </div>`;
          });
          findingsContent += `</div>`;
        }
        findingsContent += `</div>`;
      });
    }

    // Recommendations section as a structured action-items table
    if (data.recommendations && data.recommendations.length > 0) {
      findingsContent += `
                <div class="recommendations-block" style="margin-top: 22px;">
                <h2 class="section-title no-break">Action Items &amp; Recommendations</h2>
                <table class="recommendations-table">
                    <thead>
                        <tr>
                            <th style="width: 26%;">Issue</th>
                            <th style="width: 12%;">Priority</th>
                            <th style="width: 32%;">Action</th>
                            <th style="width: 16%;">Timeline</th>
                            <th style="width: 14%;">Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.recommendations.map(rec => {
                          const priority = (rec.priority || 'Low');
                          const priorityClass = priority.toLowerCase() === 'high' ? 'priority-high'
                            : priority.toLowerCase() === 'medium' ? 'priority-medium'
                            : 'priority-low';
                          return `
                        <tr>
                            <td>${this.escapeHTML(rec.issue || '')}</td>
                            <td><span class="priority-badge ${priorityClass}">${this.escapeHTML(priority)}</span></td>
                            <td>${this.escapeHTML(rec.action || '')}</td>
                            <td>${this.escapeHTML(rec.timeline || '')}</td>
                            <td>${this.escapeHTML(rec.cost || '')}</td>
                        </tr>`;
                        }).join('')}
                    </tbody>
                </table>
                </div>`;
    }

    // Wrap all findings in a single flowing page container
    return `
        <div class="page findings-page">
            <div class="content">
                <div class="header-logo no-break">
                    <img src="${this.config.company.logo}" alt="Wasla Logo" onerror="this.style.display='none'">
                </div>
                <h1 style="font-size: 14pt; font-weight: 700; text-align: center; margin-bottom: 14px; color: var(--brand-primary); letter-spacing: 0.3px;">Inspection Findings</h1>
                ${findingsContent}
            </div>
        </div>`;
  }

  // Enhanced date formatting with bilingual support
  formatDate(dateString) {
    const date = new Date(dateString);
    return {
      en: date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      ar: date.toLocaleDateString('ar-SA', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    };
  }

  formatPropertyType(type) {
    const types = {
      'villa': 'Villa',
      'apartment': 'Apartment', 
      'building': 'Building',
      'office': 'Office'
    };
    return types[type] || type || 'Property';
  }

  generateDefaultRecommendations(affectedAreas) {
    const recommendations = [];
    affectedAreas.forEach(area => {
      const failedItems = area.items.filter(item => item.status.toLowerCase() === 'fail');
      failedItems.forEach(item => {
        const action = item.comments && item.comments !== 'No comments'
          ? `Repair/address: ${item.comments}`
          : `Repair/replace "${item.name}"`;
        const priority = this.riskFromGrade(item.grade) === 'High' ? 'High'
                       : this.riskFromGrade(item.grade) === 'Medium' ? 'Medium'
                       : this.inferPriority(`${item.name} ${item.comments || ''}`);
        recommendations.push({
          issue: `${area.name} — ${item.name}`,
          grade: item.grade,
          priority,
          action,
          timeline: this.timelineFor(priority),
          cost: 'TBD'
        });
      });
    });

    if (recommendations.length === 0) {
      recommendations.push({
        issue: 'Routine maintenance',
        priority: 'Low',
        action: 'Continue regular maintenance schedule',
        timeline: 'Ongoing',
        cost: '—'
      });
      recommendations.push({
        issue: 'Next inspection',
        priority: 'Low',
        action: 'Schedule next inspection per maintenance calendar',
        timeline: '12 months',
        cost: '—'
      });
    }

    return recommendations;
  }
}

export async function generateInspectionReport(inspectionData, options = {}) {
  const generator = new InspectionReportGenerator();
  return await generator.generateReport(inspectionData, options);
}

export async function buildInspectionReportHTML(inspectionData, options = {}) {
  const generator = new InspectionReportGenerator();
  return await generator.buildHTML(inspectionData, { ...options, embedMode: true });
}

export { InspectionReportGenerator };