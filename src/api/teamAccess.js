import { supabase } from '@/lib/supabase';

// Team access allowlist (public.allowed_emails). Gates who may register: only
// emails on this list can create an account (enforced by a DB trigger; see
// supabase/migrations/2026_07_17_registration_allowlist.sql). Any authenticated
// teammate can view and manage the list.

const isDemoMode = !import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL.includes('your-project');

const DEMO_KEY = 'wasla_demo_allowed_emails';

function readDemo() {
  try {
    return JSON.parse(localStorage.getItem(DEMO_KEY) || '[]');
  } catch {
    return [];
  }
}
function writeDemo(rows) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(rows));
}

export async function listAllowedEmails() {
  if (isDemoMode) return readDemo();
  const { data, error } = await supabase
    .from('allowed_emails')
    .select('email, created_at')
    .order('email', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function addAllowedEmail(email) {
  const clean = (email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
    throw new Error('Please enter a valid email address.');
  }
  if (isDemoMode) {
    const rows = readDemo();
    if (!rows.some((r) => r.email === clean)) {
      rows.push({ email: clean, created_at: new Date().toISOString() });
      writeDemo(rows);
    }
    return { email: clean };
  }
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('allowed_emails')
    .upsert({ email: clean, added_by: user?.id ?? null }, { onConflict: 'email' });
  if (error) throw new Error(error.message);
  return { email: clean };
}

export async function removeAllowedEmail(email) {
  const clean = (email || '').trim().toLowerCase();
  if (isDemoMode) {
    writeDemo(readDemo().filter((r) => r.email !== clean));
    return;
  }
  const { error } = await supabase.from('allowed_emails').delete().eq('email', clean);
  if (error) throw new Error(error.message);
}
