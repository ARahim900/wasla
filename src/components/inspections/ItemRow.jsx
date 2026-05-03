
import React from "react";
import PhotoUpload from "./PhotoUpload";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

function ItemRow({ item, onUpdate, onRemove }) {
  const handleUpdate = (field, value) => {
    onUpdate({ ...item, [field]: value });
  };

  const statusClasses = {
    'Pass': 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
    'Fail': 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
    'N/A': 'bg-muted text-muted-foreground border-border',
  };

  return (
    <div className="bg-accent/50 p-4 rounded-lg border space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold text-foreground">{item.point}</p>
          <p className="text-sm text-muted-foreground">{item.category}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label="Remove item" className="text-red-500 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-950/40">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Status</label>
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
          <label className="block text-sm font-medium text-foreground mb-1">Location</label>
          <Input 
            value={item.location || ''} 
            onChange={e => handleUpdate('location', e.target.value)} 
            placeholder="e.g., Master Bedroom Ceiling" 
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Comments</label>
        <Textarea 
          value={item.comments || ''} 
          onChange={e => handleUpdate('comments', e.target.value)} 
          placeholder="Add comments..." 
          rows={3}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Photos</label>
        <PhotoUpload
          photos={item.photos || []}
          onUpdate={(photos) => handleUpdate('photos', photos)}
        />
        {item.status === 'Fail' && item.photos?.length > 0 && (
          <div className="mt-2">
            <Button type="button" disabled>AI Analyze Last Photo</Button>
            <p className="text-xs text-muted-foreground italic ml-2">AI analysis coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(ItemRow);
