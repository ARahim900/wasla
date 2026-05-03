import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Inspection, Property, Client } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { createPageUrl } from "@/utils";
import { buildInspectionReportHTML } from "@/components/utils/htmlReportGenerator";
import { toast } from "sonner";

function buildReportData(inspection, client, property) {
  return {
    client_name: inspection?.client_name || client?.name || 'N/A',
    inspector_name: inspection?.inspector_name || 'Wasla Inspector',
    inspection_date: inspection?.inspection_date || new Date().toISOString(),
    property_type: property?.property_type || inspection?.property_type || 'N/A',
    location: property?.address || inspection?.location || 'N/A',
    areas: Array.isArray(inspection?.areas) ? inspection.areas : [],
    recommendations: Array.isArray(inspection?.recommendations) ? inspection.recommendations : []
  };
}

export default function InspectionReport() {
  const navigate = useNavigate();
  const iframeRef = useRef(null);
  const [inspection, setInspection] = useState(null);
  const [property, setProperty] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportHTML, setReportHTML] = useState("");
  const [building, setBuilding] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await Inspection.filter({ id });
        const ins = res?.[0];
        if (!ins) {
          if (!cancelled) setLoading(false);
          return;
        }
        const [propRes, cliRes] = await Promise.all([
          ins.property_id ? Property.filter({ id: ins.property_id }) : Promise.resolve([null]),
          ins.client_id ? Client.filter({ id: ins.client_id }) : Promise.resolve([null])
        ]);
        if (cancelled) return;
        setInspection(ins);
        setProperty(propRes?.[0] || null);
        setClient(cliRes?.[0] || null);
      } catch (err) {
        console.error('Failed to load inspection report:', err);
        toast.error('Failed to load inspection.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (id) load();
    else setLoading(false);
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!inspection) return;
    let cancelled = false;
    setBuilding(true);
    buildInspectionReportHTML(buildReportData(inspection, client, property))
      .then((html) => {
        if (!cancelled) setReportHTML(html);
      })
      .catch((err) => {
        console.error('Failed to build report HTML:', err);
        toast.error('Failed to generate report.');
      })
      .finally(() => {
        if (!cancelled) setBuilding(false);
      });
    return () => { cancelled = true; };
  }, [inspection, client, property]);

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) {
      toast.error('Report is still loading. Please try again.');
      return;
    }
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      console.error('Print failed:', err);
      toast.error('Unable to print. Try your browser print menu.');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin inline-block mr-2 text-primary" />
        Loading report...
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="p-8 text-center">
        Report not found.
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate(createPageUrl("Inspections"))}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="sr-only">Inspection Report</h1>
      <div className="flex justify-between items-center mb-4 print:hidden">
        <Button variant="outline" onClick={() => navigate(createPageUrl("Inspections"))}>
          <ArrowLeft className="w-4 h-4 mr-2" />Back to Inspections
        </Button>
        <Button onClick={handlePrint} disabled={building || !reportHTML}>
          <Printer className="w-4 h-4 mr-2" />
          {building ? 'Preparing…' : 'Print / Save PDF'}
        </Button>
      </div>

      <div className="bg-muted rounded-md overflow-hidden border border-border">
        {reportHTML ? (
          <iframe
            ref={iframeRef}
            title="Inspection Report"
            srcDoc={reportHTML}
            className="w-full block bg-white"
            style={{ height: 'calc(100vh - 160px)', minHeight: '600px', border: 0 }}
          />
        ) : (
          <div className="p-12 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin inline-block mr-2 text-primary" />
            Generating report...
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          iframe[title="Inspection Report"],
          iframe[title="Inspection Report"] * { visibility: visible !important; }
          iframe[title="Inspection Report"] {
            position: fixed !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100% !important;
            border: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
