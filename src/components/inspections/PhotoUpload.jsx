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

// Common phone/desktop screenshot resolutions
const SCREENSHOT_DIMS = new Set([
  '1170x2532', '1179x2556', '1284x2778', '1290x2796',
  '1080x1920', '1080x2340', '1080x2400', '1440x3120',
  '390x844', '414x896', '375x812', '393x852',
  '1920x1080', '2560x1440', '2880x1800', '1440x900', '3024x1964',
]);

const looksLikeScreenshot = (file) =>
  new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const key = `${w}x${h}`;
      const keySwapped = `${h}x${w}`;
      const ratio = w / h;
      const suspicious =
        SCREENSHOT_DIMS.has(key) ||
        SCREENSHOT_DIMS.has(keySwapped) ||
        ratio > 2.4 ||
        ratio < 0.42 ||
        (w < 400 && h < 400);
      resolve(suspicious);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };
    img.src = url;
  });

const compressImage = async (file) => {
  if (file.size < 500 * 1024) return file; // Skip if already small

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX_DIM = 2048;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          const compressed = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
          resolve(compressed.size < file.size ? compressed : file);
        },
        'image/jpeg',
        0.8
      );
    };
    img.onerror = () => resolve(file); // Fallback to original on error
    img.src = URL.createObjectURL(file);
  });
};

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
    let suspiciousCount = 0;

    // Filter into a queue first so the size/type counts are accurate before
    // we start uploading. Then process in batches of 3 — sequential uploads
    // on mobile take ~10s for 5 photos and freeze the UI; concurrency 3 keeps
    // peak memory bounded but cuts wall time meaningfully.
    const queue = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) { skippedType++; continue; }
      if (file.size > MAX_FILE_SIZE) { skippedSize++; continue; }
      queue.push(file);
    }

    const processOne = async (originalFile) => {
      if (await looksLikeScreenshot(originalFile)) suspiciousCount++;
      const compressed = await compressImage(originalFile);
      const { file_url } = await UploadFile({ file: compressed, bucket: 'inspection-photos' });
      return { url: file_url, name: compressed.name };
    };

    const CONCURRENCY = 3;
    for (let i = 0; i < queue.length; i += CONCURRENCY) {
      const batch = queue.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(batch.map(processOne));
      results.forEach((r) => {
        if (r.status === 'fulfilled') {
          uploadedPhotos.push(r.value);
        } else {
          failCount++;
          console.error('Error uploading file:', r.reason);
        }
      });
    }

    if (uploadedPhotos.length > 0) {
      onUpdate([...photos, ...uploadedPhotos]);
    }
    if (skippedType > 0) {
      toast.error(`${skippedType} file${skippedType > 1 ? 's' : ''} skipped: only image files are allowed.`);
    }
    if (skippedSize > 0) {
      toast.error(`${skippedSize} file${skippedSize > 1 ? 's' : ''} skipped: max size is 10 MB.`);
    }
    if (failCount > 0) {
      toast.error(`Failed to upload ${failCount} photo${failCount > 1 ? 's' : ''}. Please try again.`);
    }
    if (suspiciousCount > 0) {
      toast.warning(
        suspiciousCount > 1
          ? `${suspiciousCount} images look like screenshots or graphics — make sure they are inspection photos.`
          : 'This image looks like a screenshot or graphic — make sure it is an inspection photo.'
      );
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
              loading="lazy"
              className="w-full h-full object-cover rounded-md"
            />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-8 w-8 flex items-center justify-center text-xs opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10 hover:bg-destructive/90"
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
              className="w-full aspect-square border-2 border-dashed border-muted-foreground/30 rounded-md flex flex-col items-center justify-center text-muted-foreground hover:bg-muted hover:border-primary hover:text-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
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
        accept="image/*"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        capture="environment"
      />
    </div>
  );
}
