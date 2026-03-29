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
        margin: options.margin || '0'
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

    const processed = {
      reference: `WSL-${Date.now().toString().slice(-6)}`,
      date: this.formatDate(data.inspection_date || new Date().toISOString()),
      client: data.client_name || 'Client',
      propertyType: this.formatPropertyType(data.property_type || ''),
      location: data.location || 'Property Location',
      inspector: data.inspector_name || 'Inspector',
      affectedAreas: [],
      recommendations: []
    };

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
            
            const hasIssue = status === 'Fail';
            const hasComments = status === 'Pass' && item.comments && item.comments !== 'No additional comments';
            const hasPhotos = item.photos && item.photos.length > 0;

            if (hasIssue || hasComments || hasPhotos) {
              affectedItems.push({
                name: item.point || item.category || 'Inspection Point',
                status: status,
                comments: item.comments || ''
              });

              if (item.photos && Array.isArray(item.photos)) {
                item.photos.forEach(photo => {
                  if (photo.url) {
                    areaPhotos.push({
                      url: photo.url,
                      caption: `${item.point || item.category}: ${photo.description || item.comments || 'Inspection photo'}`
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

    if (data.recommendations && Array.isArray(data.recommendations)) {
      processed.recommendations = data.recommendations.filter(rec => rec && rec.trim());
    }

    if (processed.recommendations.length === 0 && processed.affectedAreas.length > 0) {
      processed.recommendations = this.generateDefaultRecommendations(processed.affectedAreas);
    }

    return processed;
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
            max-width: 210mm;
            margin: 20px auto;
            background: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            position: relative;
            z-index: 1;
        }

        .page {
            padding: 10mm 12mm 10mm 12mm;
            background: white;
            position: relative;
            box-sizing: border-box;
            margin-bottom: 20px;
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
            margin-bottom: 6px;
        }

        .header-logo img {
            width: 90px;
            height: auto;
            max-width: 100%;
        }

        .report-title {
            text-align: center;
            font-size: 18pt;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 10px;
        }

        .overview-box {
            background: #e8e9eb;
            padding: 10px;
            margin-bottom: 8px;
        }

        .overview-header {
            text-align: center;
            font-size: 11pt;
            font-weight: 600;
            color: #4b5563;
            margin-bottom: 8px;
            border-bottom: 2px solid #9ca3af;
            padding-bottom: 4px;
        }

        .two-column {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 8px;
        }

        .column {
            font-size: 7.8pt;
            line-height: 1.35;
        }

        .column p {
            margin-bottom: 4px;
        }

        .column strong {
            font-weight: 600;
        }

        .section-title {
            font-size: 9.5pt;
            font-weight: 700;
            color: #1f2937;
            margin: 10px 0 6px 0;
            padding-bottom: 3px;
            border-bottom: 2px solid #e5e7eb;
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

        .photo-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 12px;
        }

        .photo-item {
            border: 1px solid #d1d5db;
            border-radius: 6px;
            overflow: hidden;
            page-break-inside: avoid;
            break-inside: avoid;
        }

        .photo-item img {
            width: 100%;
            height: 130px;
            object-fit: cover;
            display: block;
        }

        .photo-caption {
            padding: 6px;
            background: #f9fafb;
            font-size: 7pt;
            color: #4b5563;
            line-height: 1.3;
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

        @media print {
            html, body {
                width: 210mm;
            }

            body {
                background: white;
                margin: 0;
                padding: 0;
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
                padding: 10mm 12mm 10mm 12mm;
                page-break-after: always;
                page-break-inside: avoid;
                break-after: page;
                break-inside: avoid;
                box-sizing: border-box;
                width: 100%;
                height: auto;
                margin: 0;
                overflow: visible;
            }

            .page:last-child {
                page-break-after: auto;
                break-after: auto;
            }

            @page {
                size: ${size} ${orientation};
                margin: ${margin};
            }

            .no-break,
            .section-title,
            .header-logo {
                page-break-inside: avoid;
                break-inside: avoid;
                page-break-after: avoid;
                break-after: avoid;
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
                break-inside: avoid;
                page-break-inside: avoid;
            }

            .photo-item {
                break-inside: avoid;
                page-break-inside: avoid;
            }

            .status-pass, .status-fail, .status-na {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }

            .overview-box {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }

            th {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                background: #f3f4f6 !important;
            }

            .info-box {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }

            .two-column {
                orphans: 3;
                widows: 3;
            }
        }

        @media screen {
            .page {
                min-height: 277mm;
            }
        }
    </style>
</head>
<body>
    <div class="toolbar">
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
    </div>
    
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

  renderOverviewPage(data) {
    return `
    <div class="page">
        <div class="content">
            <div class="header-logo">
                <img src="${this.config.company.logo}" alt="Wasla Logo" onerror="this.style.display='none'">
            </div>
            
            <h1 class="report-title">Property Inspection Report</h1>
            
            <div class="info-box two-column" style="margin-bottom: 10px;">
                <div class="column">
                    <p><strong>Report Ref:</strong> ${this.escapeHTML(data.reference)}</p>
                    <p><strong>Inspection Date:</strong> ${this.escapeHTML(data.date.en)}</p>
                    <p><strong>Inspector:</strong> ${this.escapeHTML(data.inspector)}</p>
                </div>
                <div class="column">
                    <p><strong>Property Type:</strong> ${this.escapeHTML(data.propertyType)}</p>
                    <p><strong>Location:</strong> ${this.escapeHTML(data.location)}</p>
                </div>
            </div>
            
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
    let pagesHtml = '';

    if (data.affectedAreas && data.affectedAreas.length > 0) {
      data.affectedAreas.forEach((area) => {
        pagesHtml += `
        <div class="page">
            <div class="content">
                <div class="header-logo no-break">
                    <img src="${this.config.company.logo}" alt="Wasla Logo" onerror="this.style.display='none'">
                </div>
                
                <h2 class="section-title no-break">${this.escapeHTML(area.name)}</h2>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 35%;">Item</th>
                            <th style="width: 15%; text-align: center;">Status</th>
                            <th style="width: 50%;">Comments</th>
                        </tr>
                    </thead>
                    <tbody>`;

        area.items.forEach(item => {
          const normalizedStatus = (item.status || 'n/a').toLowerCase();
          const statusClass = normalizedStatus === 'pass' ? 'status-pass' : 
                            normalizedStatus === 'fail' ? 'status-fail' : 'status-na';
          
          pagesHtml += `
                        <tr>
                            <td>${this.escapeHTML(item.name)}</td>
                            <td style="text-align: center;">
                                <span class="${statusClass}">${this.escapeHTML(item.status)}</span>
                            </td>
                            <td>${this.escapeHTML(item.comments || 'No comments')}</td>
                        </tr>`;
        });

        pagesHtml += `
                    </tbody>
                </table>`;

        if (area.photos && area.photos.length > 0) {
          pagesHtml += `<div class="photo-grid no-break">`;
          area.photos.forEach(photo => {
            pagesHtml += `
                    <div class="photo-item">
                        <img src="${photo.url}" 
                             alt="${this.escapeHTML(photo.caption)}" 
                             onerror="this.src='${this.config.company.placeholderImage}'">
                        <div class="photo-caption">
                            <p>${this.escapeHTML(photo.caption)}</p>
                        </div>
                    </div>`;
          });
          pagesHtml += `</div>`;
        }

        pagesHtml += `
            </div>
        </div>`;
      });
    }

    if (data.recommendations && data.recommendations.length > 0) {
      pagesHtml += `
        <div class="page">
            <div class="content">
                <div class="header-logo no-break">
                    <img src="${this.config.company.logo}" alt="Wasla Logo" onerror="this.style.display='none'">
                </div>
                
                <h2 class="section-title no-break">Action Items & Recommendations</h2>
                <div style="background: #fefce8; border-left: 4px solid #facc15; padding: 16px; border-radius: 4px; margin-top: 20px;">
                    <ul style="list-style: disc; margin-left: 20px; line-height: 1.8;">
                        ${data.recommendations.map(rec => `<li>${this.escapeHTML(rec)}</li>`).join('')}
                    </ul>
                </div>
            </div>
        </div>`;
    }

    return pagesHtml;
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
      if (failedItems.length > 0) {
        recommendations.push(`Address ${failedItems.length} identified issue(s) in ${area.name}`);
      }
    });
    
    if (recommendations.length === 0) {
      recommendations.push('Continue regular maintenance schedule');
    }
    
    return recommendations;
  }
}

export async function generateInspectionReport(inspectionData, options = {}) {
  const generator = new InspectionReportGenerator();
  return await generator.generateReport(inspectionData, options);
}

export { InspectionReportGenerator };