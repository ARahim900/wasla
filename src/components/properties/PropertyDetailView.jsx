import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Home, User, MapPin, Calendar, Edit, ClipboardList, 
  FileText, Building2, ExternalLink 
} from "lucide-react";
import { Inspection, Client } from "@/api/entities";
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

export default function PropertyDetailView({ property, onEdit }) {
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPropertyData = async () => {
      if (!property?.id) return;
      
      setIsLoading(true);
      try {
        // Load client information
        if (property.client_id) {
          const clientData = await Client.filter({ id: property.client_id });
          setClient(clientData?.[0] || null);
        }

        // Load inspections for this property
        const propertyInspections = await Inspection.filter({ property_id: property.id });
        setInspections(propertyInspections || []);
      } catch (error) {
        console.error('Error loading property data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPropertyData();
  }, [property?.id, property?.client_id]);

  if (!property) {
    return <div className="text-center py-8 text-slate-500">No property selected</div>;
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
            <Home className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 capitalize">
              {property.property_type}
            </h2>
            <p className="text-slate-600 mt-1">{property.address}</p>
          </div>
        </div>
        <Button onClick={onEdit} variant="outline" size="sm">
          <Edit className="w-4 h-4 mr-2" />
          Edit Property
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Property Details</TabsTrigger>
          <TabsTrigger value="inspections">
            Inspection History ({inspections.length})
          </TabsTrigger>
        </TabsList>

        {/* Property Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Property Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                <InfoRow icon={MapPin} label="Address" value={property.address} />
                <InfoRow 
                  icon={Building2} 
                  label="Property Type" 
                  value={property.property_type?.charAt(0).toUpperCase() + property.property_type?.slice(1)} 
                />
                {property.square_footage && (
                  <InfoRow 
                    icon={Home} 
                    label="Square Footage" 
                    value={`${property.square_footage} sq ft`} 
                  />
                )}
                {property.year_built && (
                  <InfoRow 
                    icon={Calendar} 
                    label="Year Built" 
                    value={property.year_built} 
                  />
                )}
                {property.bedrooms && (
                  <InfoRow 
                    icon={Home} 
                    label="Bedrooms" 
                    value={property.bedrooms} 
                  />
                )}
                {property.bathrooms && (
                  <InfoRow 
                    icon={Home} 
                    label="Bathrooms" 
                    value={property.bathrooms} 
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Client Information */}
          {client && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Property Owner
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{client.name}</p>
                    {client.email && (
                      <p className="text-sm text-slate-600">{client.email}</p>
                    )}
                    {client.phone && (
                      <p className="text-sm text-slate-600">{client.phone}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(createPageUrl('Clients'))}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {property.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 whitespace-pre-wrap">{property.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Inspection Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <ClipboardList className="w-8 h-8 mx-auto text-primary mb-2" />
                <p className="text-3xl font-bold text-slate-900">{inspections.length}</p>
                <p className="text-sm text-slate-600">Total Inspections</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inspection History Tab */}
        <TabsContent value="inspections" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Loading inspection history...</div>
          ) : sortedInspections.length > 0 ? (
            sortedInspections.map((inspection) => (
              <Card key={inspection.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <ClipboardList className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-slate-900 capitalize">
                          {inspection.inspection_type?.replace(/_/g, ' ')} Inspection
                        </h3>
                        <StatusBadge status={inspection.status} />
                      </div>
                      <div className="space-y-1 text-sm">
                        {inspection.inspection_date && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Calendar className="w-4 h-4" />
                            <span>{format(new Date(inspection.inspection_date), 'MMMM d, yyyy')}</span>
                          </div>
                        )}
                        {inspection.inspector_name && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <User className="w-4 h-4" />
                            <span>Inspector: {inspection.inspector_name}</span>
                          </div>
                        )}
                        {inspection.client_name && (
                          <p className="text-slate-500">Client: {inspection.client_name}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(createPageUrl(`InspectionForm?id=${inspection.id}`))}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardList className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-600 mb-1">No inspections recorded for this property</p>
                <p className="text-sm text-slate-500 mb-4">
                  Schedule an inspection to start tracking property condition
                </p>
                <Button
                  variant="outline"
                  size="sm"
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