
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Plus } from "lucide-react";
import { toast } from "sonner";
import { Inspection, Property, Client } from "@/api/entities";
import AreaCard from "../components/inspections/AreaCard";
import { createPageUrl } from "@/utils";
import PDFExportButton from "../components/inspections/PDFExportButton";

export default function InspectionForm() {
  const navigate = useNavigate();
  const location = useLocation();

  const [inspection, setInspection] = useState(null);
  const [properties, setProperties] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const inspectionId = searchParams.get("id");

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [propertyData, clientData] = await Promise.all([
          Property.list(),
          Client.list(),
        ]);
        setProperties(propertyData || []);
        setClients(clientData || []);

        if (inspectionId) {
          const existing = await Inspection.filter({ id: inspectionId });
          const inspectionData = existing?.[0];

          if (!inspectionData) {
            toast.error("Inspection not found.");
            navigate(createPageUrl("Inspections"));
            return;
          }

          if (inspectionData.inspection_date) {
            inspectionData.inspection_date = new Date(
              inspectionData.inspection_date
            )
              .toISOString()
              .split("T")[0];
          }

          if (!inspectionData.areas) inspectionData.areas = [];
          setInspection(inspectionData);
        } else {
          setInspection({
            client_id: "",
            client_name: "",
            property_id: "",
            property_type: "villa",
            inspector_name: "",
            inspection_date: new Date().toISOString().split("T")[0],
            inspection_type: "pre_purchase",
            status: "scheduled",
            areas: [{ id: crypto.randomUUID(), name: "General", items: [] }],
          });
        }
      } catch (err) {
        toast.error("Failed to load data. Please check your connection.");
        console.error("Failed to load data:", err);
        // Create default inspection so form still renders (for new inspections)
        if (!inspectionId) {
          setInspection({
            client_id: "",
            client_name: "",
            property_id: "",
            property_type: "villa",
            inspector_name: "",
            inspection_date: new Date().toISOString().split("T")[0],
            inspection_type: "pre_purchase",
            status: "scheduled",
            areas: [{ id: crypto.randomUUID(), name: "General", items: [] }],
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [location.search, navigate]);

  const handleUpdateField = (field, value) => {
    setInspection((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleAddArea = () => {
    if (!inspection) return;
    const newArea = {
      id: crypto.randomUUID(),
      name: `New Area ${inspection.areas?.length + 1 || 1}`,
      items: [],
    };
    setInspection((prev) => ({
      ...prev,
      areas: [...(prev?.areas || []), newArea],
    }));
  };

  const handleUpdateArea = (updatedArea) => {
    if (!inspection) return;
    const newAreas = (inspection.areas || []).map((a) =>
      a.id === updatedArea.id ? updatedArea : a
    );
    handleUpdateField("areas", newAreas);
  };

  const handleRemoveArea = (areaId) => {
    if (!inspection) return;
    const newAreas = (inspection.areas || []).filter((a) => a.id !== areaId);
    handleUpdateField("areas", newAreas);
  };

  const preparePayload = (ins) => {
    const payload = { ...ins };
    payload.areas = (payload.areas || []).map((a) => ({
      ...a,
      id: String(a.id),
      items: (a.items || []).map((it) => ({ ...it, id: String(it.id) })),
    }));
    if (
      payload.inspection_date &&
      /^\d{4}-\d{2}-\d{2}$/.test(payload.inspection_date)
    ) {
      payload.inspection_date = new Date(
        payload.inspection_date + "T00:00:00"
      ).toISOString();
    }
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inspection) return;

    if (!inspection.client_name || !inspection.property_type) {
      toast.error("Please enter Client's Name and select Property Type.");
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading(
      inspection.id ? "Updating inspection..." : "Saving inspection..."
    );
    try {
      const payload = preparePayload(inspection);
      let savedInspection;
      if (inspection.id) {
        savedInspection = await Inspection.update(inspection.id, payload);
      } else {
        savedInspection = await Inspection.create(payload);
      }
      toast.success("Inspection saved successfully.", { id: toastId });
      navigate(createPageUrl("Inspections"));
    } catch (error) {
      toast.error("Failed to save inspection.", { id: toastId });
      console.error("Failed to save inspection:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">Loading inspection form...</p>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-4">Failed to load inspection data.</p>
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl("Inspections"))}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Inspections
        </Button>
      </div>
    );
  }
  
  const selectedClient = clients.find(c => c.id === inspection.client_id);
  const selectedProperty = properties.find(p => p.id === inspection.property_id);

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h1 className="text-2xl font-bold text-slate-900 order-2 sm:order-1">
            {inspection.id ? "Edit Inspection" : "New Inspection"}
          </h1>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(createPageUrl("Inspections"))}
            className="w-full sm:w-auto order-1 sm:order-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Inspections
          </Button>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-bold mb-6 text-slate-800">
            Inspection Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="space-y-2">
              <Label htmlFor="client_name">Client *</Label>
              <Input
                id="client_name"
                value={inspection.client_name || ""}
                onChange={(e) => handleUpdateField("client_name", e.target.value)}
                placeholder="Enter client's name"
                required
                className="w-full h-10 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="property_type">Property Type *</Label>
              <Select
                value={inspection.property_type}
                onValueChange={(value) => handleUpdateField("property_type", value)}
                required
              >
                <SelectTrigger id="property_type" className="h-10 text-sm">
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="building">Building</SelectItem>
                  <SelectItem value="villa">Villa</SelectItem>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspector_name">Inspector Name</Label>
              <Input
                id="inspector_name"
                value={inspection.inspector_name || ""}
                onChange={(e) => handleUpdateField("inspector_name", e.target.value)}
                className="w-full h-10 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspection_date">Inspection Date</Label>
              <Input
                id="inspection_date"
                type="date"
                value={inspection.inspection_date || ""}
                onChange={(e) => handleUpdateField("inspection_date", e.target.value)}
                required
                className="w-full h-10 text-sm px-3"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspection_type">Inspection Type</Label>
              <Select
                value={inspection.inspection_type}
                onValueChange={(value) => handleUpdateField("inspection_type", value)}
                required
              >
                <SelectTrigger id="inspection_type" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre_purchase">Pre-Purchase</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="rental">Rental</SelectItem>
                  <SelectItem value="pre_listing">Pre-Listing</SelectItem>
                  <SelectItem value="new_construction">New Construction</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div>
          {inspection.areas?.map((area) => (
            <AreaCard
              key={area.id}
              area={area}
              onUpdate={handleUpdateArea}
              onRemove={() => handleRemoveArea(area.id)}
            />
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleAddArea}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Another Area
          </Button>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            {inspection.id && (
              <PDFExportButton
                inspection={inspection}
                client={selectedClient}
                property={selectedProperty}
                variant="outline"
                size="default"
                showIcon={true}
                label="View Report"
              />
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(createPageUrl("Inspections"))}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Inspection"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
