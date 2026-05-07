
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
import { RATE_PER_SQM, calculateInspectionFee, formatPropertyType } from "@/lib/pricing";

const norm = (s) => (s || "").trim().toLowerCase();

export default function InspectionForm() {
  const navigate = useNavigate();
  const location = useLocation();

  const [inspection, setInspection] = useState(null);
  // Loaded for find-or-create resolution on save (no UI dropdowns).
  const [clients, setClients] = useState([]);
  const [properties, setProperties] = useState([]);
  const [linkedClient, setLinkedClient] = useState(null);
  const [linkedProperty, setLinkedProperty] = useState(null);
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
            // The DB column is DATE (no timezone). If we ever get a timestamp
            // back, slice the YYYY-MM-DD prefix without round-tripping through
            // Date — that round-trip shifts the day for users east of UTC.
            inspectionData.inspection_date = String(inspectionData.inspection_date).slice(0, 10);
          }

          if (!inspectionData.areas) inspectionData.areas = [];

          // Surface client + property names from linked records so the manual
          // fields don't appear blank when editing a legacy inspection.
          const linkedC = (clientData || []).find(c => c.id === inspectionData.client_id) || null;
          const linkedP = (propertyData || []).find(p => p.id === inspectionData.property_id) || null;
          setLinkedClient(linkedC);
          setLinkedProperty(linkedP);

          if (!inspectionData.client_name && linkedC?.name) {
            inspectionData.client_name = linkedC.name;
          }
          if (!inspectionData.client_phone && linkedC?.phone) {
            inspectionData.client_phone = linkedC.phone;
          }
          if (!inspectionData.property_address && linkedP?.address) {
            inspectionData.property_address = linkedP.address;
          }
          if (!inspectionData.property_type && linkedP?.property_type) {
            inspectionData.property_type = linkedP.property_type;
          }
          const inspArea = Number(inspectionData.area_sqm);
          if ((!Number.isFinite(inspArea) || inspArea <= 0) && linkedP?.area_sqm) {
            inspectionData.area_sqm = linkedP.area_sqm;
          }

          setInspection(inspectionData);
        } else {
          setInspection({
            client_id: "",
            client_name: "",
            client_phone: "",
            property_id: "",
            property_address: "",
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
        if (!inspectionId) {
          setInspection({
            client_id: "",
            client_name: "",
            client_phone: "",
            property_id: "",
            property_address: "",
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

  // Find-or-create a Client by name. Re-fetches just before matching so a
  // concurrent edit in another tab doesn't cause a duplicate row.
  const resolveClient = async (clientName, clientPhone) => {
    const trimmedName = (clientName || "").trim();
    if (!trimmedName) return null;
    let pool = clients;
    try {
      const fresh = await Client.list();
      if (Array.isArray(fresh)) pool = fresh;
    } catch (err) {
      console.warn("Could not refresh clients before save:", err?.message);
    }
    const match = pool.find(c => norm(c.name) === norm(trimmedName));
    if (match) {
      if (clientPhone && !match.phone) {
        try {
          await Client.update(match.id, { phone: clientPhone.trim() });
        } catch (err) {
          console.warn("Could not backfill client phone:", err?.message);
        }
      }
      return match;
    }
    const created = await Client.create({
      name: trimmedName,
      phone: clientPhone ? clientPhone.trim() : null,
    });
    setClients(prev => [...prev, created]);
    return created;
  };

  // Find-or-create a Property by address. Re-fetches before matching to
  // avoid duplicates from concurrent edits.
  const resolveProperty = async ({ address, propertyType, areaSqm, clientId }) => {
    const trimmedAddress = (address || "").trim();
    if (!trimmedAddress) return null;
    let pool = properties;
    try {
      const fresh = await Property.list();
      if (Array.isArray(fresh)) pool = fresh;
    } catch (err) {
      console.warn("Could not refresh properties before save:", err?.message);
    }
    const match = pool.find(p => norm(p.address) === norm(trimmedAddress));
    if (match) {
      const patch = {};
      if (clientId && !match.client_id) patch.client_id = clientId;
      if (propertyType && !match.property_type) patch.property_type = propertyType;
      const matchArea = Number(match.area_sqm);
      if ((!Number.isFinite(matchArea) || matchArea <= 0) && areaSqm) {
        patch.area_sqm = areaSqm;
      }
      if (Object.keys(patch).length > 0) {
        try {
          const updated = await Property.update(match.id, patch);
          return updated || { ...match, ...patch };
        } catch (err) {
          console.warn("Could not patch property:", err?.message);
          return match;
        }
      }
      return match;
    }
    const created = await Property.create({
      address: trimmedAddress,
      property_type: propertyType || "villa",
      area_sqm: areaSqm || null,
      client_id: clientId || null,
    });
    setProperties(prev => [...prev, created]);
    return created;
  };

  const preparePayload = (ins) => {
    // Drop server-managed columns and UI-only fields so we don't write
    // unknown columns. client_phone lives on the clients table, not here.
    const {
      id: _id,
      created_at: _ca,
      updated_at: _ua,
      user_id: _uid,
      client_phone: _cp,
      ...payload
    } = ins;
    void _id; void _ca; void _ua; void _uid; void _cp;
    if (!payload.client_id) payload.client_id = null;
    if (!payload.property_id) payload.property_id = null;
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
    // Pass the YYYY-MM-DD string through unchanged. Postgres DATE accepts it
    // as-is, and we avoid the timezone shift caused by new Date(...).toISOString().
    if (payload.inspection_date && !/^\d{4}-\d{2}-\d{2}$/.test(payload.inspection_date)) {
      payload.inspection_date = String(payload.inspection_date).slice(0, 10) || null;
    }
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inspection) return;

    if (!inspection.client_name?.trim()) {
      toast.error("Please enter the client name.");
      return;
    }
    if (!inspection.property_address?.trim()) {
      toast.error("Please enter the property address.");
      return;
    }
    const areaCheck = Number(inspection.area_sqm);
    if (!Number.isFinite(areaCheck) || areaCheck <= 0) {
      toast.error("Please enter a valid Area (SQM). The invoice depends on it.");
      return;
    }

    // When editing, warn before silently re-linking to a different client or
    // property — protects against typos changing existing relationships.
    if (inspection.id) {
      const typedClientName = (inspection.client_name || "").trim();
      const typedAddress = (inspection.property_address || "").trim();
      const switchingClient = linkedClient && norm(linkedClient.name) !== norm(typedClientName);
      const switchingProperty = linkedProperty && norm(linkedProperty.address) !== norm(typedAddress);
      if (switchingClient || switchingProperty) {
        const lines = [];
        if (switchingClient) lines.push(`Client: "${linkedClient.name}" → "${typedClientName}"`);
        if (switchingProperty) lines.push(`Property: "${linkedProperty.address}" → "${typedAddress}"`);
        const msg = `You're about to change this inspection's link:\n\n${lines.join('\n')}\n\nThe original record(s) will stay in your database, but this inspection will move. Continue?`;
        if (!window.confirm(msg)) return;
      }
    }

    setIsSaving(true);
    const toastId = toast.loading(
      inspection.id ? "Updating inspection..." : "Saving inspection..."
    );
    try {
      const resolvedClient = await resolveClient(
        inspection.client_name,
        inspection.client_phone
      );
      const resolvedProperty = await resolveProperty({
        address: inspection.property_address,
        propertyType: inspection.property_type,
        areaSqm: areaCheck,
        clientId: resolvedClient?.id,
      });

      const enriched = {
        ...inspection,
        client_id: resolvedClient?.id || null,
        client_name: resolvedClient?.name || inspection.client_name?.trim() || null,
        property_id: resolvedProperty?.id || null,
        property_address: resolvedProperty?.address || inspection.property_address?.trim() || null,
      };

      const payload = preparePayload(enriched);
      if (inspection.id) {
        await Inspection.update(inspection.id, payload);
      } else {
        await Inspection.create(payload);
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

  const areaNum = Number(inspection.area_sqm);
  const ratePerSqm = RATE_PER_SQM[inspection.property_type] || 0;
  const estimatedFee = calculateInspectionFee(areaNum, inspection.property_type);
  const trimmedClientName = (inspection.client_name || "").trim();
  const trimmedAddress = (inspection.property_address || "").trim();
  const willCreateClient = trimmedClientName.length > 0
    && !clients.some(c => norm(c.name) === norm(trimmedClientName));
  const willCreateProperty = trimmedAddress.length > 0
    && !properties.some(p => norm(p.address) === norm(trimmedAddress));

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
          <h2 className="text-xl font-bold mb-2 text-foreground">
            Inspection Details
          </h2>
          <p className="text-xs text-muted-foreground mb-6">
            Type the client and property details directly. New entries are added to your Clients and Properties on save; existing ones are matched by name and address.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="space-y-2">
              <Label htmlFor="client_name">Client Name *</Label>
              <Input
                id="client_name"
                value={inspection.client_name || ""}
                onChange={(e) => handleUpdateField("client_name", e.target.value)}
                placeholder="e.g. Ahmed Al-Rashid"
                className="w-full h-10 text-sm"
                autoComplete="off"
              />
              {willCreateClient && (
                <p className="text-xs text-muted-foreground">New client — will be added to your Clients on save.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_phone">Client Phone</Label>
              <Input
                id="client_phone"
                type="tel"
                value={inspection.client_phone || ""}
                onChange={(e) => handleUpdateField("client_phone", e.target.value)}
                placeholder="+968 9123 4567"
                className="w-full h-10 text-sm"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="property_address">Property Address *</Label>
              <Input
                id="property_address"
                value={inspection.property_address || ""}
                onChange={(e) => handleUpdateField("property_address", e.target.value)}
                placeholder="e.g. Villa 12, Al Mouj, Muscat"
                className="w-full h-10 text-sm"
                autoComplete="off"
              />
              {willCreateProperty && (
                <p className="text-xs text-muted-foreground">New property — will be added to your Properties on save.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="property_type">Property Type *</Label>
              <Select
                value={inspection.property_type}
                onValueChange={(value) => handleUpdateField("property_type", value)}
              >
                <SelectTrigger id="property_type" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="villa">Villa</SelectItem>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="building">Building</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="area_sqm">Area (SQM) *</Label>
              <Input
                id="area_sqm"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={inspection.area_sqm ?? ""}
                onChange={(e) => handleUpdateField("area_sqm", e.target.value)}
                placeholder="e.g. 350"
                className="w-full h-10 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Drives the invoice fee — measure on site if it differs from the listing.
              </p>
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
                className="w-full h-10 text-sm px-3"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspection_type">Inspection Type</Label>
              <Select
                value={inspection.inspection_type}
                onValueChange={(value) => handleUpdateField("inspection_type", value)}
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

          {(areaNum > 0 && ratePerSqm > 0) && (
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2">
              <div className="text-xs text-muted-foreground">
                Estimated invoice ({formatPropertyType(inspection.property_type)}: {ratePerSqm.toFixed(3)} OMR/SQM × {areaNum} SQM)
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
                client={linkedClient}
                property={linkedProperty}
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
