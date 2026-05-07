
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Invoice, Client, Inspection, Property } from "@/api/entities"; // Added Property
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
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

  // Auto-populate line items + client from the linked inspection, and
  // recalc totals when the tax rate changes. The deps list is *not* the
  // whole `invoice` object — that caused a feedback loop because each
  // setInvoice call produced a new reference and re-ran the effect.
  useEffect(() => {
    if (!invoice || !inspections.length) return;

    const selectedInspection = invoice.inspection_id
      ? inspections.find(i => i.id === invoice.inspection_id)
      : null;
    const linkedProperty = selectedInspection?.property_id
      ? properties.find(p => p.id === selectedInspection.property_id)
      : null;

    let newClientId = invoice.client_id;
    let newLineItems = invoice.items || [];
    let newSubtotal = Number(invoice.subtotal) || 0;
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
          description: `Inspection services for ${formatPropertyType(propertyType)} at ${address} (${areaSqm} SQM @ ${pricePerSqm.toFixed(3)} OMR/SQM)`,
          quantity: areaSqm,
          rate: pricePerSqm,
          amount: subtotal,
        }];
        newSubtotal = subtotal;
        didAutoPopulate = true;
      } else {
        newLineItems = [];
        newSubtotal = 0;
      }
    } else {
      // No inspection linked — leave any user-entered items alone unless
      // they came from a previous auto-fill (subtotal>0 but no inspection).
      if (newLineItems.length > 0 && newSubtotal > 0 && !invoice.id) {
        // For a brand-new invoice that lost its inspection link, clear.
        newLineItems = [];
        newSubtotal = 0;
      }
    }

    const taxRate = (Number(invoice.tax_rate) || 0) / 100;
    const newTaxAmount = newSubtotal * taxRate;
    const newTotal = newSubtotal + newTaxAmount;

    // Compare via stable scalars — id-based for items — so we don't spin on
    // floating-point round-trip differences.
    const itemsKey = (items) => (items || [])
      .map(i => `${i.description}|${i.quantity}|${i.rate}|${i.amount}`)
      .join('||');

    const clientChanged = invoice.client_id !== newClientId;
    const lineItemsChanged = itemsKey(invoice.items) !== itemsKey(newLineItems);
    const subtotalChanged = Math.abs((Number(invoice.subtotal) || 0) - newSubtotal) > 1e-6;
    const taxAmountChanged = Math.abs((Number(invoice.tax_amount) || 0) - newTaxAmount) > 1e-6;
    const totalChanged = Math.abs((Number(invoice.total) || 0) - newTotal) > 1e-6;

    if (!clientChanged && !lineItemsChanged && !subtotalChanged && !taxAmountChanged && !totalChanged) {
      return;
    }

    setInvoice(prev => ({
      ...prev,
      client_id: newClientId,
      items: newLineItems,
      subtotal: newSubtotal,
      tax_amount: newTaxAmount,
      total: newTotal,
    }));

    if (didAutoPopulate && lineItemsChanged) {
      toast.success("Invoice details populated from inspection.");
    }
    // Depend on the specific scalars that should drive recompute, not the
    // whole `invoice` object — that's what caused the loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice?.inspection_id, invoice?.tax_rate, inspections, properties]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!invoice) return;

    if (!invoice.client_id) {
      toast.error("Please select a client.");
      return;
    }
    if (invoice.items.length === 0) {
        toast.error("Please add at least one line item to the invoice.");
        return;
    }
    if (invoice.total <= 0) {
        toast.error("Total amount must be greater than zero.");
        return;
    }

    setIsSaving(true);
    try {
      // Normalize empty UUID strings to null — Postgres rejects "" as uuid.
      const payload = {
        ...invoice,
        inspection_id: invoice.inspection_id || null,
        client_id: invoice.client_id || null,
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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="invoice_number">Invoice Number</Label>
                <Input 
                  id="invoice_number"
                  value={invoice.invoice_number} 
                  onChange={(e) => handleFieldChange("invoice_number", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inspection_id">Link to Inspection (Optional)</Label>
                <Select value={invoice.inspection_id || "none"} onValueChange={(value) => handleFieldChange("inspection_id", value === "none" ? "" : value)}>
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
                <Select value={invoice.client_id} onValueChange={(value) => handleFieldChange("client_id", value)}>
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={invoice.status} onValueChange={(value) => handleFieldChange("status", value)}>
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
                            <Label className="text-sm">Description</Label>
                            <Input value={item.description} disabled />
                        </div>
                        <div className="space-y-1 w-24">
                            <Label className="text-sm">SQM</Label>
                            <Input type="number" value={item.quantity} disabled />
                        </div>
                        <div className="space-y-1 w-24">
                            <Label className="text-sm">Rate (OMR)</Label>
                            <Input type="number" value={item.rate} disabled />
                        </div>
                        <div className="space-y-1 w-32">
                            <Label className="text-sm">Amount (OMR)</Label>
                            <Input type="number" value={item.amount?.toFixed(3)} disabled />
                        </div>
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
                  else if (area <= 0) reason = "Set an Area (SQM) on the inspection or the property to auto-calculate.";
                  else if (!knownType) reason = `No rate is configured for property type "${type}".`;
                  return (
                    <p className="text-sm text-amber-700 dark:text-amber-400 text-center py-4">
                      Couldn’t auto-calculate. {reason}
                    </p>
                  );
                })()}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t">
                    <div className="col-span-1 hidden sm:block"></div>
                    <div className="col-span-1 text-right space-y-2">
                        <p>Subtotal:</p>
                        <p>Tax ({invoice.tax_rate}%):</p>
                        <p className="font-bold">Total:</p>
                    </div>
                    <div className="col-span-1 space-y-2">
                        <p>{invoice.subtotal?.toFixed(3) || '0.000'} OMR</p>
                        <p>{invoice.tax_amount?.toFixed(3) || '0.000'} OMR</p>
                        <p className="font-bold">{invoice.total?.toFixed(3) || '0.000'} OMR</p>
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_terms">Payment Terms</Label>
              <Input 
                id="payment_terms"
                value={invoice.payment_terms || ""} 
                onChange={(e) => handleFieldChange("payment_terms", e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate(createPageUrl("Invoices"))} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Invoice"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
