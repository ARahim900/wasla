import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { exportInspectionReport, createReportData } from "../utils/pdfExporter";

const EnhancedPDFExportButton = ({ 
  inspection,
  client,
  property,
  disabled = false,
  customData = null,
  filename = null
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const transformInspectionData = (inspection, client, property) => {
    // Transform your inspection data to the new format
    const clientName = inspection?.client_name || client?.name || 'Client';
    const inspectorName = inspection?.inspector_name || 'Professional Inspector';
    const inspectionDate = inspection?.inspection_date ? 
      new Date(inspection.inspection_date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
    
    // Transform areas to sections
    const sections = inspection?.areas?.filter(area => area.items?.length > 0).map(area => ({
      title: area.name || 'Inspection Area',
      content: `Inspection of ${area.name || 'area'} completed with ${area.items?.length || 0} inspection points.`,
      findings: area.items?.map(item => ({
        point: item.point || 'Inspection Point',
        location: item.location || '',
        status: item.status || 'N/A',
        comments: item.comments || ''
      })) || [],
      status: area.items?.every(item => item.status === 'Pass') ? 'Pass' : 
             area.items?.some(item => item.status === 'Fail') ? 'Fail' : 'Warning'
    })) || [];

    // Extract images from inspection items
    const images = [];
    inspection?.areas?.forEach(area => {
      area.items?.forEach(item => {
        if (item.photos?.length > 0) {
          item.photos.forEach(photo => {
            images.push({
              url: photo.url,
              description: `${area.name} - ${item.point} - ${photo.name || 'Photo'}`
            });
          });
        }
      });
    });

    return createReportData({
      title: `${inspection.property_type || 'Property'} Inspection Report`,
      date: inspectionDate,
      inspector: inspectorName,
      location: property?.address || 'Property Location',
      clientName: clientName,
      images: images,
      sections: sections,
      summary: inspection?.summary || `Inspection of ${inspection.property_type || 'property'} completed. Review detailed findings in each section above.`,
      recommendations: inspection?.recommendations?.length > 0 ? 
        (Array.isArray(inspection.recommendations) ? inspection.recommendations : [inspection.recommendations]) :
        ['Regular maintenance recommended', 'Follow up on any failed inspection points', 'Schedule re-inspection as needed'],
      metadata: {
        reportId: inspection?.id || Date.now(),
        propertyType: inspection?.property_type,
        inspectionType: inspection?.inspection_type,
        status: inspection?.status
      }
    });
  };

  const handleExport = async () => {
    if (!inspection?.id && !customData) {
      toast.error("Please save the inspection before exporting the PDF or provide custom data.");
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading("Generating professional PDF report...", { duration: 60000 });
    
    try {
      let reportData;
      
      if (customData) {
        // Use provided custom data
        reportData = createReportData(customData);
      } else {
        // Transform inspection data
        reportData = transformInspectionData(inspection, client, property);
      }

      // Generate filename if not provided
      const generatedFilename = filename || 
        `Wasla-Report-${(reportData.clientName || 'Report').replace(/ /g, '_')}-${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Export the report
      await exportInspectionReport(reportData, generatedFilename);
      
      toast.success("PDF report generated successfully!", { id: toastId });
      
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to generate PDF: ${error.message}`, { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || isExporting || (!inspection?.id && !customData)}
      className=""
      size="sm"
    >
      {isExporting ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <FileDown className="w-4 h-4 mr-2" />
          Export PDF
        </>
      )}
    </Button>
  );
};

export default EnhancedPDFExportButton;