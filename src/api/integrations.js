import { supabase } from '@/lib/supabase';

// Check if we're in demo mode
const isDemoMode = !import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL.includes('your-project');

// Convert file to base64 data URL (for demo mode)
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// File upload - uses base64 in demo mode, Supabase Storage in production
export async function UploadFile({ file, bucket = 'uploads' }) {
  // Demo mode: convert to base64 data URL
  if (isDemoMode) {
    const dataUrl = await fileToDataUrl(file);
    console.log('Demo mode: Image stored as base64');
    return { file_url: dataUrl };
  }

  // Production mode: use Supabase Storage
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);

  if (uploadError) {
    console.error('Upload failed:', uploadError.message);
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return { file_url: publicUrl };
}

// Send email using Supabase Edge Function
export async function SendEmail({ to, subject, body, html }) {
  if (isDemoMode) {
    console.log('Demo mode: Email would be sent to', to);
    return { success: true };
  }

  const { error } = await supabase.functions.invoke('send-email', {
    body: { to, subject, body, html },
  });

  if (error) {
    console.error('Email failed:', error.message);
    throw new Error(`Email failed: ${error.message}`);
  }

  return { success: true };
}

// Send SMS using Supabase Edge Function
export async function SendSMS({ to, message }) {
  if (isDemoMode) {
    console.log('Demo mode: SMS would be sent to', to);
    return { success: true };
  }

  const { error } = await supabase.functions.invoke('send-sms', {
    body: { to, message },
  });

  if (error) {
    console.error('SMS failed:', error.message);
    throw new Error(`SMS failed: ${error.message}`);
  }

  return { success: true };
}

// Invoke LLM using Supabase Edge Function
export async function InvokeLLM({ prompt, model = 'gpt-4' }) {
  if (isDemoMode) {
    console.log('Demo mode: LLM invocation simulated');
    return { response: 'This is a demo response. Connect to Supabase for real LLM responses.' };
  }

  const { data, error } = await supabase.functions.invoke('invoke-llm', {
    body: { prompt, model },
  });

  if (error) {
    console.error('LLM invocation failed:', error.message);
    throw new Error(`LLM invocation failed: ${error.message}`);
  }

  return data;
}

// Generate image using Supabase Edge Function
export async function GenerateImage({ prompt }) {
  if (isDemoMode) {
    console.log('Demo mode: Image generation simulated');
    return { image_url: 'https://via.placeholder.com/512' };
  }

  const { data, error } = await supabase.functions.invoke('generate-image', {
    body: { prompt },
  });

  if (error) {
    console.error('Image generation failed:', error.message);
    throw new Error(`Image generation failed: ${error.message}`);
  }

  return data;
}

// Extract data from uploaded file
export async function ExtractDataFromUploadedFile({ file_url, extraction_type }) {
  if (isDemoMode) {
    console.log('Demo mode: Data extraction simulated');
    return { extracted: true, data: {} };
  }

  const { data, error } = await supabase.functions.invoke('extract-data', {
    body: { file_url, extraction_type },
  });

  if (error) {
    console.error('Data extraction failed:', error.message);
    throw new Error(`Data extraction failed: ${error.message}`);
  }

  return data;
}

// Core integrations object for backwards compatibility
export const Core = {
  UploadFile,
  SendEmail,
  SendSMS,
  InvokeLLM,
  GenerateImage,
  ExtractDataFromUploadedFile,
};
