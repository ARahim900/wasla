
import React from "react";
import PhotoUpload from "./PhotoUpload";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export default function ItemRow({ item, onUpdate, onRemove }) {
  const handleUpdate = (field, value) => {
    onUpdate({ ...item, [field]: value });
  };

  const statusClasses = {
    'Pass': 'bg-green-100 text-green-800 border-green-300',
    'Fail': 'bg-red-100 text-red-800 border-red-300',
    'N/A': 'bg-gray-100 text-gray-800 border-gray-300',
  };

  return (
    <div className="bg-slate-50/50 p-4 rounded-lg border space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold text-slate-800">{item.point}</p>
          <p className="text-sm text-slate-500">{item.category}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onRemove} className="text-red-500 hover:bg-red-100">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <Select value={item.status} onValueChange={(value) => handleUpdate('status', value)}>
            <SelectTrigger className={`w-full ${statusClasses[item.status]}`}>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Pass">Pass</SelectItem>
              <SelectItem value="Fail">Fail</SelectItem>
              <SelectItem value="N/A">N/A</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
          <Input 
            value={item.location || ''} 
            onChange={e => handleUpdate('location', e.target.value)} 
            placeholder="e.g., Master Bedroom Ceiling" 
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Comments</label>
        <Textarea 
          value={item.comments || ''} 
          onChange={e => handleUpdate('comments', e.target.value)} 
          placeholder="Add comments..." 
          rows={3}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Photos</label>
        <PhotoUpload
          photos={item.photos || []}
          onUpdate={(photos) => handleUpdate('photos', photos)}
        />
        {item.status === 'Fail' && item.photos?.length > 0 && (
          <div className="mt-2">
            <Button type="button" disabled>AI Analyze Last Photo</Button>
            <p className="text-xs text-slate-500 italic ml-2">AI analysis coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
