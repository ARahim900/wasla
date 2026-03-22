
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Phone, MapPin, Building2, FileText } from "lucide-react";

// Sub-component to reduce repetition in the form
const FormField = ({ id, label, icon: Icon, value, onChange, required, type = "text", placeholder }) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-slate-700 font-medium">
      {label} {required && '*'}
    </Label>
    <div className="relative">
      <Icon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
      <Input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        className="pl-10"
        placeholder={placeholder}
        required={required}
      />
    </div>
  </div>
);

// Define initialClientState outside the component to ensure it's a stable reference
// and does not cause unnecessary re-renders or React Hook dependency warnings
const initialClientState = {
  name: "", email: "", phone: "", address: "", company: "", notes: ""
};

export default function ClientForm({ client, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState(client || initialClientState);

  // Effect to update form if the client prop changes
  // The 'client' prop is correctly identified as a dependency.
  // 'initialClientState' is a stable, module-scoped constant, so it does not
  // need to be included in the dependency array.
  useEffect(() => {
    setFormData(client || initialClientState);
  }, [client]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <User className="w-5 h-5" />
          {client ? 'Edit Client' : 'Add New Client'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <FormField id="name" label="Full Name" icon={User} value={formData.name} onChange={handleChange} placeholder="Enter client's full name" required />
            <FormField id="email" label="Email Address" icon={Mail} type="email" value={formData.email} onChange={handleChange} placeholder="client@example.com" required />
            <FormField id="phone" label="Phone Number" icon={Phone} value={formData.phone} onChange={handleChange} placeholder="+1 (555) 123-4567" />
            <FormField id="company" label="Company" icon={Building2} value={formData.company} onChange={handleChange} placeholder="Company name" />
          </div>
          <FormField id="address" label="Address" icon={MapPin} value={formData.address} onChange={handleChange} placeholder="123 Main St, City, State 12345" />

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-slate-700 font-medium">Notes</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} className="pl-10 min-h-[100px]" placeholder="Additional notes about the client..." />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
              {isLoading ? "Saving..." : (client ? "Update Client" : "Create Client")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
