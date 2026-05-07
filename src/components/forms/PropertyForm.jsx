
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
  address: "", client_id: "", property_type: "villa", area_sqm: "", notes: ""
};

export default function PropertyForm({ property, onSubmit, onCancel, isLoading }) {
  const [clients, setClients] = useState([]);

  const [formData, setFormData] = useState(property || initialPropertyState);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const next = {};
    // client_id is optional — the schema column is nullable and the
    // inspection find-or-create flow already creates properties without
    // a client. Keeping these consistent avoids "Unassigned" surprises.
    if (!formData.address?.trim()) next.address = "Address is required.";
    if (!formData.property_type) next.property_type = "Property type is required.";
    if (formData.area_sqm !== "" && formData.area_sqm !== null && formData.area_sqm !== undefined) {
      const n = Number(formData.area_sqm);
      if (!Number.isFinite(n) || n <= 0) next.area_sqm = "Enter a positive number.";
    }
    return next;
  };

  // Effect to fetch clients, runs only once on component mount
  useEffect(() => {
    Client.list().then(setClients);
  }, []);

  // Effect to update form data when the 'property' prop changes
  useEffect(() => {
    setFormData(property || initialPropertyState);
    setErrors({});
  }, [property]);

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const { [name]: _omit, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;
    const payload = {
      ...formData,
      area_sqm: formData.area_sqm === "" || formData.area_sqm == null ? null : Number(formData.area_sqm),
      client_id: formData.client_id || null,
    };
    onSubmit(payload);
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
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={e => handleChange('address', e.target.value)}
              aria-invalid={Boolean(errors.address)}
              aria-describedby={errors.address ? "address-error" : undefined}
              className={errors.address ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.address && (
              <p id="address-error" role="alert" className="text-xs text-destructive">
                {errors.address}
              </p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="client_id">Client</Label>
              <Select
                value={formData.client_id || "none"}
                onValueChange={value => handleChange('client_id', value === "none" ? "" : value)}
              >
                <SelectTrigger id="client_id">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="property_type">Property Type *</Label>
              <Select value={formData.property_type} onValueChange={value => handleChange('property_type', value)}>
                <SelectTrigger
                  id="property_type"
                  aria-invalid={Boolean(errors.property_type)}
                  aria-describedby={errors.property_type ? "property_type-error" : undefined}
                  className={errors.property_type ? "border-destructive focus-visible:ring-destructive" : ""}
                >
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="building">Building</SelectItem>
                  <SelectItem value="villa">Villa</SelectItem>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                </SelectContent>
              </Select>
              {errors.property_type && (
                <p id="property_type-error" role="alert" className="text-xs text-destructive">
                  {errors.property_type}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="area_sqm">Area (SQM)</Label>
            <Input
              id="area_sqm"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={formData.area_sqm ?? ""}
              onChange={e => handleChange('area_sqm', e.target.value)}
              placeholder="e.g. 350"
              aria-invalid={Boolean(errors.area_sqm)}
              aria-describedby={errors.area_sqm ? "area_sqm-error" : "area_sqm-help"}
              className={errors.area_sqm ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {errors.area_sqm ? (
              <p id="area_sqm-error" role="alert" className="text-xs text-destructive">{errors.area_sqm}</p>
            ) : (
              <p id="area_sqm-help" className="text-xs text-muted-foreground">Used to auto-calculate invoice pricing.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={formData.notes} onChange={e => handleChange('notes', e.target.value)} />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Property"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

