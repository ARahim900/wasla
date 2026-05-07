import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  User, Mail, Phone, MapPin, Building2, FileText, 
  ClipboardList, Home, Calendar, Edit, ExternalLink 
} from "lucide-react";
import { Inspection, Property } from "@/api/entities";
import { getInspectionStatusColor } from "@/lib/status";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-3 border-b last:border-0">
    <Icon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-base text-foreground mt-0.5 break-words">{value || 'N/A'}</p>
    </div>
  </div>
);

const StatusBadge = ({ status }) => (
  <Badge className={`${getInspectionStatusColor(status)} capitalize text-xs`}>
    {status?.replace('_', ' ') || 'scheduled'}
  </Badge>
);

export default function ClientDetailView({ client, onEdit }) {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const propertyAddressFor = (inspection) => {
    if (inspection.property_address) return inspection.property_address;
    const linked = properties.find(p => p.id === inspection.property_id);
    return linked?.address || 'Location not specified';
  };

  useEffect(() => {
    const loadClientData = async () => {
      if (!client?.id) return;
      
      setIsLoading(true);
      try {
        // Load properties for this client
        const clientProperties = await Property.filter({ client_id: client.id });
        setProperties(clientProperties || []);

        // Load inspections for this client
        const clientInspections = await Inspection.filter({ client_id: client.id });
        setInspections(clientInspections || []);
      } catch (error) {
        console.error('Error loading client data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadClientData();
  }, [client?.id]);

  if (!client) {
    return <div className="text-center py-8 text-muted-foreground">No client selected</div>;
  }

  const sortedInspections = [...inspections].sort((a, b) => 
    new Date(b.inspection_date || b.created_at) - new Date(a.inspection_date || a.created_at)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">{client.name}</h2>
            {client.company && (
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <Building2 className="w-4 h-4" />
                {client.company}
              </p>
            )}
          </div>
        </div>
        <Button onClick={onEdit} variant="outline" size="sm">
          <Edit className="w-4 h-4 mr-2" />
          Edit Client
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Contact Details</TabsTrigger>
          <TabsTrigger value="properties">
            Properties ({properties.length})
          </TabsTrigger>
          <TabsTrigger value="inspections">
            Inspections ({inspections.length})
          </TabsTrigger>
        </TabsList>

        {/* Contact Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                <InfoRow icon={Mail} label="Email Address" value={client.email} />
                <InfoRow icon={Phone} label="Phone Number" value={client.phone} />
                <InfoRow icon={MapPin} label="Address" value={client.address} />
                <InfoRow icon={Building2} label="Company" value={client.company} />
              </div>
            </CardContent>
          </Card>

          {client.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{client.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Summary Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Home className="w-8 h-8 mx-auto text-primary mb-2" />
                  <p className="text-3xl font-bold text-foreground">{properties.length}</p>
                  <p className="text-sm text-muted-foreground">Properties</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <ClipboardList className="w-8 h-8 mx-auto text-primary mb-2" />
                  <p className="text-3xl font-bold text-foreground">{inspections.length}</p>
                  <p className="text-sm text-muted-foreground">Inspections</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Properties Tab */}
        <TabsContent value="properties" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading properties...</div>
          ) : properties.length > 0 ? (
            properties.map((property) => (
              <Card key={property.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Home className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-foreground capitalize">
                          {property.property_type}
                        </h3>
                      </div>
                      <p className="text-foreground mb-2">{property.address}</p>
                      {property.notes && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{property.notes}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(createPageUrl('Properties'))}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Home className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No properties found for this client</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate(createPageUrl('Properties'))}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Add Property
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Inspections Tab */}
        <TabsContent value="inspections" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading inspections...</div>
          ) : sortedInspections.length > 0 ? (
            sortedInspections.map((inspection) => (
              <Card key={inspection.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <ClipboardList className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-foreground capitalize">
                          {inspection.inspection_type?.replace(/_/g, ' ')} Inspection
                        </h3>
                        <StatusBadge status={inspection.status} />
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {inspection.inspection_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{format(new Date(inspection.inspection_date), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                        {inspection.property_type && (
                          <p className="text-muted-foreground">
                            Property: {inspection.property_type} • {propertyAddressFor(inspection)}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(createPageUrl(`InspectionForm?id=${inspection.id}`))}
                    >
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No inspections found for this client</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate(createPageUrl('InspectionForm'))}
                >
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Schedule Inspection
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}