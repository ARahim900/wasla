import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Plus, Trash2, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { listAllowedEmails, addAllowedEmail, removeAllowedEmail } from "@/api/teamAccess";

// Manage who is allowed to register (public.allowed_emails). Only emails on
// this list can create an account; the enforcement lives in a DB trigger.
export default function TeamAccessCard() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["allowedEmails"],
    queryFn: listAllowedEmails,
    retry: false,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["allowedEmails"] });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { email: added } = await addAllowedEmail(email);
      toast.success(`${added} can now register.`);
      setEmail("");
      refresh();
    } catch (err) {
      toast.error(err.message || "Could not add email.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (addr) => {
    try {
      await removeAllowedEmail(addr);
      toast.success(`${addr} removed.`);
      refresh();
    } catch (err) {
      toast.error(err.message || "Could not remove email.");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <Users className="w-4 h-4 text-primary" />
          Team Access
        </CardTitle>
        <CardDescription>
          Only people on this list can create an account. Add a teammate's email, then
          have them sign up with it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="ps-10"
              aria-label="Email to allow"
            />
          </div>
          <Button type="submit" disabled={busy || !email.trim()} className="min-h-[44px]">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 me-2" />}
            Add
          </Button>
        </form>

        {isError ? (
          <p className="text-sm text-muted-foreground">
            Team access isn't set up yet. Apply the registration-allowlist migration
            (<code className="text-xs">supabase/migrations/2026_07_17_registration_allowlist.sql</code>)
            in the Supabase SQL Editor, then reload.
          </p>
        ) : isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading allowlist…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No allowed emails yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {rows.map((row) => (
              <li key={row.email} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="text-sm text-foreground truncate">{row.email}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive/80 shrink-0"
                  onClick={() => handleRemove(row.email)}
                  aria-label={`Remove ${row.email}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
