import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

export default function PDFExportButton({ inspection, client, property, disabled = false, variant = "outline", size = "sm", showIcon = true, label = "View Report" }) {
  const navigate = useNavigate();

  const handleViewReport = () => {
    if (!inspection) {
      toast.error("No inspection data available.");
      return;
    }
    if (!inspection.id) {
      toast.error("Please save the inspection before viewing the report.");
      return;
    }
    if (!inspection.client_name && !client?.name) {
      toast.error("Client name is required to generate the report.");
      return;
    }
    navigate(createPageUrl(`InspectionReport?id=${inspection.id}`));
  };

  if (!inspection) return null;

  return (
    <Button
      onClick={handleViewReport}
      disabled={disabled || !inspection.id}
      variant={variant}
      size={size}
      className="flex items-center gap-2"
      title={!inspection.id ? "Save the inspection first to view the report" : "View and print inspection report"}
    >
      {showIcon && <FileText className="w-4 h-4" />}
      <span>{label}</span>
    </Button>
  );
}
