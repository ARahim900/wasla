import React, { useState, useEffect, useMemo } from "react";
import { Property, Client } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Home, User, Edit2, Trash2, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PropertyForm from "../components/forms/PropertyForm";
import PropertyDetailView from "../components/properties/PropertyDetailView";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function Properties() {
  const [properties, setProperties] = useState([]);
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [editingProperty, setEditingProperty] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingProperty, setDeletingProperty] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [propertyResult, clientResult] = await Promise.all([
        Property.list().catch(err => {
          console.error("Property.list() failed:", err);
          return [];
        }),
        Client.list().catch(err => {
          console.error("Client.list() failed:", err);
          return [];
        })
      ]);
      
      setProperties(Array.isArray(propertyResult) ? propertyResult : []);
      setClients(Array.isArray(clientResult) ? clientResult : []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error(`Failed to load data: ${error.message}`);
      setProperties([]);
      setClients([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadData();
  }, []);

  const clientsMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

  const filteredProperties = useMemo(() =>
    properties.filter(property =>
      property.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientsMap.get(property.client_id)?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [properties, searchTerm, clientsMap]);

  const handleAddNew = () => {
    setEditingProperty(null);
    setIsFormOpen(true);
  };
  
  const handleView = (property) => {
    setSelectedProperty(property);
    setIsDetailOpen(true);
  };

  const handleEditFromDetail = () => {
    setEditingProperty(selectedProperty);
    setIsDetailOpen(false);
    setIsFormOpen(true);
  };

  const handleEdit = (property) => {
    setEditingProperty(property);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingProperty(null);
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setSelectedProperty(null);
  };

  const handleSubmit = async (propertyData) => {
    setIsSaving(true);
    try {
      if (editingProperty) {
        await Property.update(editingProperty.id, propertyData);
        toast.success("Property updated successfully.");
      } else {
        await Property.create(propertyData);
        toast.success("Property created successfully.");
      }
      await loadData();
      closeForm();
      
      // Refresh detail view if it's open
      if (selectedProperty && editingProperty?.id === selectedProperty.id) {
        const updated = await Property.filter({ id: selectedProperty.id });
        setSelectedProperty(updated[0]);
      }
    } catch (error) {
      console.error("Error saving property:", error);
      toast.error(`Failed to save property: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProperty) return;
    try {
      await Property.delete(deletingProperty.id);
      toast.success("Property deleted successfully.");
      
      // Close detail view if deleting the viewed property
      if (selectedProperty?.id === deletingProperty.id) {
        closeDetail();
      }
      
      await loadData();
    } catch (error) {
      console.error("Error deleting property:", error);
      toast.error(`Failed to delete property: ${error.message}`);
    } finally {
      setDeletingProperty(null);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 tracking-tight">Properties</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage all client properties and inspection history.</p>
        </div>
        <Button onClick={handleAddNew} className="w-full md:w-auto min-h-[44px]">
          <Plus className="w-4 h-4 me-2" />
          Add New Property
        </Button>
      </div>

      <div className="relative w-full sm:max-w-md">
        <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by address or client..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="ps-10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-0 p-4">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2 mt-1"></div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))
        ) : (
          <AnimatePresence>
            {filteredProperties.length > 0 ? (
              filteredProperties.map((property) => (
                <motion.div key={property.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <Card className="h-full transition-colors overflow-hidden">
                    <CardHeader className="p-4 pb-3 flex flex-row justify-between items-start space-y-0">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-foreground flex items-center gap-2 text-base">
                          <Home className="w-5 h-5 text-primary flex-shrink-0" />
                          <span className="capitalize truncate">{property.property_type}</span>
                        </CardTitle>
                        <p className="text-xs md:text-sm text-muted-foreground mt-1 line-clamp-2">{property.address}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0 ms-2">
                        <Button variant="ghost" size="icon" onClick={() => handleView(property)} className="h-8 w-8">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(property)} className="h-8 w-8">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeletingProperty(property)} className="text-red-500 hover:text-red-700 h-8 w-8">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="flex items-center gap-2 text-xs md:text-sm text-foreground min-w-0">
                        <User className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{clientsMap.get(property.client_id) || "Unassigned"}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-16 col-span-full">
                <Home className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground">No properties found</h3>
                <p className="text-muted-foreground mb-4">{searchTerm ? "Try adjusting your search." : "Get started by adding your first property."}</p>
                {!searchTerm && <Button onClick={handleAddNew} className="min-h-[44px]"><Plus className="w-4 h-4 me-2" />Add First Property</Button>}
              </div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Detail View Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <PropertyDetailView property={selectedProperty} onEdit={handleEditFromDetail} />
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl" onCloseAutoFocus={() => setEditingProperty(null)}>
          <PropertyForm property={editingProperty} onSubmit={handleSubmit} onCancel={closeForm} isLoading={isSaving} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingProperty} onOpenChange={() => setDeletingProperty(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this property? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}