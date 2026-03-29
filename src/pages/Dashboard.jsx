
import React, { useState, useEffect, useMemo } from "react";
import { Inspection, Client, Invoice } from "@/api/entities";
import { ClipboardList, Users, FileText, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import MetricCard from "../components/dashboard/MetricCard";
import InspectionChart from "../components/dashboard/InspectionChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, getYear } from "date-fns";
import { getInspectionStatusColor } from "@/lib/status";

export default function Dashboard() {
  const [inspections, setInspections] = useState([]);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [inspectionData, clientData, invoiceData] = await Promise.all([
        Inspection.list().catch(() => []),
        Client.list().catch(() => []),
        Invoice.list().catch(() => [])]
        );

        setInspections(inspectionData || []);
        setClients(clientData || []);
        setInvoices(invoiceData || []);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        // Set empty arrays so dashboard still works
        setInspections([]);
        setClients([]);
        setInvoices([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const metrics = useMemo(() => {
    const currentYear = getYear(new Date());
    const totalRevenue = invoices.
    filter((inv) => inv.status === 'paid' && getYear(new Date(inv.issue_date)) === currentYear).
    reduce((sum, inv) => sum + (inv.total || 0), 0);

    const overdueInvoices = invoices.filter((inv) => {
      if (inv.status === 'paid' || inv.status === 'cancelled' || inv.status === 'draft') return false;
      return new Date(inv.due_date) < new Date();
    }).length;

    return {
      totalInspections: inspections.length,
      totalRevenue,
      activeClients: clients.length,
      overdueInvoices
    };
  }, [inspections, clients, invoices]);

  const recentInspections = useMemo(() => inspections.slice(0, 5), [inspections]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants} 
      initial="hidden" 
      animate="show" 
      className="space-y-6 lg:space-y-8"
    >
      <div>
        <h1 className="text-foreground mb-1 font-bold text-2xl lg:text-3xl tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm lg:text-base">Overview of your inspections, clients, and revenue.</p>
      </div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        <MetricCard title="Total Inspections" value={metrics.totalInspections} icon={ClipboardList} isLoading={isLoading} />
        <MetricCard title="Revenue (YTD)" value={`${metrics.totalRevenue.toFixed(3)} OMR`} icon={DollarSign} isLoading={isLoading} />
        <MetricCard title="Active Clients" value={metrics.activeClients} icon={Users} isLoading={isLoading} />
        <MetricCard title="Overdue Invoices" value={metrics.overdueInvoices} icon={FileText} isLoading={isLoading} />
      </motion.div>

      <motion.div variants={itemVariants} className="grid lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2">
          <InspectionChart inspections={inspections} isLoading={isLoading} />
        </div>
        
        <div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-foreground">Recent Inspections</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link to={createPageUrl("Inspections")}>View All</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ?
              Array.from({ length: 3 }).map((_, i) =>
              <div key={i} className="space-y-2 pb-3 animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
              ) :
              recentInspections.length > 0 ?
              recentInspections.map((inspection) =>
              <div key={inspection.id} className="space-y-1.5 pb-3 border-b last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-foreground text-sm truncate flex-1">
                        {inspection.inspection_type?.replace(/_/g, ' ').toUpperCase() || 'Inspection'}
                      </p>
                      <Badge variant="secondary" className={`${getInspectionStatusColor(inspection.status)} text-xs capitalize`}>
                        {inspection.status?.replace("_", " ") || 'scheduled'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {inspection.inspection_date ? format(new Date(inspection.inspection_date), 'MMM d, yyyy') : 'No date'}
                    </p>
                  </div>
              ) :

              <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No inspections yet</p>
                  <Button variant="secondary" size="sm" className="mt-4" asChild>
                    <Link to={createPageUrl("InspectionForm")}>Create First Inspection</Link>
                  </Button>
                </div>
              }
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </motion.div>);

}