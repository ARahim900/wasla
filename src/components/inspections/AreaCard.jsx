
import React, { useState } from "react";
import ItemRow from "./ItemRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const INSPECTION_CATEGORIES = {
    "Structural & Interior": [
        "Hairline Cracks", "Ceilings", "Walls", "Floors", "Doors & Locks",
        "Wardrobes & Cabinets Functionality", "Switch Logic & Placement",
        "Stoppers & Door Closers", "Window Lock & Roller Mechanism", "Curtain Box Provision"
    ],
    "Safety / Utility": [
        "Access Panel for AC Maintenance", "Water Heater Installation Check",
        "Water Pump Operational Test", "Fire Alarm/Smoke Detector Test"
    ],
    "Plumbing System": [
        "Water Pressure & Flow", "Pipes & Fittings", "Sinks, Showers, Toilets",
        "Hot Water System", "Water Tank Status (Cleaning)", "Under-Sink Leaks",
        "Drainage Flow Speed", "Toilet Flushing Pressure", "Drain Ventilation (Gurgling Sounds)"
    ],
    "Moisture & Thermal": ["Signs of Damp or Mold", "Thermal Imaging"],
    "Kitchen Inspection": [
        "Cabinet Quality & Alignment", "Countertops & Backsplash",
        "Sink & Mixer Tap Functionality", "Kitchen Appliances"
    ],
    "HVAC System": ["AC Units", "Ventilation Fans", "Thermostat Functionality"],
    "Fire & Safety": ["Smoke Detectors", "Fire Extinguishers"],
    "Finishing & Aesthetics": ["Paint Finish", "Joinery (wardrobes, cabinets)", "Flooring Condition"],
    "External Inspection": ["Roof Condition", "Walls & Paint", "Drainage", "Windows & Doors"],
    "External Area": [
        "Balcony Drainage Test", "Tiling Level & Grouting",
        "Lighting in Outdoor Areas", "External Tap Functionality"
    ],
    "Electrical System": [
        "Main Distribution Board (DB)", "Sockets & Switches", "Lighting Fixtures",
        "Grounding & Earthing", "DB Labeling", "All Light Points Working",
        "All Power Outlets Tested", "AC Drainage Check", "Isolators for AC & Heater",
        "Telephone/Internet Outlet Presence", "Bell/Intercom Functionality"
    ],
    "Bathroom Inspection": [
        "Tiling & Grouting", "Waterproofing Issues", "Toilet Flushing",
        "Water Pressure", "Toilets/Wet Areas Floor Slope", "Exhaust Fan Working",
        "Glass Shower Partition Sealing"
    ]
};

export default function AreaCard({ area, onUpdate, onRemove }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleNameChange = (newName) => {
    onUpdate({ ...area, name: newName });
  };

  const handleAddItem = (category, point) => {
    const newItem = {
      id: crypto.randomUUID(),
      category,
      point,
      status: 'N/A',
      comments: '',
      location: '',
      photos: [],
    };
    onUpdate({ ...area, items: [...area.items, newItem] });
  };

  const handleUpdateItem = (updatedItem) => {
    const newItems = area.items.map(item => item.id === updatedItem.id ? updatedItem : item);
    onUpdate({ ...area, items: newItems });
  };

  const handleRemoveItem = (itemId) => {
    const newItems = area.items.filter(item => item.id !== itemId);
    onUpdate({ ...area, items: newItems });
  };

  return (
    <div className="bg-card rounded-lg p-4 mb-6 border">
      <div className="flex justify-between items-center mb-4">
        <Input
          type="text"
          value={area.name}
          onChange={e => handleNameChange(e.target.value)}
          className="text-xl font-bold bg-transparent focus:border-b-2 focus:border-primary outline-none text-foreground"
          placeholder="Area Name"
        />
        <Button type="button" variant="ghost" onClick={onRemove} className="text-red-500 hover:text-red-700">
          <Trash2 className="w-5 h-5" />
          Remove Area
        </Button>
      </div>
      
      <div className="space-y-4">
        {(area.items || []).map(item => <ItemRow key={item.id} item={item} onUpdate={handleUpdateItem} onRemove={() => handleRemoveItem(item.id)} />)}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogTrigger asChild>
          <Button type="button" className="mt-4 w-full">
            <Plus className="mr-2 h-4 w-4" /> Add Inspection Point
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Inspection Point to {area.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {Object.entries(INSPECTION_CATEGORIES).map(([category, points]) => (
              <div key={category}>
                <h4 className="font-semibold text-lg text-slate-700 mb-2 border-b pb-1">{category}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {points.map(point => (
                    <button
                      type="button"
                      key={point}
                      onClick={() => { handleAddItem(category, point); setIsModalOpen(false); }}
                      className="text-left p-2 bg-muted hover:bg-primary/10 rounded-md text-sm transition text-foreground"
                    >
                      {point}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
