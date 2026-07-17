
import React, { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { toast } from "sonner";

const INSPECTION_STATUSES = ["scheduled", "in_progress", "completed", "cancelled"];
// Stable reference so the metrics useMemo below doesn't re-run every render
// while the status query is still loading.
const EMPTY_COUNTS = {};
// Metrics need only these invoice columns — never the items JSONB.
const INVOICE_METRIC_FIELDS = ["id", "status", "issue_date", "total", "due_date"];
const RECENT_FIELDS = ["id", "inspection_type", "status", "inspection_date", "created_at"];

export default function Dashboard() {
  // Per-status counts computed server-side (head-only) — the donut and the
  // total no longer require downloading the whole inspections table.
  const statusQuery = useQuery({
    queryKey: ["dashboard", "inspectionStatusCounts"],
    queryFn: async () => {
      const entries = await Promise.all(
        INSPECTION_STATUSES.map(async (status) => [status, await Inspection.count({ status })])
      );
      return Object.fromEntries(entries);
    },
  });

  // Unfiltered total — the KPI must count every inspection, including any with
  // a legacy/unexpected status that isn't one of the four charted buckets.
  const totalInspectionsQuery = useQuery({
    queryKey: ["dashboard", "inspectionsTotal"],
    queryFn: () => Inspection.count(),
  });

  const clientsCountQuery = useQuery({
    queryKey: ["dashboard", "clientsCount"],
    queryFn: () => Client.count(),
  });

  // Slim invoice rows (no items JSONB) for revenue + overdue math.
  const invoicesQuery = useQuery({
    queryKey: ["dashboard", "invoiceMetrics"],
    queryFn: () => Invoice.list(null, null, null, INVOICE_METRIC_FIELDS),
  });

  const recentQuery = useQuery({
    queryKey: ["dashboard", "recentInspections"],
    queryFn: () => Inspection.list("-created_at", 5, 0, RECENT_FIELDS),
  });

  const isLoading =
    statusQuery.isLoading || totalInspectionsQuery.isLoading || clientsCountQuery.isLoading ||
    invoicesQuery.isLoading || recentQuery.isLoading;

  useEffect(() => {
    const failed = [
      (statusQuery.isError || totalInspectionsQuery.isError) && "inspections",
      clientsCountQuery.isError && "clients",
      invoicesQuery.isError && "invoices",
      recentQuery.isError && "recent inspections",
    ].filter(Boolean);
    if (failed.length) {
      toast.error(`Could not load ${failed.join(", ")}. Please refresh.`);
    }
  }, [statusQuery.isError, totalInspectionsQuery.isError, clientsCountQuery.isError, invoicesQuery.isError, recentQuery.isError]);

  const statusCounts = statusQuery.data || EMPTY_COUNTS;
  const invoices = useMemo(() => invoicesQuery.data || [], [invoicesQuery.data]);
  const recentInspections = recentQuery.data || [];

  const metrics = useMemo(() => {
    const currentYear = getYear(new Date());
    const totalRevenue = invoices.
    filter((inv) => inv.status === 'paid' && getYear(new Date(inv.issue_date)) === currentYear).
    reduce((sum, inv) => sum + (inv.total || 0), 0);

    const overdueInvoices = invoices.filter((inv) => {
      if (inv.status === 'paid' || inv.status === 'cancelled' || inv.status === 'draft') return false;
      if (!inv.due_date) return false;
      const due = new Date(inv.due_date);
      if (isNaN(due.getTime())) return false;
      return due < new Date();
    }).length;

    return {
      totalInspections: totalInspectionsQuery.data || 0,
      totalRevenue,
      activeClients: clientsCountQuery.data || 0,
      overdueInvoices
    };
  }, [totalInspectionsQuery.data, clientsCountQuery.data, invoices]);

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
        <MetricCard title="Total Inspections" value={metrics.totalInspections} icon={ClipboardList} isLoading={isLoading} iconTone="blue" />
        <MetricCard title="Revenue (YTD)" value={`${metrics.totalRevenue.toFixed(1)} OMR`} icon={DollarSign} isLoading={isLoading} intent="success" iconTone="emerald" />
        <MetricCard title="Active Clients" value={metrics.activeClients} icon={Users} isLoading={isLoading} iconTone="violet" />
        <MetricCard
          title="Overdue Invoices"
          value={metrics.overdueInvoices}
          icon={FileText}
          isLoading={isLoading}
          intent={metrics.overdueInvoices > 0 ? "danger" : "default"}
          iconTone={metrics.overdueInvoices > 0 ? "rose" : "amber"}
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2">
          <InspectionChart statusCounts={statusCounts} isLoading={isLoading} />
        </div>
        
        <div>
          <Card className="shadow-sm">
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