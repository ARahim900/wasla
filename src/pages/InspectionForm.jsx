
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

          // Backfill client_id from client_name for legacy inspections so the
          // Select shows the right entry instead of "Select a client".
          if (!inspectionData.client_id && inspectionData.client_name) {
            const match = (clientData || []).find(
              c => c.name?.trim().toLowerCase() === inspectionData.client_name.trim().toLowerCase()
            );
            if (match) inspectionData.client_id = match.id;
          }

          setInspection(inspectionData);
        } else {
          setInspection({
            client_id: "",
            client_name: "",
            property_id: "",
            property_type: "villa",
            area_sqm: "",
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
            area_sqm: "",
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

  const handleClientChange = (clientId) => {
    const c = clients.find((x) => x.id === clientId);
    setInspection((prev) =>
      prev
        ? {
            ...prev,
            client_id: clientId,
            client_name: c?.name || "",
            // If the previously chosen property doesn't belong to this client,
            // clear it so the property dropdown isn't showing a stale label.
            property_id:
              prev.property_id &&
              properties.find((p) => p.id === prev.property_id)?.client_id === clientId
                ? prev.property_id
                : "",
          }
        : prev
    );
  };

  const handlePropertyChange = (propertyId) => {
    const p = properties.find((x) => x.id === propertyId);
    setInspection((prev) => {
      if (!prev) return prev;
      // Default area from property only if the inspection doesn't have its
      // own value yet — don't clobber an inspector's on-site measurement.
      const next = {
        ...prev,
        property_id: propertyId,
        property_type: p?.property_type || prev.property_type,
      };
      const prevArea = prev.area_sqm === "" || prev.area_sqm == null ? null : Number(prev.area_sqm);
      if ((!Number.isFinite(prevArea) || prevArea <= 0) && p?.area_sqm) {
        next.area_sqm = p.area_sqm;
      }
      return next;
    });
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
    // Drop server-managed columns so we don't stomp them on update
    const { id: _id, created_at: _ca, updated_at: _ua, user_id: _uid, ...payload } = ins;
    void _id; void _ca; void _ua; void _uid;
    // Convert empty string IDs to null (Supabase UUID columns reject empty strings)
    if (!payload.client_id) payload.client_id = null;
    if (!payload.property_id) payload.property_id = null;
    // Coerce area_sqm to a number (or null) so downstream pricing math works.
    if (payload.area_sqm === "" || payload.area_sqm == null) {
      payload.area_sqm = null;
    } else {
      const n = Number(payload.area_sqm);
      payload.area_sqm = Number.isFinite(n) && n > 0 ? n : null;
    }
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

    if (!inspection.client_id) {
      toast.error("Please select a client.");
      return;
    }
    if (!inspection.property_id) {
      toast.error("Please select a property.");
      return;
    }
    const areaCheck = Number(inspection.area_sqm);
    if (!Number.isFinite(areaCheck) || areaCheck <= 0) {
      toast.error("Please enter a valid Property Area (m²). The invoice depends on it.");
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
      console.error("Failed to save inspection:", error);
      toast.error(error?.message || "Failed to save inspection.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading inspection form...</p>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive mb-4">Failed to load inspection data.</p>
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
  const propertiesForClient = inspection.client_id
    ? properties.filter(p => p.client_id === inspection.client_id)
    : properties;

  // Mirror InvoiceForm's rate table so inspectors see the live estimate
  // before the invoice is created. Keep this in sync with InvoiceForm.
  const RATE_PER_SQM = { villa: 1.0, apartment: 0.7, office: 2.0, building: 2.0 };
  const areaNum = Number(inspection.area_sqm);
  const ratePerSqm = RATE_PER_SQM[inspection.property_type] || 0;
  const estimatedFee = Number.isFinite(areaNum) && areaNum > 0 && ratePerSqm > 0
    ? areaNum * ratePerSqm
    : 0;
  const formatType = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : "");

  return (
    <div>
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h1 className="text-2xl font-bold text-foreground order-2 sm:order-1">
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

        <div className="bg-card p-4 sm:p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-bold mb-6 text-foreground">
            Inspection Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="space-y-2">
              <Label htmlFor="client_id">Client *</Label>
              <Select
                value={inspection.client_id || ""}
                onValueChange={handleClientChange}
              >
                <SelectTrigger id="client_id" className="h-10 text-sm">
                  <SelectValue placeholder={clients.length ? "Select a client" : "No clients yet"} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {clients.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Add a client first from the{" "}
                  <button
                    type="button"
                    onClick={() => navigate(createPageUrl("Clients"))}
                    className="text-primary hover:underline"
                  >
                    Clients
                  </button>{" "}
                  page.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="property_id">Property *</Label>
              <Select
                value={inspection.property_id || ""}
                onValueChange={handlePropertyChange}
                disabled={!inspection.client_id}
              >
                <SelectTrigger id="property_id" className="h-10 text-sm">
                  <SelectValue
                    placeholder={
                      !inspection.client_id
                        ? "Select a client first"
                        : propertiesForClient.length
                        ? "Select a property"
                        : "No properties for this client"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {propertiesForClient.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="capitalize">{p.property_type}</span> — {p.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {inspection.client_id && propertiesForClient.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No properties yet for this client. Add one from the{" "}
                  <button
                    type="button"
                    onClick={() => navigate(createPageUrl("Properties"))}
                    className="text-primary hover:underline"
                  >
                    Properties
                  </button>{" "}
                  page.
                </p>
              )}
              {selectedProperty && (
                <p className="text-xs text-muted-foreground capitalize">
                  Type: {selectedProperty.property_type}
                  {selectedProperty.area_sqm ? ` · ${selectedProperty.area_sqm} m²` : ""}
                </p>
              )}
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
                className="w-full h-10 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspection_type">Inspection Type</Label>
              <Select
                value={inspection.inspection_type}
                onValueChange={(value) => handleUpdateField("inspection_type", value)}
              >
                <SelectTrigger id="inspection_type" className="h-10 text-sm">
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
            <div className="space-y-2">
              <Label htmlFor="area_sqm">Property Area (m²) *</Label>
              <Input
                id="area_sqm"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={inspection.area_sqm ?? ""}
                onChange={(e) => handleUpdateField("area_sqm", e.target.value)}
                placeholder={selectedProperty?.area_sqm ? String(selectedProperty.area_sqm) : "e.g. 350"}
                className="w-full h-10 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Defaults from the property; override if you measure differently on site.
              </p>
            </div>
          </div>

          {(areaNum > 0 && ratePerSqm > 0) && (
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2">
              <div className="text-xs text-muted-foreground">
                Estimated invoice ({formatType(inspection.property_type)}: {ratePerSqm.toFixed(3)} OMR/m² × {areaNum} m²)
              </div>
              <div className="text-sm font-semibold text-foreground">
                {estimatedFee.toFixed(3)} OMR
              </div>
            </div>
          )}
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
              className="w-full sm:w-auto"
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
