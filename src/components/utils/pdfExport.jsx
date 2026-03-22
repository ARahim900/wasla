// pdfExport.js - Complete working PDF export solution
import jsPDF from 'jspdf';

// Method 1: HTML to PDF with proper styling
export const exportHTMLToPDF = async (elementId, filename = 'document.pdf') => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id ${elementId} not found`);
    }

    // Dynamically import html2canvas
    const { default: html2canvas } = await import('html2canvas');

    // Configure html2canvas options
    const canvas = await html2canvas(element, {
      scale: 2, // Higher quality
      useCORS: true, // Handle external images
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: true,
      foreignObjectRendering: true
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add additional pages if content is longer
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('PDF Export Error:', error);
    return false;
  }
};

// Method 2: Direct text PDF (better for text-heavy documents)
export const exportTextToPDF = (title, content, filename = 'document.pdf') => {
  try {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text(title, 20, 20);
    
    // Add content with text wrapping
    doc.setFontSize(12);
    const splitText = doc.splitTextToSize(content, 170);
    doc.text(splitText, 20, 40);
    
    doc.save(filename);
    return true;
  } catch (error) {
    console.error('PDF Export Error:', error);
    return false;
  }
};

// Method 3: Using html2pdf.js (most reliable for complex HTML)
export const exportWithHtml2PDF = async (elementId, filename = 'document.pdf') => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id ${elementId} not found`);
    }

    // Dynamic import to avoid loading issues
    const html2pdf = (await import('html2pdf.js')).default;
    
    const options = {
      margin: 10,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true,
        allowTaint: true
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' 
      }
    };

    await html2pdf().set(options).from(element).save();
    return true;
  } catch (error) {
    console.error('PDF Export Error:', error);
    return false;
  }
};

// Method 4: Table/Data Export
export const exportTableToPDF = (tableData, headers, filename = 'table.pdf') => {
  try {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Data Export', 14, 22);
    
    // Create table
    let yPosition = 40;
    const cellWidth = 40;
    const cellHeight = 10;
    
    // Draw headers
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    headers.forEach((header, index) => {
      doc.text(header, 14 + (index * cellWidth), yPosition);
    });
    
    // Draw data
    doc.setFont(undefined, 'normal');
    tableData.forEach((row, rowIndex) => {
      yPosition += cellHeight;
      if (yPosition > 270) { // Check for page break
        doc.addPage();
        yPosition = 20;
      }
      row.forEach((cell, cellIndex) => {
        doc.text(String(cell), 14 + (cellIndex * cellWidth), yPosition);
      });
    });
    
    doc.save(filename);
    return true;
  } catch (error) {
    console.error('PDF Export Error:', error);
    return false;
  }
};

