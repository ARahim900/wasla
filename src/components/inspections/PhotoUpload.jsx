import React, { useState, useRef } from 'react';
import { UploadFile, DeleteFile } from '@/api/integrations';
import { UploadCloud, X, Loader2, Camera } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB (matches Supabase bucket limit)
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export default function PhotoUpload({ photos, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadedPhotos = [];
    let failCount = 0;
    let skippedSize = 0;
    let skippedType = 0;

    for (const file of Array.from(files)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        skippedType++;
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        skippedSize++;
        continue;
      }
      try {
        const { file_url } = await UploadFile({ file, bucket: 'inspection-photos' });
        uploadedPhotos.push({ url: file_url, name: file.name });
      } catch (error) {
        failCount++;
        console.error('Error uploading file:', error);
      }
    }

    if (uploadedPhotos.length > 0) {
      onUpdate([...photos, ...uploadedPhotos]);
    }
    if (skippedType > 0) {
      toast.error(`${skippedType} file${skippedType > 1 ? 's' : ''} skipped: only JPEG, PNG, GIF, and WebP are allowed.`);
    }
    if (skippedSize > 0) {
      toast.error(`${skippedSize} file${skippedSize > 1 ? 's' : ''} skipped: max size is 10 MB.`);
    }
    if (failCount > 0) {
      toast.error(`Failed to upload ${failCount} photo${failCount > 1 ? 's' : ''}. Please try again.`);
    }
    setUploading(false);
  };

  const handleFileChange = async (event) => {
    await handleFileUpload(event.target.files);
  };

  const handleRemove = (index) => {
    const removed = photos[index];
    const newPhotos = photos.filter((_, i) => i !== index);
    onUpdate(newPhotos);
    // Delete file from storage in background
    if (removed?.url) {
      DeleteFile({ url: removed.url }).catch(() => {});
    }
  };

  const handleUploadFromDevice = () => {
    fileInputRef.current?.click();
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-2">
        {photos.map((photo, index) => (
          <div key={index} className="relative group aspect-square">
            <img
              src={photo.url}
              alt={photo.name}
              className="w-full h-full object-cover rounded-md"
            />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute top-1 right-1 bg-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-700"
              aria-label="Remove photo"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md" />
          </div>
        ))}

        {/* Add Photo Button with Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="w-full aspect-square border-2 border-dashed border-slate-300 rounded-md flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 hover:border-emerald-500 hover:text-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-xs mt-1">Uploading...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-8 h-8" />
                  <span className="text-xs mt-1">Add Photo</span>
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={handleCameraCapture}
              className="cursor-pointer"
            >
              <Camera className="w-4 h-4 mr-2" />
              <span>Take Photo</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleUploadFromDevice}
              className="cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 mr-2" />
              <span>Upload from Device</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
        accept="image/jpeg,image/png,image/gif,image/webp"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/jpeg,image/png,image/gif,image/webp"
        capture="environment"
      />
    </div>
  );
}
