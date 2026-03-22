
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, User, MapPin, Building2, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Client } from "@/api/entities";

const initialPropertyState = {
  address: "", client_id: "", property_type: "villa", notes: ""
};

export default function PropertyForm({ property, onSubmit, onCancel, isLoading }) {
  const [clients, setClients] = useState([]);
  
  const [formData, setFormData] = useState(property || initialPropertyState);

  // Effect to fetch clients, runs only once on component mount
  useEffect(() => {
    Client.list().then(setClients);
  }, []);

  // Effect to update form data when the 'property' prop changes
  useEffect(() => {
    setFormData(property || initialPropertyState);
  }, [property]);

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="w-5 h-5" />
          {property ? 'Edit Property' : 'Add New Property'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Input id="address" value={formData.address} onChange={e => handleChange('address', e.target.value)} required />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="client_id">Client *</Label>
              <Select value={formData.client_id} onValueChange={value => handleChange('client_id', value)} required>
                <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="property_type">Property Type *</Label>
              <Select value={formData.property_type} onValueChange={value => handleChange('property_type', value)} required>
                <SelectTrigger><SelectValue placeholder="Select property type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="building">Building</SelectItem>
                  <SelectItem value="villa">Villa</SelectItem>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={formData.notes} onChange={e => handleChange('notes', e.target.value)} />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700">
              {isLoading ? "Saving..." : "Save Property"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

