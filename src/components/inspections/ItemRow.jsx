
import React from "react";
import PhotoUpload from "./PhotoUpload";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { GRADE_OPTIONS, normalizeGrade, statusFromGrade, inferGradeFromItem } from "@/lib/grading";

function ItemRow({ item, onUpdate, onRemove }) {
  const handleUpdate = (field, value) => {
    onUpdate({ ...item, [field]: value });
  };

  // Selecting a condition grade writes both the explicit grade and the legacy
  // status (Pass/Fail/N/A) so older data consumers keep working.
  const handleGradeChange = (value) => {
    if (value === 'N/A') {
      onUpdate({ ...item, grade: null, status: 'N/A' });
    } else {
      onUpdate({ ...item, grade: value, status: statusFromGrade(value) });
    }
  };

  // Legacy items have only Pass/Fail — show the same grade the report would
  // infer for them so form and printed report agree.
  const displayGrade = normalizeGrade(item.grade) || inferGradeFromItem(item) || 'N/A';

  const gradeClasses = {
    'A': 'bg-status-success-bg text-status-success-foreground border-status-success/30',
    'B': 'bg-status-success-bg text-status-success-foreground border-status-success/30',
    'C': 'bg-status-warning-bg text-status-warning-foreground border-status-warning/30',
    'D': 'bg-status-danger-bg text-status-danger-foreground border-status-danger/30',
    'E': 'bg-status-danger-bg text-status-danger-foreground border-status-danger/30',
    'N/A': 'bg-muted text-muted-foreground border-border',
  };

  return (
    <div className="bg-accent/50 p-4 rounded-lg border space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold text-foreground">{item.point}</p>
          <p className="text-sm text-muted-foreground">{item.category}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label="Remove item" className="text-destructive hover:bg-destructive/10">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Condition Grade</label>
          <Select value={displayGrade} onValueChange={handleGradeChange}>
            <SelectTrigger className={`w-full ${gradeClasses[displayGrade]}`}>
              <SelectValue placeholder="Select condition" />
            </SelectTrigger>
            <SelectContent>
              {GRADE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
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
