import React, { useState, useEffect, useMemo } from "react";
import { Client, Property } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, Mail, Phone, MapPin, Eye, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ClientForm from "../components/forms/ClientForm";
import ClientDetailView from "../components/clients/ClientDetailView";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [properties, setProperties] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingClient, setDeletingClient] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [clientData, propertyData] = await Promise.all([
        Client.list().catch((err) => {
          console.error("Error loading clients:", err);
          return [];
        }),
        Property.list().catch((err) => {
          console.error("Error loading properties:", err);
          return [];
        })
      ]);

      setClients(clientData || []);
      setProperties(propertyData || []);
    } catch (error) {
      console.error("Error loading client data:", error);
      toast.error("Could not load client information.");
      setClients([]);
      setProperties([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const propertyCounts = useMemo(() => {
    return clients.reduce((acc, client) => {
      acc[client.id] = properties.filter((prop) => prop.client_id === client.id).length;
      return acc;
    }, {});
  }, [clients, properties]);

  const filteredClients = useMemo(() =>
    clients.filter((client) =>
      client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase()))
    ), [clients, searchTerm]);

  const handleAddNew = () => {
    setEditingClient(null);
    setIsFormOpen(true);
  };

  const handleView = (client) => {
    setSelectedClient(client);
    setIsDetailOpen(true);
  };

  const handleEditFromDetail = () => {
    setEditingClient(selectedClient);
    setIsDetailOpen(false);
    setIsFormOpen(true);
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingClient(null);
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setSelectedClient(null);
  };

  const handleSubmit = async (clientData) => {
    setIsSaving(true);
    try {
      if (editingClient) {
        await Client.update(editingClient.id, clientData);
        toast.success("Client updated successfully.");
      } else {
        await Client.create(clientData);
        toast.success("Client created successfully.");
      }
      await loadData();
      closeForm();
      
      // Refresh detail view if it's open
      if (selectedClient && editingClient?.id === selectedClient.id) {
        const updated = await Client.filter({ id: selectedClient.id });
        setSelectedClient(updated[0]);
      }
    } catch (error) {
      console.error("Error saving client:", error);
      toast.error("Failed to save client.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingClient) return;
    try {
      await Client.delete(deletingClient.id);
      toast.success("Client deleted successfully.");
      
      // Close detail view if deleting the viewed client
      if (selectedClient?.id === deletingClient.id) {
        closeDetail();
      }
      
      await loadData();
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error("Failed to delete client.");
    } finally {
      setDeletingClient(null);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Clients</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Manage your client database and their properties.</p>
        </div>
        <Button onClick={handleAddNew} className="w-full md:w-auto min-h-[44px]">
          <Plus className="w-4 h-4 me-2" />
          Add New Client
        </Button>
      </div>

      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search clients..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="ps-10" />
      </div>

      <div className="grid gap-4 md:gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Card key={i} className="animate-pulse h-48 bg-muted" />)
        ) : (
          <AnimatePresence>
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <motion.div key={client.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}>
                  <Card className="transition-colors overflow-hidden rounded-xl">
                    <CardHeader className="p-4 flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent text-muted-foreground flex-shrink-0">
                            <Users className="w-5 h-5" />
                          </span>
                          <CardTitle className="text-foreground text-base truncate">{client.name}</CardTitle>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-2 ms-11">
                          {client.company && <Badge variant="secondary">{client.company}</Badge>}
                          <Badge variant="outline">Properties: {propertyCounts[client.id] || 0}</Badge>
                        </div>
                      </div>

                      <div className="flex gap-1 self-end sm:self-start flex-shrink-0">
                        <Button variant="outline" size="sm" onClick={() => handleView(client)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeletingClient(client)} className="text-red-500 hover:text-red-500/80 w-8 h-8">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-0 space-y-2">
                      <div className="grid grid-cols-1 gap-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                          <Mail className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{client.email || 'No email'}</span>
                        </div>
                        {client.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                            <Phone className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{client.phone}</span>
                          </div>
                        )}
                        {client.address && (
                          <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{client.address}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-16">
                <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-medium text-foreground mb-2">No clients found</h3>
                <p className="text-muted-foreground mb-4">{searchTerm ? "Try adjusting your search terms." : "Get started by adding your first client."}</p>
                {!searchTerm && <Button onClick={handleAddNew} className="min-h-[44px]"><Plus className="w-4 h-4 me-2" />Add First Client</Button>}
              </div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Detail View Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <ClientDetailView client={selectedClient} onEdit={handleEditFromDetail} />
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onCloseAutoFocus={() => setEditingClient(null)}>
          <ClientForm client={editingClient} onSubmit={handleSubmit} onCancel={closeForm} isLoading={isSaving} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingClient} onOpenChange={() => setDeletingClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete {deletingClient?.name}? This action cannot be undone.</AlertDialogDescription>
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