// Method 5: Inspection Report Generator (Your specific use case)
export const generateInspectionReport = async (inspection, client, property) => {
  try {
    // Create a temporary HTML element with the report content
    const reportElement = document.createElement('div');
    reportElement.id = 'inspection-report-temp';
    reportElement.style.position = 'absolute';
    reportElement.style.left = '-9999px';
    reportElement.style.width = '210mm';
    reportElement.style.backgroundColor = 'white';
    reportElement.style.padding = '20mm';
    reportElement.style.fontFamily = 'Arial, sans-serif';
    reportElement.style.fontSize = '12px';
    reportElement.style.lineHeight = '1.5';

    // Generate report HTML
    const clientName = inspection?.client_name || client?.name || 'Client';
    const inspectorName = inspection?.inspector_name || 'Professional Inspector';
    const inspectionDate = inspection?.inspection_date ? 
      new Date(inspection.inspection_date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');

    reportElement.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b44f73a9997833d114376d/f255c3751_image.png" 
             style="width: 150px; height: auto; margin-bottom: 20px;" 
             onerror="this.style.display='none'" />
        <h1 style="font-size: 24px; margin: 0; color: #333;">Property Inspection Report</h1>
      </div>

      <div style="background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
        <h2 style="margin: 0 0 15px 0; font-size: 18px; display: flex; justify-content: space-between;">
          <span>OVERVIEW</span>
          <span style="font-family: Arial, sans-serif;">نظرة عامة</span>
        </h2>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <div>
          <p><strong>Dear Mr. ${clientName},</strong></p>
          <p>Thank you for choosing Wasla Real Estate Solutions to carry out the inspection of your property.</p>
          <p>This report presents the inspection findings and measurements as documented on site on the date of the visit, and the presence of certain observations is common in property inspections.</p>
          <p>Please review the attached report carefully before making your final decision. If you require any further clarification regarding the condition of the property, please feel free to contact us by phone or email between 9:00 a.m. and 5:00 p.m.</p>
          <p><strong>Email:</strong> info@waslaoman.com</p>
          <p><strong>Mobile:</strong> +968 90699799</p>
          
          <h3>No property is perfect.</h3>
          <p>Every building has imperfections or items that are ready for maintenance. It's the inspector's task to discover and report these so you can make informed decisions. This report should not be used as a tool to demean property, but rather as a way to illuminate the realities of the property.</p>
          
          <h3>This report is not an appraisal.</h3>
          <p>When an appraiser determines worth, only the most obvious conditions of a property are taken into account to establish a safe loan amount. In effect, the appraiser is representing the interests of the lender. Home inspectors focus more on the interests of the prospective buyer.</p>
          
          <h3>Maintenance costs are normal.</h3>
          <p>Homeowners should plan to spend around 1% of the total value of a property in maintenance costs, annually. (Annual costs of rental property maintenance are often 2%, or more.)</p>
        </div>
        <div style="text-align: right; direction: rtl; font-family: Arial, sans-serif;">
          <p><strong>الأفاضل/ ${clientName} المحترمون،</strong></p>
          <p>نشكر لكم اختياركم "وصلة للحلول العقارية" للقيام بفحص العقار الخاص بكم.</p>
          <p>يُقدم هذا التقرير نتائج الفحص والقياسات كما تم توثيقها ميدانياً في تاريخ الزيارة، ووجود بعض الملاحظات يُعد أمر شائع في عمليات الفحص العقاري.</p>
          <p>يرجى مراجعة التقرير المرفق بعناية قبل اتخاذ قراركم النهائي، و إذا كنتم بحاجة إلى توضيحات إضافية حول حالة العقار، فلا تترددوا بالتواصل معنا عبر الهاتف أو البريد الإلكتروني من الساعة 9 صباحاً حتى 5 مساءً.</p>
          <p><strong>البريد الإلكتروني:</strong> info@waslaoman.com</p>
          <p><strong>الهاتف:</strong> +968 90699799</p>
          
          <h3>لا يوجد عقار مثالي</h3>
          <p>كل عقار يحتوي على بعض العيوب أو الأجزاء التي تحتاج إلى صيانة. دور المفتش هو تحديد هذه النقاط وتقديمها بوضوح لمساعدتكم في اتخاذ قرارات مستنيرة.</p>
          
          <h3>هذا التقرير ليس تقييماً سعرياً</h3>
          <p>عند قيام المثمن بتحديد قيمة العقار، فإنه يأخذ بعين الاعتبار فقط العيوب الظاهرة لتقدير مبلغ قرض آمن. أما فاحص العقار، فيركز على مصلحة المشتري المحتمل.</p>
          
          <h3>تكاليف الصيانة أمر طبيعي</h3>
          <p>ينبغي على مالكي العقارات تخصيص ما يُعادل 1% من قيمة العقار سنوياً لأعمال الصيانة الدورية.</p>
        </div>
      </div>

      <div style="page-break-before: always;">
        <div style="background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
          <h2 style="margin: 0; font-size: 18px; text-align: center;">INSPECTION DETAILS</h2>
        </div>
        
        <div style="margin-bottom: 20px;">
          <p><strong>Property Type:</strong> ${inspection.property_type || 'N/A'}</p>
          <p><strong>Inspection Date:</strong> ${inspectionDate}</p>
          <p><strong>Inspector:</strong> ${inspectorName}</p>
          <p><strong>Status:</strong> ${inspection.status || 'N/A'}</p>
        </div>

        ${inspection.areas && inspection.areas.length > 0 ? 
          inspection.areas.map(area => 
            area.items && area.items.length > 0 ? `
            <div style="margin-bottom: 30px;">
              <h3 style="background: #e5e5e5; padding: 10px; margin: 0 0 15px 0; border-radius: 3px;">${area.name}</h3>
              ${area.items.map(item => `
                <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 3px;">
                  <h4 style="margin: 0 0 5px 0;">• ${item.point || 'Inspection Point'}</h4>
                  ${item.location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${item.location}</p>` : ''}
                  ${item.status ? `<p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: ${item.status === 'Pass' ? 'green' : item.status === 'Fail' ? 'red' : 'gray'};">${item.status}</span></p>` : ''}
                  ${item.comments ? `<p style="margin: 5px 0;"><strong>Comments:</strong> ${item.comments}</p>` : ''}
                </div>
              `).join('')}
            </div>
            ` : ''
          ).join('') : '<p>No inspection details available.</p>'
        }
      </div>

      <div style="page-break-before: always; margin-top: 50px;">
        <div style="background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
          <h2 style="margin: 0; font-size: 18px; display: flex; justify-content: space-between;">
            <span>Client Information</span>
            <span style="font-family: Arial, sans-serif;">معلومات العميل</span>
          </h2>
        </div>
        
        <div style="margin-bottom: 30px;">
          <p><strong>Client Name:</strong> ${clientName} &nbsp;&nbsp;&nbsp; <strong>اسم العميل:</strong> ${clientName}</p>
          <p><strong>Signature:</strong> _________________________ &nbsp;&nbsp;&nbsp; <strong>التوقيع:</strong> _________________________</p>
          <p><strong>Prepared by:</strong> ${inspectorName} &nbsp;&nbsp;&nbsp; <strong>أعد التقرير بواسطة:</strong> ${inspectorName}</p>
          <p><strong>Stamp:</strong> _________________________ &nbsp;&nbsp;&nbsp; <strong>الختم:</strong> _________________________</p>
          <p><strong>Date:</strong> ${inspectionDate} &nbsp;&nbsp;&nbsp; <strong>التاريخ:</strong> ${inspectionDate}</p>
        </div>

        <div style="margin-top: 40px; font-size: 10px; text-align: center;">
          <p>Property Inspection report is annexed &nbsp;&nbsp;&nbsp; مرفق تقرير الفحص</p>
          <p>Wasla Property Solutions CR. 1068375 &nbsp;&nbsp;&nbsp; وصلة للحلول العقارية س ت 1068375</p>
        </div>
      </div>
    `;

    document.body.appendChild(reportElement);

    // Export using HTML to PDF
    const success = await exportHTMLToPDF('inspection-report-temp', `Wasla-Report-${clientName.replace(/ /g, '_')}-${new Date().toISOString().split('T')[0]}.pdf`);

    // Clean up
    document.body.removeChild(reportElement);

    return success;
  } catch (error) {
    console.error('Inspection Report Error:', error);
    return false;
  }
};