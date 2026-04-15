import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Prepares the raw data structure for the report generator.
 * Ensures all required fields have fallback values to prevent empty templates.
 */
function prepareInspectionReportData(inspection, client, property) {
  // Validate that we have minimum required data
  if (!inspection) {
    throw new Error('Inspection data is required');
  }

  // Build comprehensive data object with all fallbacks
  const reportData = {
    client_name: inspection?.client_name || client?.name || 'N/A',
    inspector_name: inspection?.inspector_name || 'Wasla Inspector',
    inspection_date: inspection?.inspection_date || new Date().toISOString(),
    property_type: property?.property_type || inspection?.property_type || 'N/A',
    location: property?.address || inspection?.location || 'N/A',
    areas: Array.isArray(inspection?.areas) ? inspection.areas : [],
    recommendations: Array.isArray(inspection?.recommendations) ? inspection.recommendations : []
  };

  // Log data for debugging
  console.log('Report data prepared:', {
    clientName: reportData.client_name,
    inspectorName: reportData.inspector_name,
    propertyType: reportData.property_type,
    location: reportData.location,
    areasCount: reportData.areas.length,
    hasRecommendations: reportData.recommendations.length > 0
  });

  return reportData;
}

export default function PDFExportButton({ inspection, client, property, disabled = false, variant = "outline", size = "sm", showIcon = true, label = "View Report" }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleViewReport = async () => {
    // Enhanced validation
    if (!inspection) {
      toast.error("No inspection data available.");
      return;
    }

    // For unsaved inspections, require save first
    if (!inspection.id) {
      toast.error("Please save the inspection before viewing the report.");
      return;
    }

    // Check for minimum required fields
    if (!inspection.client_name && !client?.name) {
      toast.error("Client name is required to generate the report.");
      return;
    }

    // IMPORTANT: Open window IMMEDIATELY on user click to avoid mobile popup blockers
    // Mobile browsers block window.open() if it's not directly triggered by user action
    const reportWindow = window.open('', 'wasla_report');

    if (!reportWindow || reportWindow.closed) {
      toast.error("Please allow pop-ups for this site to view the report.");
      return;
    }

    // Show loading state in the new window
    reportWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Loading Report...</title>
        <style>
          body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
          }
          .loader {
            text-align: center;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #e5e7eb;
            border-top-color: #10b981;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="loader">
          <div class="spinner"></div>
          <p>Generating report...</p>
        </div>
      </body>
      </html>
    `);

    setIsExporting(true);
    const toastId = toast.loading("Generating inspection report...", { duration: 10000 });

    try {
      // Prepare the report data with all fallbacks
      const reportData = prepareInspectionReportData(inspection, client, property);

      // Validate that we have some content to display
      if (!reportData.areas || reportData.areas.length === 0) {
        toast.warning("This inspection has no areas to report. Add inspection areas first.", { id: toastId });
        reportWindow.close();
        setIsExporting(false);
        return;
      }

      // Import and generate the report
      const { generateInspectionReport } = await import('../utils/htmlReportGenerator');

      console.log('Calling generateInspectionReport with data:', reportData);

      // Generate report - pass the already-opened window
      const result = await generateInspectionReport(reportData, {
        autoPrint: false,
        pageSize: 'A4',
        orientation: 'portrait',
        targetWindow: reportWindow
      });

      if (result && result.success) {
        toast.success("Report opened! Click the Print button in the report to print.", { id: toastId });
      } else {
        throw new Error("Report generation returned unsuccessful result");
      }
    } catch (error) {
      console.error('Export error:', error);
      reportWindow.close();

      // Provide specific error messages based on error type
      if (error.message && error.message.includes('pop-up')) {
        toast.error("Please allow pop-ups for this site to view the report.", { id: toastId });
      } else if (error.message && error.message.includes('required')) {
        toast.error(error.message, { id: toastId });
      } else {
        toast.error(`Failed to generate report: ${error.message || 'Unknown error'}`, { id: toastId });
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Don't show button if no inspection data
  if (!inspection) {
    return null;
  }

  return (
    <Button
      onClick={handleViewReport}
      disabled={disabled || isExporting || !inspection.id}
      variant={variant}
      size={size}
      className="flex items-center gap-2"
      title={!inspection.id ? "Save the inspection first to view the report" : "View and print inspection report"}
    >
      {isExporting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Generating...</span>
        </>
      ) : (
        <>
          {showIcon && <FileText className="w-4 h-4" />}
          <span>{label}</span>
        </>
      )}
    </Button>
  );
}