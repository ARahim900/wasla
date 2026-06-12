
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Save, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Inspection, Property, Client, ConflictError } from "@/api/entities";
import AreaCard from "../components/inspections/AreaCard";
import { createPageUrl } from "@/utils";
import PDFExportButton from "../components/inspections/PDFExportButton";
import { RATE_PER_SQM, calculateInspectionFee, formatPropertyType } from "@/lib/pricing";

const norm = (s) => (s || "").trim().toLowerCase();

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

const AUTOSAVE_DELAY_MS = 2500;

// Local draft safety net — written when an autosave fails or the tab closes
// with unsaved edits, so a flaky connection never eats field work. All
// localStorage access is best-effort (quota limits, private mode).
const draftKeyFor = (id) => `wasla:inspection-draft:${id || "new"}`;

const writeDraft = (id, payload) => {
  try {
    localStorage.setItem(
      draftKeyFor(id),
      JSON.stringify({ savedAt: new Date().toISOString(), payload })
    );
  } catch (err) {
    console.warn("Could not write local draft:", err?.message);
  }
};

const readDraft = (id) => {
  try {
    const raw = localStorage.getItem(draftKeyFor(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.payload) return null;
    if (!Number.isFinite(new Date(parsed.savedAt).getTime())) return null;
    return parsed;
  } catch (err) {
    console.warn("Could not read local draft:", err?.message);
    return null;
  }
};

const clearDraft = (id) => {
  try {
    localStorage.removeItem(draftKeyFor(id));
  } catch (err) {
    console.warn("Could not clear local draft:", err?.message);
  }
};

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

  // Autosave — the long multi-stage form persists itself in the background so
  // inspectors never lose progress to a dead battery or a closed tab.
  // 'idle' | 'pending' | 'saving' | 'saved' | 'error'
  const [autosave, setAutosave] = useState({ state: "idle", at: null });
  // A concurrent edit elsewhere won the write race — autosave pauses until
  // the user picks a version. conflictRef mirrors it for async callbacks.
  const [conflict, setConflict] = useState(false);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  // Recoverable local draft found on load: { id, savedAt, payload } | null.
  const [draftPrompt, setDraftPrompt] = useState(null);
  const inspectionRef = useRef(null);
  const lastSavedJsonRef = useRef(null);
  // The updated_at we last read from the server — our optimistic-concurrency
  // token. Refreshed from every successful save's returned row.
  const lastUpdatedAtRef = useRef(null);
  const autosaveTimerRef = useRef(null);
  const autosaveBusyRef = useRef(false);
  const submittingRef = useRef(false);
  const conflictRef = useRef(false);

  useEffect(() => {
    inspectionRef.current = inspection;
  }, [inspection]);

  // Seed the autosave baseline so loading a form never counts as an edit.
  const initInspection = useCallback((data) => {
    lastSavedJsonRef.current = JSON.stringify(preparePayload(data));
    lastUpdatedAtRef.current = data.updated_at || null;
    setAutosave({ state: "idle", at: null });
    setInspection(data);
  }, []);

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

          initInspection(inspectionData);

          // Offer to restore a local draft that never reached the server —
          // only when it's newer than what the server has.
          const draft = readDraft(inspectionId);
          if (draft && (!inspectionData.updated_at ||
              new Date(draft.savedAt) > new Date(inspectionData.updated_at))) {
            setDraftPrompt({ id: inspectionId, savedAt: draft.savedAt, payload: draft.payload });
          } else if (draft) {
            // Server copy is newer — the stranded draft is stale, drop it.
            clearDraft(inspectionId);
          }
        } else {
          initInspection({
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

          // A 'new' draft means a brand-new form was lost before its first
          // successful save — always offer it back.
          const draft = readDraft(null);
          if (draft) {
            setDraftPrompt({ id: null, savedAt: draft.savedAt, payload: draft.payload });
          }
        }
      } catch (err) {
        toast.error("Failed to load data. Please check your connection.");
        console.error("Failed to load data:", err);
        if (!inspectionId) {
          initInspection({
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

          // Offline load of a new form — a stranded 'new' draft is exactly
          // what this safety net exists for.
          const draft = readDraft(null);
          if (draft) {
            setDraftPrompt({ id: null, savedAt: draft.savedAt, payload: draft.payload });
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [location.search, navigate, initInspection]);

  // Pause autosave and make the user choose a version — never silently
  // overwrite their colleague's work, never silently discard their own.
  const enterConflict = useCallback(() => {
    conflictRef.current = true;
    setConflict(true);
    setConflictDialogOpen(true);
  }, []);

  const clearConflict = useCallback(() => {
    conflictRef.current = false;
    setConflict(false);
    setConflictDialogOpen(false);
  }, []);

  // Background autosave engine. Persists raw form state (no validation, no
  // client/property resolution — those stay on the explicit Save). A brand-new
  // form is created in the DB on first meaningful input, then updated in place.
  const runAutosave = useCallback(async (snapshotJson) => {
    const current = inspectionRef.current;
    if (!current || submittingRef.current || conflictRef.current) return;
    if (autosaveBusyRef.current) {
      // A save is still in flight (slow connection) — retry shortly rather
      // than dropping these changes on the floor.
      autosaveTimerRef.current = setTimeout(() => runAutosave(snapshotJson), AUTOSAVE_DELAY_MS);
      return;
    }

    // Don't create empty rows from a form nobody has touched meaningfully.
    const hasContent =
      (current.client_name || "").trim() ||
      (current.property_address || "").trim() ||
      (current.areas || []).some((a) => (a.items || []).length > 0);
    if (!current.id && !hasContent) return;

    autosaveBusyRef.current = true;
    setAutosave({ state: "saving", at: null });
    try {
      const payload = preparePayload(current);
      if (current.id) {
        // Optimistic concurrency: only write over the revision we last read,
        // so two tabs (or two users) can't silently clobber each other.
        const saved = lastUpdatedAtRef.current
          ? await Inspection.updateIfUnchanged(current.id, payload, lastUpdatedAtRef.current)
          : await Inspection.update(current.id, payload);
        if (saved?.updated_at) lastUpdatedAtRef.current = saved.updated_at;
      } else {
        const created = await Inspection.create(payload);
        if (created?.id) {
          if (created.updated_at) lastUpdatedAtRef.current = created.updated_at;
          setInspection((prev) => (prev && !prev.id ? { ...prev, id: created.id } : prev));
          // Reflect the new id in the URL without remounting the form, so a
          // refresh resumes this draft instead of starting a duplicate.
          window.history.replaceState(
            window.history.state,
            "",
            createPageUrl(`InspectionForm?id=${created.id}`)
          );
        }
      }
      clearDraft(current.id || null);
      lastSavedJsonRef.current = snapshotJson;
      setAutosave({ state: "saved", at: new Date() });
    } catch (err) {
      console.error("Autosave failed:", err);
      // Keep a local copy of whatever failed to reach the server.
      const latest = inspectionRef.current;
      if (latest) writeDraft(latest.id || null, preparePayload(latest));
      if (err instanceof ConflictError) {
        toast.error("This inspection was changed somewhere else (another tab or user).");
        enterConflict();
      }
      setAutosave({ state: "error", at: null });
    } finally {
      autosaveBusyRef.current = false;
    }
  }, [enterConflict]);

  useEffect(() => {
    if (isLoading || !inspection || isSaving || conflict) return;
    const snapshotJson = JSON.stringify(preparePayload(inspection));
    if (snapshotJson === lastSavedJsonRef.current) return;

    setAutosave((prev) => (prev.state === "saving" ? prev : { state: "pending", at: null }));
    autosaveTimerRef.current = setTimeout(() => runAutosave(snapshotJson), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(autosaveTimerRef.current);
  }, [inspection, isLoading, isSaving, conflict, runAutosave]);

  // Warn before the tab closes with edits that haven't reached the server,
  // and stash them locally so even a hard close is recoverable next visit.
  const hasUnsavedChanges =
    autosave.state === "pending" || autosave.state === "saving" || autosave.state === "error";

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (e) => {
      const current = inspectionRef.current;
      if (current) writeDraft(current.id || null, preparePayload(current));
      e.preventDefault();
      e.returnValue = ""; // Chrome requires returnValue for the native prompt.
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

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

  // Recovered-draft dialog: restoring merges the stranded payload into the
  // form (autosave then persists it); either choice clears the stored draft.
  const handleDraftRestore = () => {
    if (!draftPrompt) return;
    setInspection((prev) => (prev ? { ...prev, ...draftPrompt.payload } : prev));
    clearDraft(draftPrompt.id);
    setDraftPrompt(null);
    toast.success("Unsaved changes restored — review and save.");
  };

  const handleDraftDiscard = () => {
    if (!draftPrompt) return;
    clearDraft(draftPrompt.id);
    setDraftPrompt(null);
  };

  // Conflict: "Reload their version" — explicit, confirmed discard of local
  // edits in favor of whatever was saved elsewhere.
  const handleConflictReload = async () => {
    const id = inspectionRef.current?.id;
    if (!id) return;
    const confirmed = window.confirm(
      "Reload the version saved elsewhere? Your local edits will be discarded. This cannot be undone."
    );
    if (!confirmed) return;
    try {
      const fresh = (await Inspection.filter({ id }))?.[0];
      if (!fresh) {
        toast.error("Could not load the latest version. Please check your connection.");
        return;
      }
      if (fresh.inspection_date) {
        fresh.inspection_date = String(fresh.inspection_date).slice(0, 10);
      }
      if (!fresh.areas) fresh.areas = [];
      clearDraft(id);
      clearConflict();
      initInspection(fresh);
      toast.success("Loaded the latest saved version.");
    } catch (err) {
      console.error("Failed to reload inspection:", err);
      toast.error("Could not load the latest version. Please check your connection.");
    }
  };

  // Conflict: "Save mine anyway" — deliberate force-overwrite via plain
  // update (no updated_at check), then resume normal autosave.
  const handleConflictForce = async () => {
    const current = inspectionRef.current;
    if (!current?.id) return;
    const toastId = toast.loading("Saving your version...");
    try {
      const payload = preparePayload(current);
      const saved = await Inspection.update(current.id, payload);
      if (saved?.updated_at) lastUpdatedAtRef.current = saved.updated_at;
      lastSavedJsonRef.current = JSON.stringify(payload);
      clearDraft(current.id);
      clearConflict();
      setAutosave({ state: "saved", at: new Date() });
      toast.success("Your version was saved.", { id: toastId });
    } catch (err) {
      console.error("Force save failed:", err);
      toast.error(err?.message || "Could not save your version.", { id: toastId });
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inspection) return;

    // An unresolved conflict must be settled before any further write.
    if (conflictRef.current) {
      setConflictDialogOpen(true);
      return;
    }

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
      toast.error("Please enter a valid Property Area (m²). The invoice depends on it.");
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
    submittingRef.current = true;
    // Cancel any pending autosave and wait out an in-flight one so the manual
    // save never races it into a duplicate row.
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    while (autosaveBusyRef.current) {
      await new Promise((r) => setTimeout(r, 100));
    }
    // An autosave may have created the row moments ago — use the freshest id.
    const currentId = inspectionRef.current?.id || inspection.id || null;

    const toastId = toast.loading(
      currentId ? "Updating inspection..." : "Saving inspection..."
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
      if (currentId) {
        // Same optimistic-concurrency guard as autosave — a concurrent edit
        // elsewhere surfaces as a conflict instead of being clobbered.
        const saved = lastUpdatedAtRef.current
          ? await Inspection.updateIfUnchanged(currentId, payload, lastUpdatedAtRef.current)
          : await Inspection.update(currentId, payload);
        if (saved?.updated_at) lastUpdatedAtRef.current = saved.updated_at;
      } else {
        await Inspection.create(payload);
      }
      clearDraft(currentId);
      toast.success("Inspection saved successfully.", { id: toastId });
      navigate(createPageUrl("Inspections"));
    } catch (error) {
      console.error("Failed to save inspection:", error);
      if (error instanceof ConflictError) {
        toast.error("This inspection was changed somewhere else (another tab or user).", { id: toastId });
        enterConflict();
      } else {
        toast.error(error?.message || "Failed to save inspection.", { id: toastId });
      }
      submittingRef.current = false;
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
              <Label htmlFor="area_sqm">Property Area (m²) *</Label>
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
          </div>

          {(areaNum > 0 && ratePerSqm > 0) && (
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2">
              <div className="text-xs text-muted-foreground">
                Estimated invoice ({formatPropertyType(inspection.property_type)}: {ratePerSqm.toFixed(3)} OMR/m² × {areaNum} m²)
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto">
            {conflict ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setConflictDialogOpen(true)}
                className="w-full sm:w-auto text-base sm:text-sm text-status-danger-foreground"
              >
                Changed elsewhere — resolve
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground text-center sm:text-right" aria-live="polite">
                {autosave.state === "pending" && "Unsaved changes…"}
                {autosave.state === "saving" && "Auto-saving…"}
                {autosave.state === "saved" && autosave.at &&
                  `Auto-saved ${autosave.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                {autosave.state === "error" && (
                  <span className="text-status-danger-foreground">Auto-save failed — use Save</span>
                )}
              </span>
            )}
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

      {/* Conflict resolution — another tab or user changed this inspection.
          Autosave stays paused until the user explicitly picks a version. */}
      <AlertDialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inspection changed elsewhere</AlertDialogTitle>
            <AlertDialogDescription className="text-base sm:text-sm">
              This inspection was changed somewhere else (another tab or user).
              Auto-save is paused so nothing gets overwritten. Choose which
              version to keep — reloading discards your local edits.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-base sm:text-sm">Decide later</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConflictReload}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80 text-base sm:text-sm"
            >
              Reload their version
            </AlertDialogAction>
            <AlertDialogAction onClick={handleConflictForce} className="text-base sm:text-sm">
              Save mine anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Draft recovery — local edits that never reached the server survived
          a failed save or a closed tab. */}
      {draftPrompt && (
        <AlertDialog open>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Recover unsaved changes?</AlertDialogTitle>
              <AlertDialogDescription className="text-base sm:text-sm">
                Unsaved changes from {formatDistanceToNow(new Date(draftPrompt.savedAt), { addSuffix: true })} were
                kept on this device after a save didn&apos;t go through. Restore
                them into the form, or discard to keep the last saved version.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleDraftDiscard} className="text-base sm:text-sm">
                Discard
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDraftRestore} className="text-base sm:text-sm">
                Restore
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
