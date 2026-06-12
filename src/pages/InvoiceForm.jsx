
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Invoice, Client, Inspection, Property } from "@/api/entities"; // Added Property
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { format } from 'date-fns';
import { RATE_PER_SQM, formatPropertyType } from "@/lib/pricing";

export default function InvoiceForm() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [invoice, setInvoice] = useState(null);
  const [clients, setClients] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [properties, setProperties] = useState([]); // Added properties state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false); // paid invoices are read-only until explicitly unlocked
  const [pendingStatus, setPendingStatus] = useState(null); // status change awaiting unlock confirmation
  // Tracks whether the user actively changed the inspection selection this
  // session — auto-populate must never fire just because an existing invoice
  // loaded and the inspections/properties lists arrived.
  const userChangedInspectionRef = useRef(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const invoiceId = searchParams.get("id");
    
    const loadData = async () => {
      try {
        // Fetch properties along with clients and inspections
        const [clientData, inspectionData, propertyData] = await Promise.all([
          Client.list("-created_at"),
          Inspection.list("-created_at"),
          Property.list()
        ]);
        
        setClients(clientData || []);
        setInspections(inspectionData || []);
        setProperties(propertyData || []); // Set properties state
        
        if (invoiceId) {
          const existing = await Invoice.filter({ id: invoiceId });
          const invoiceData = existing?.[0];
          if (invoiceData) {
            setInvoice(invoiceData);
            setIsLocked(invoiceData.status === "paid");
          } else {
            toast.error("Invoice not found");
            navigate(createPageUrl("Invoices"));
            return;
          }
        } else {
          // New invoice - updated initial values
          setInvoice({
            invoice_number: `INV-${Date.now()}`,
            client_id: "",
            inspection_id: "",
            issue_date: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: "draft",
            items: [],
            subtotal: 0,
            tax_rate: 5,
            tax_amount: 0,
            total: 0,
            notes: "",
            payment_terms: "Payment due upon receipt."
          });
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [location.search, navigate]);

  // Auto-populate line items + client from the linked inspection. The deps
  // list is *not* the whole `invoice` object — that caused a feedback loop
  // because each setInvoice call produced a new reference and re-ran the effect.
  useEffect(() => {
    if (!invoice || !inspections.length) return;
    // Only auto-populate for a new invoice or after the user actively changes
    // the inspection selection. An existing invoice must display its stored
    // line items exactly as persisted — never rebuilt from current rates.
    if (invoice.id && !userChangedInspectionRef.current) return;

    const selectedInspection = invoice.inspection_id
      ? inspections.find(i => i.id === invoice.inspection_id)
      : null;
    const linkedProperty = selectedInspection?.property_id
      ? properties.find(p => p.id === selectedInspection.property_id)
      : null;

    let newClientId = invoice.client_id;
    let newLineItems = invoice.items || [];
    let didAutoPopulate = false;

    if (selectedInspection) {
      newClientId = selectedInspection.client_id || invoice.client_id;
      const inspectionArea = Number(selectedInspection.area_sqm);
      const propertyArea = Number(linkedProperty?.area_sqm);
      const areaSqm = Number.isFinite(inspectionArea) && inspectionArea > 0
        ? inspectionArea
        : (Number.isFinite(propertyArea) && propertyArea > 0 ? propertyArea : 0);
      const propertyType = linkedProperty?.property_type || selectedInspection.property_type;
      const pricePerSqm = RATE_PER_SQM[propertyType] || 0;
      const address = linkedProperty?.address || selectedInspection.property_address;

      if (areaSqm > 0 && pricePerSqm > 0 && address) {
        const subtotal = areaSqm * pricePerSqm;
        newLineItems = [{
          description: `Inspection services for ${formatPropertyType(propertyType)} at ${address} (${areaSqm} m² @ ${pricePerSqm.toFixed(3)} OMR/m²)`,
          quantity: areaSqm,
          rate: pricePerSqm,
          amount: subtotal,
        }];
        didAutoPopulate = true;
      } else {
        newLineItems = [];
      }
    } else {
      // No inspection linked — leave any user-entered items alone on an
      // existing invoice. For a brand-new invoice that lost its inspection
      // link, clear the previously auto-filled rows.
      if (newLineItems.length > 0 && !invoice.id) {
        newLineItems = [];
      }
    }

    // Compare via stable scalars — id-based for items — so we don't spin on
    // floating-point round-trip differences.
    const itemsKey = (items) => (items || [])
      .map(i => `${i.description}|${i.quantity}|${i.rate}|${i.amount}`)
      .join('||');

    const clientChanged = invoice.client_id !== newClientId;
    const lineItemsChanged = itemsKey(invoice.items) !== itemsKey(newLineItems);

    if (!clientChanged && !lineItemsChanged) {
      return;
    }

    setInvoice(prev => ({
      ...prev,
      client_id: newClientId,
      items: newLineItems,
    }));

    if (didAutoPopulate && lineItemsChanged) {
      toast.success("Invoice details populated from inspection.");
    }
    // Depend on the specific scalars that should drive recompute, not the
    // whole `invoice` object — that's what caused the loop.
  }, [invoice?.inspection_id, inspections, properties]);

  // Recompute totals live from the items array (subtotal = Σ quantity × rate,
  // tax = subtotal × tax_rate, total = subtotal + tax). Epsilon-compare before
  // writing so floating-point round-trips don't cause a render loop. Skipped
  // while locked so a paid invoice's stored totals are never touched.
  useEffect(() => {
    if (!invoice || isLocked) return;

    const newSubtotal = (invoice.items || []).reduce(
      (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0),
      0
    );
    const newTaxAmount = newSubtotal * ((Number(invoice.tax_rate) || 0) / 100);
    const newTotal = newSubtotal + newTaxAmount;

    const subtotalChanged = Math.abs((Number(invoice.subtotal) || 0) - newSubtotal) > 1e-6;
    const taxAmountChanged = Math.abs((Number(invoice.tax_amount) || 0) - newTaxAmount) > 1e-6;
    const totalChanged = Math.abs((Number(invoice.total) || 0) - newTotal) > 1e-6;

    if (!subtotalChanged && !taxAmountChanged && !totalChanged) {
      return;
    }

    setInvoice(prev => ({
      ...prev,
      subtotal: newSubtotal,
      tax_amount: newTaxAmount,
      total: newTotal,
    }));
  }, [invoice?.items, invoice?.tax_rate, isLocked]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!invoice || isLocked) return;

    if (!invoice.client_id) {
      toast.error("Please select a client.");
      return;
    }
    if (invoice.items.length === 0) {
        toast.error("Please add at least one line item to the invoice.");
        return;
    }
    const hasBillableItem = (invoice.items || []).some(
      item => (Number(item.quantity) || 0) * (Number(item.rate) || 0) > 0
    );
    if (!hasBillableItem) {
        toast.error("Please add at least one line item with an amount greater than zero.");
        return;
    }
    if (invoice.total <= 0) {
        toast.error("Total amount must be greater than zero.");
        return;
    }

    setIsSaving(true);
    try {
      // Normalize empty UUID strings to null — Postgres rejects "" as uuid.
      // Coerce item numbers back from input strings before persisting.
      const payload = {
        ...invoice,
        inspection_id: invoice.inspection_id || null,
        client_id: invoice.client_id || null,
        items: (invoice.items || []).map(item => ({
          ...item,
          quantity: Number(item.quantity) || 0,
          rate: Number(item.rate) || 0,
          amount: (Number(item.quantity) || 0) * (Number(item.rate) || 0),
        })),
      };
      if (invoice.id) {
        await Invoice.update(invoice.id, payload);
      } else {
        await Invoice.create(payload);
      }
      toast.success("Invoice saved successfully");
      navigate(createPageUrl("Invoices"));
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast.error(error?.message || "Failed to save invoice");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setInvoice(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setInvoice(prev => {
      const items = [...(prev.items || [])];
      const item = { ...items[index], [field]: value };
      item.amount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
      items[index] = item;
      return { ...prev, items };
    });
  };

  const handleAddItem = () => {
    setInvoice(prev => ({
      ...prev,
      items: [...(prev.items || []), { description: "", quantity: 1, rate: 0, amount: 0 }],
    }));
  };

  const handleRemoveItem = (index) => {
    setInvoice(prev => ({
      ...prev,
      items: (prev.items || []).filter((_, i) => i !== index),
    }));
  };

  const handleStatusChange = (value) => {
    // Moving a paid invoice off "paid" unlocks editing — confirm first.
    if (isLocked && value !== "paid") {
      setPendingStatus(value);
      return;
    }
    handleFieldChange("status", value);
  };

  const handleConfirmUnlock = () => {
    if (pendingStatus) {
      setInvoice(prev => ({ ...prev, status: pendingStatus }));
      setIsLocked(false);
    }
    setPendingStatus(null);
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!invoice) {
    return <div className="p-8 text-center">No invoice data</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Button variant="outline" onClick={() => navigate(createPageUrl("Invoices"))} className="w-full sm:w-auto order-1 sm:order-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
        </Button>
        <h1 className="text-2xl font-bold text-foreground order-2 sm:order-1">{invoice.id ? "Edit Invoice" : "New Invoice"}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {isLocked && (
              <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                This invoice is paid and locked. Change its status to unlock and edit it.
              </div>
            )}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="invoice_number">Invoice Number</Label>
                <Input
                  id="invoice_number"
                  value={invoice.invoice_number}
                  onChange={(e) => handleFieldChange("invoice_number", e.target.value)}
                  required
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inspection_id">Link to Inspection (Optional)</Label>
                <Select value={invoice.inspection_id || "none"} disabled={isLocked} onValueChange={(value) => { userChangedInspectionRef.current = true; handleFieldChange("inspection_id", value === "none" ? "" : value); }}>
                  <SelectTrigger id="inspection_id">
                    <SelectValue placeholder="Select inspection" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {inspections.map(insp => (
                      <SelectItem key={insp.id} value={insp.id}>
                        {insp.client_name || 'N/A'} - {insp.inspection_type?.replace(/_/g, ' ') || 'N/A'} ({insp.inspection_date ? format(new Date(insp.inspection_date), "MMM d, yyyy") : 'No date'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_id">Client</Label>
                <Select value={invoice.client_id} disabled={isLocked} onValueChange={(value) => handleFieldChange("client_id", value)}>
                  <SelectTrigger id="client_id">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="issue_date">Issue Date</Label>
                <Input 
                  id="issue_date"
                  type="date"
                  value={invoice.issue_date?.split('T')[0]} // Ensure date-only format
                  onChange={(e) => handleFieldChange("issue_date", e.target.value)}
                  required
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input 
                  id="due_date"
                  type="date"
                  value={invoice.due_date?.split('T')[0]} // Ensure date-only format
                  onChange={(e) => handleFieldChange("due_date", e.target.value)}
                  required
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={invoice.status} onValueChange={handleStatusChange}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-foreground">Billing Details</h3>
                {invoice.items?.map((item, index) => (
                    <div key={index} className="flex flex-wrap items-end gap-4">
                        <div className="flex-grow space-y-1 min-w-[150px]">
                            <Label htmlFor={`item_description_${index}`} className="text-sm">Description</Label>
                            <Input
                                id={`item_description_${index}`}
                                value={item.description}
                                onChange={(e) => handleItemChange(index, "description", e.target.value)}
                                disabled={isLocked}
                            />
                        </div>
                        <div className="space-y-1 w-24">
                            <Label htmlFor={`item_quantity_${index}`} className="text-sm">Quantity</Label>
                            <Input
                                id={`item_quantity_${index}`}
                                type="number"
                                min="0"
                                step="any"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                                disabled={isLocked}
                            />
                        </div>
                        <div className="space-y-1 w-28">
                            <Label htmlFor={`item_rate_${index}`} className="text-sm">Unit Price (OMR)</Label>
                            <Input
                                id={`item_rate_${index}`}
                                type="number"
                                min="0"
                                step="0.001"
                                value={item.rate}
                                onChange={(e) => handleItemChange(index, "rate", e.target.value)}
                                disabled={isLocked}
                            />
                        </div>
                        <div className="space-y-1 w-32">
                            <Label className="text-sm">Amount (OMR)</Label>
                            <Input type="number" value={(Number(item.amount) || 0).toFixed(3)} disabled />
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(index)}
                            disabled={isLocked}
                            aria-label={`Remove item ${index + 1}`}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                {invoice.items?.length === 0 && (() => {
                  if (!invoice.inspection_id) {
                    return <p className="text-sm text-muted-foreground text-center py-4">Select an inspection to auto-fill or add items manually.</p>;
                  }
                  const insp = inspections.find(i => i.id === invoice.inspection_id);
                  const prop = insp ? properties.find(p => p.id === insp.property_id) : null;
                  const area = Number(insp?.area_sqm) || Number(prop?.area_sqm) || 0;
                  const type = prop?.property_type || insp?.property_type;
                  const knownType = type && Object.prototype.hasOwnProperty.call(RATE_PER_SQM, type);
                  let reason = "";
                  if (!prop) reason = "The linked inspection has no property attached.";
                  else if (area <= 0) reason = "Set a Property Area (m²) on the inspection or the property to auto-calculate.";
                  else if (!knownType) reason = `No rate is configured for property type "${type}".`;
                  return (
                    <p className="text-sm text-amber-700 dark:text-amber-400 text-center py-4">
                      Couldn’t auto-calculate. {reason} You can also add items manually.
                    </p>
                  );
                })()}

                <Button type="button" variant="outline" onClick={handleAddItem} disabled={isLocked} className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Add item
                </Button>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t">
                    <div className="col-span-1 hidden sm:block"></div>
                    <div className="col-span-1 text-right space-y-2">
                        <p>Subtotal:</p>
                        <p>Tax ({invoice.tax_rate}%):</p>
                        <p className="font-bold">Total:</p>
                    </div>
                    <div className="col-span-1 space-y-2">
                        <p>{(Number(invoice.subtotal) || 0).toFixed(3)} OMR</p>
                        <p>{(Number(invoice.tax_amount) || 0).toFixed(3)} OMR</p>
                        <p className="font-bold">{(Number(invoice.total) || 0).toFixed(3)} OMR</p>
                    </div>
                </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={invoice.notes || ""}
                onChange={(e) => handleFieldChange("notes", e.target.value)}
                rows={3}
                disabled={isLocked}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_terms">Payment Terms</Label>
              <Input
                id="payment_terms"
                value={invoice.payment_terms || ""}
                onChange={(e) => handleFieldChange("payment_terms", e.target.value)}
                disabled={isLocked}
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate(createPageUrl("Invoices"))} className="w-full sm:w-auto">
                Cancel
              </Button>
              {!isLocked && (
                <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Invoice"}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Unlock Confirmation */}
      <AlertDialog open={!!pendingStatus} onOpenChange={() => setPendingStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlock Paid Invoice</AlertDialogTitle>
            <AlertDialogDescription>This invoice is marked as paid. Changing its status will unlock it for editing. Are you sure you want to continue?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUnlock}>Change Status</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
