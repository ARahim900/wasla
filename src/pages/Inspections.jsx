
import React, { useState, useEffect, useMemo } from "react";
import { Inspection, Property, Client } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, ClipboardList, Calendar, User, Eye, Trash2, Loader2, ChevronDown, Circle, ArrowUpCircle, CheckCircle2, X } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import Pagination from "../components/ui/Pagination";
import PDFExportButton from "../components/inspections/PDFExportButton";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils"; // Assuming cn utility is available here, common in Shadcn UI projects

const getStatusColor = (status) => {
  const colors = {
    scheduled: "bg-blue-100 text-blue-800",
    in_progress: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return colors[status] || "bg-gray-200 text-gray-800";
};

const ITEMS_PER_PAGE = 5;

export default function Inspections() {
  const navigate = useNavigate();
  const [inspections, setInspections] = useState([]);
  const [properties, setProperties] = useState([]);
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [inspectionData, propertyData, clientData] = await Promise.all([
        Inspection.list().catch(() => []),
        Property.list().catch(() => []),
        Client.list().catch(() => [])
      ]);

      setInspections(inspectionData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) || []);
      setProperties(propertyData || []);
      setClients(clientData || []);

    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load inspection data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (inspection, newStatus) => {
    try {
      await Inspection.update(inspection.id, { ...inspection, status: newStatus });
      toast.success(`Inspection status updated to ${newStatus.replace('_', ' ')}`);
      await loadData(); // Refresh the list to show updated status
    } catch (error) {
      console.error("Error updating inspection status:", error);
      toast.error("Failed to update inspection status");
    }
  };

  const handleDelete = async (inspectionId) => {
    if (!confirm("Are you sure you want to delete this inspection?")) return;

    try {
      await Inspection.delete(inspectionId);
      toast.success("Inspection deleted successfully");
      await loadData();
    } catch (error) {
      console.error("Error deleting inspection:", error);
      toast.error("Failed to delete inspection");
    }
  };

  const filteredInspections = useMemo(() => {
    let filtered = inspections;
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((inspection) => {
        if (!inspection) return false;
        return (inspection.client_name && inspection.client_name.toLowerCase().includes(search)) ||
          (inspection.inspector_name && inspection.inspector_name.toLowerCase().includes(search)) ||
          (inspection.inspection_type && inspection.inspection_type.toLowerCase().includes(search)) ||
          (inspection.property_type && inspection.property_type.toLowerCase().includes(search));
      });
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(inspection => inspection.status === statusFilter);
    }

    return filtered;
  }, [inspections, searchTerm, statusFilter]);

  const paginatedInspections = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredInspections.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredInspections, currentPage]);

  const totalPages = Math.ceil(filteredInspections.length / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Inspections</h1>
          <p className="text-slate-600 mt-1">Manage and track all your property inspections.</p>
        </div>
        <Button
          onClick={() => navigate(createPageUrl("InspectionForm"))}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Schedule Inspection
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search inspections..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset page on search
            }}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {["all", "scheduled", "in_progress", "completed", "cancelled"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setStatusFilter(status);
                setCurrentPage(1); // Reset page on filter change
              }}
              className="capitalize whitespace-nowrap"
            >
              {status.replace("_", " ")}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
            <p className="mt-2 text-slate-500">Loading inspections...</p>
          </div>
        ) : paginatedInspections.length > 0 ? (
          paginatedInspections.map((inspection) => {
            const client = clients.find(c => c.id === inspection.client_id);
            const property = properties.find(p => p.id === inspection.property_id);

            return (
              <Card key={inspection.id} className="hover:border-emerald-500/50 transition-colors overflow-hidden">
                <CardHeader className="p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <CardTitle className="text-slate-900 flex items-center gap-2 text-base font-semibold">
                          <ClipboardList className="w-5 h-5 text-emerald-600" />
                          <span className="capitalize">{inspection.inspection_type?.replace(/_/g, ' ')} Inspection</span>
                        </CardTitle>
                        
                        {/* Enhanced Status Dropdown with Real-time Updates */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "capitalize px-3 py-1 text-xs font-medium rounded-full",
                                getStatusColor(inspection.status)
                              )}
                            >
                              {inspection.status?.replace("_", " ") || 'scheduled'}
                              <ChevronDown className="w-3 h-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(inspection, "scheduled")}
                              className="text-sm cursor-pointer"
                            >
                              <Circle className="w-4 h-4 mr-2 text-blue-500" />
                              Scheduled
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(inspection, "in_progress")}
                              className="text-sm cursor-pointer"
                            >
                              <ArrowUpCircle className="w-4 h-4 mr-2 text-yellow-500" />
                              In Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(inspection, "completed")}
                              className="text-sm cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                              Completed
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(inspection, "cancelled")}
                              className="text-sm cursor-pointer"
                            >
                              <X className="w-4 h-4 mr-2 text-red-500" />
                              Cancelled
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-2 ml-7">
                        {inspection.client_name && (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3" />
                            <span>{inspection.client_name}</span>
                          </div>
                        )}
                        {inspection.inspection_date && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(inspection.inspection_date), "MMM d, yyyy")}</span>
                          </div>
                        )}
                      </div>
                      {property?.address && (
                        <div className="text-xs text-slate-500 mt-1 ml-7">
                          Property: {property.address}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 self-start sm:self-center flex-shrink-0">
                      <PDFExportButton 
                        inspection={inspection} 
                        client={client} 
                        property={property}
                        variant="outline"
                        size="sm"
                        showIcon={true}
                        label="View Report"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(createPageUrl(`InspectionForm?id=${inspection.id}`))}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-500/80 w-8 h-8"
                        onClick={() => handleDelete(inspection.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-16">
            <ClipboardList className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-medium text-slate-800 mb-2">
              {searchTerm || statusFilter !== "all" ? "No Matching Inspections" : "No Inspections Found"}
            </h3>
            <p className="text-slate-500 mb-4 max-w-md mx-auto">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your search terms or filters."
                : "Get started by scheduling your first property inspection."}
            </p>
            {!searchTerm && statusFilter === "all" && (
              <Button
                onClick={() => navigate(createPageUrl("InspectionForm"))}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Schedule First Inspection
              </Button>
            )}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
