
import React, { useState, useEffect, useMemo } from "react";
import { Invoice, Client, Inspection, Property } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, Calendar, User, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

const STATUS_OPTIONS = ["all", "draft", "sent", "paid", "overdue", "cancelled"];

const getStatusColor = (status) => {
  const colors = {
    draft: "bg-gray-200 text-gray-800",
    sent: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
    overdue: "bg-red-100 text-red-800",
    cancelled: "bg-slate-200 text-slate-800"
  };
  return colors[status] || "bg-gray-200 text-gray-800";
};

export default function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [properties, setProperties] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [invoiceResult, clientResult, inspectionResult, propertyResult] = await Promise.all([
          Invoice.list().catch(() => []),
          Client.list().catch(() => []),
          Inspection.list().catch(() => []),
          Property.list().catch(() => []),
        ]);

        setInvoices(Array.isArray(invoiceResult) ? invoiceResult : []);
        setClients(Array.isArray(clientResult) ? clientResult : []);
        setInspections(Array.isArray(inspectionResult) ? inspectionResult : []);
        setProperties(Array.isArray(propertyResult) ? propertyResult : []);
      } catch (error) {
        console.error("Failed to load invoice data:", error);
        toast.error(`Failed to load invoice data: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const clientsMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      const client = clientsMap.get(invoice.client_id);
      const search = searchTerm.toLowerCase();
      
      const matchesSearch = !search ||
        client?.name.toLowerCase().includes(search) ||
        invoice.invoice_number.toLowerCase().includes(search);
      
      const isOverdue = invoice.status !== 'paid' && invoice.status !== 'cancelled' && new Date(invoice.due_date) < new Date();
      const effectiveStatus = isOverdue ? 'overdue' : invoice.status;
      
      const matchesStatus = statusFilter === "all" || effectiveStatus === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, statusFilter, clientsMap]);

  const totals = useMemo(() => {
    return filteredInvoices.reduce((acc, inv) => {
        const total = inv.total || 0;
        acc.total += total;
        if (inv.status === 'paid') {
            acc.paid += total;
        } else {
            acc.outstanding += total;
        }
        return acc;
    }, { total: 0, paid: 0, outstanding: 0 });
  }, [filteredInvoices]);

  return (
    <div className="space-y-6 lg:space-y-8 p-4 md:p-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Invoices</h1>
          <p className="text-sm lg:text-base text-slate-600 mt-1">Manage your billing and track payments.</p>
        </div>
        <Button onClick={() => navigate(createPageUrl("InvoiceForm"))} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <Card><CardContent className="p-4 md:p-6"><p className="text-sm font-medium text-slate-600">Total Revenue</p><p className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 mt-1 break-all">{totals.total.toFixed(3)} OMR</p></CardContent></Card>
        <Card><CardContent className="p-4 md:p-6"><p className="text-sm font-medium text-slate-600">Paid</p><p className="text-xl md:text-2xl lg:text-3xl font-bold text-green-600 mt-1 break-all">{totals.paid.toFixed(3)} OMR</p></CardContent></Card>
        <Card><CardContent className="p-4 md:p-6"><p className="text-sm font-medium text-slate-600">Outstanding</p><p className="text-xl md:text-2xl lg:text-3xl font-bold text-orange-600 mt-1 break-all">{totals.outstanding.toFixed(3)} OMR</p></CardContent></Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search by client or invoice #" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {STATUS_OPTIONS.map((status) => (
            <Button key={status} variant={statusFilter === status ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(status)} className="whitespace-nowrap capitalize">
              {status}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:gap-6">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => <Card key={i} className="animate-pulse h-40 bg-slate-200" />)
        ) : (
          <AnimatePresence>
            {filteredInvoices.length > 0 ? (
              filteredInvoices.map((invoice) => {
                const client = clientsMap.get(invoice.client_id);
                const isOverdue = invoice.status !== 'paid' && invoice.status !== 'cancelled' && new Date(invoice.due_date) < new Date();
                const status = isOverdue ? 'overdue' : invoice.status;

                return (
                  <motion.div key={invoice.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}>
                    <Card className="hover:border-emerald-500/50 transition-colors overflow-hidden">
                      <CardHeader className="p-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                          <div className="space-y-2 flex-1 min-w-0">
                            <CardTitle className="text-slate-900 flex items-center gap-3 text-base">
                              <FileText className="w-5 h-5 text-slate-500" />
                              <span className="truncate">Invoice #{invoice.invoice_number}</span>
                            </CardTitle>
                            <Badge variant="secondary" className={`${getStatusColor(status)} capitalize`}>{status}</Badge>
                          </div>
                          <div className="text-left sm:text-right flex-shrink-0 w-full sm:w-auto self-end sm:self-start">
                            <p className="font-bold text-xl sm:text-2xl text-slate-900 truncate">{(invoice.total || 0).toFixed(3)} OMR</p>
                            <Button variant="ghost" size="sm" className="mt-1 -ml-2" onClick={() => navigate(createPageUrl(`InvoiceForm?id=${invoice.id}`))}>
                              <Eye className="w-4 h-4 mr-1" />View
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4 text-sm text-slate-500">
                          <div className="flex items-center gap-2 min-w-0"><User className="w-4 h-4" /><span className="truncate">{client?.name || 'Unknown Client'}</span></div>
                          <div className="flex items-center gap-2 min-w-0"><Calendar className="w-4 h-4" /><span className="truncate">Due: {invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : 'No date'}</span></div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center py-16 col-span-full">
                <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-medium text-slate-800 mb-2">No Invoices Found</h3>
                <p className="text-slate-500 mb-4">{searchTerm || statusFilter !== "all" ? "Try adjusting your filters." : "Get started by creating your first invoice."}</p>
                <Button onClick={() => navigate(createPageUrl("InvoiceForm"))} className="mt-2 bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" />Create First Invoice</Button>
              </div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
