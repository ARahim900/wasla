
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
import { format } from 'date-fns'; // Added format from date-fns

// Constants for smart invoicing
const PRICING = {
  COMMERCIAL_PER_SQM: 2, // OMR
  RESIDENTIAL_PER_SQM: 1, // OMR
};

const COMMERCIAL_TYPES = ['office', 'building'];
const RESIDENTIAL_TYPES = ['villa', 'apartment'];

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
          Client.list({ sort: "-created_date" }),
          Inspection.list({ sort: "-created_date" }),
          Property.list() // Fetch properties
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
            line_items: [], // Initialize as empty array
            subtotal: 0, // Initialize to 0
            tax_rate: 5,
            tax_amount: 0, // Initialize to 0
            total: 0, // Initialize to 0
            notes: "",
            payment_terms: "Payment due upon receipt." // Updated payment terms
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

  useEffect(() => {
    // This effect handles both auto-populating from a linked inspection
    // and recalculating totals when tax rate changes.
    if (!invoice || !inspections.length || !properties.length) return;

    // Default values from current invoice state
    let newClientId = invoice.client_id;
    let newLineItems = invoice.line_items;
    let newSubtotal = invoice.subtotal;

    const selectedInspection = inspections.find(i => i.id === invoice.inspection_id);
    let autoPopulatedSuccessfully = false;

    // If an inspection is linked, derive line items and client from it.
    if (selectedInspection) {
      newClientId = selectedInspection.client_id || invoice.client_id;
      const linkedProperty = properties.find(p => p.id === selectedInspection.property_id);

      if (linkedProperty && linkedProperty.square_footage) {
        let pricePerSqm = 0;
        if (COMMERCIAL_TYPES.includes(linkedProperty.property_type)) {
          pricePerSqm = PRICING.COMMERCIAL_PER_SQM;
        } else if (RESIDENTIAL_TYPES.includes(linkedProperty.property_type)) {
          pricePerSqm = PRICING.RESIDENTIAL_PER_SQM;
        }

        if (pricePerSqm > 0) {
          const subtotal = linkedProperty.square_footage * pricePerSqm;
          const description = `Inspection services for ${linkedProperty.property_type} property at ${linkedProperty.address} (${linkedProperty.square_footage} SQM)`;
          const lineItem = { description, quantity: linkedProperty.square_footage, rate: pricePerSqm, amount: subtotal };
          
          newLineItems = [lineItem];
          newSubtotal = subtotal;
          autoPopulatedSuccessfully = true;
        } else {
            // If pricePerSqm is 0 (e.g., unknown property type), clear line items
            if (newLineItems.length > 0 || newSubtotal > 0) {
                newLineItems = [];
                newSubtotal = 0;
            }
        }
      } else {
        // If no property linked or no square footage, clear line items
        if (newLineItems.length > 0 || newSubtotal > 0) {
            newLineItems = [];
            newSubtotal = 0;
        }
      }
    } else {
      // If no inspection is linked (inspection_id is empty/null), clear the line items.
      if (newLineItems.length > 0 || newSubtotal > 0) {
        newLineItems = [];
        newSubtotal = 0;
      }
    }

    // Always recalculate tax and total based on the subtotal.
    const taxRate = (invoice.tax_rate || 0) / 100;
    const newTaxAmount = newSubtotal * taxRate;
    const newTotal = newSubtotal + newTaxAmount;

    // Only update state if something has actually changed to prevent infinite loops.
    // Use JSON.stringify for deep comparison of line_items array
    const clientChanged = invoice.client_id !== newClientId;
    const lineItemsChanged = JSON.stringify(invoice.line_items) !== JSON.stringify(newLineItems);
    const subtotalChanged = invoice.subtotal !== newSubtotal;
    const taxAmountChanged = invoice.tax_amount !== newTaxAmount;
    const totalChanged = invoice.total !== newTotal;

    if (clientChanged || lineItemsChanged || subtotalChanged || taxAmountChanged || totalChanged) {
      setInvoice(prev => ({
        ...prev,
        client_id: newClientId,
        line_items: newLineItems,
        subtotal: newSubtotal,
        tax_amount: newTaxAmount,
        total: newTotal
      }));
      
      // Show success toast only if auto-population occurred and resulted in a change to line items
      if (autoPopulatedSuccessfully && lineItemsChanged) {
        toast.success("Invoice details populated from inspection.");
      }
    }
  }, [invoice, inspections, properties]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!invoice) return;

    if (!invoice.client_id) {
      toast.error("Please select a client.");
      return;
    }
    if (invoice.line_items.length === 0) {
        toast.error("Please add at least one line item to the invoice.");
        return;
    }
    if (invoice.total <= 0) {
        toast.error("Total amount must be greater than zero.");
        return;
    }

    setIsSaving(true);
    try {
      if (invoice.id) {
        await Invoice.update(invoice.id, invoice);
      } else {
        await Invoice.create(invoice);
      }
      toast.success("Invoice saved successfully");
      navigate(createPageUrl("Invoices"));
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast.error("Failed to save invoice");
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
        <h1 className="text-2xl font-bold text-slate-900 order-2 sm:order-1">{invoice.id ? "Edit Invoice" : "New Invoice"}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-slate-800">Invoice Details</CardTitle>
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
                <Select value={invoice.inspection_id || ""} onValueChange={(value) => handleFieldChange("inspection_id", value)}>
                  <SelectTrigger id="inspection_id">
                    <SelectValue placeholder="Select inspection" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
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
                <h3 className="font-semibold text-slate-800">Billing Details</h3>
                {invoice.line_items?.map((item, index) => (
                    <div key={index} className="flex flex-wrap items-end gap-4">
                        <div className="flex-grow space-y-1 min-w-[150px]">
                            <Label className="text-xs">Description</Label>
                            <Input value={item.description} disabled />
                        </div>
                        <div className="space-y-1 w-24">
                            <Label className="text-xs">SQM</Label>
                            <Input type="number" value={item.quantity} disabled />
                        </div>
                        <div className="space-y-1 w-24">
                            <Label className="text-xs">Rate (OMR)</Label>
                            <Input type="number" value={item.rate} disabled />
                        </div>
                        <div className="space-y-1 w-32">
                            <Label className="text-xs">Amount (OMR)</Label>
                            <Input type="number" value={item.amount?.toFixed(3)} disabled />
                        </div>
                    </div>
                ))}
                {invoice.line_items?.length === 0 && <p className="text-sm text-slate-500 text-center py-4">Select an inspection to auto-fill or add items manually.</p>}

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
              <Button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto">
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
