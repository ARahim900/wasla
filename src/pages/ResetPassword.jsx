import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const LOGO_URL =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b44f73a9997833d114376d/f255c3751_image.png";

const PageShell = ({ children }) => (
  <div className="min-h-[100svh] flex items-center justify-center bg-background px-4 py-6 sm:py-10">
    <div className="w-full max-w-md">{children}</div>
  </div>
);

const BrandHeader = () => (
  <div className="text-center mb-5 sm:mb-8">
    <img
      src={LOGO_URL}
      alt="Wasla"
      width={64}
      height={64}
      className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 object-contain"
    />
    <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">Wasla</h1>
    <p className="text-muted-foreground text-xs sm:text-sm mt-1">Property Solutions</p>
  </div>
);

export default function ResetPassword() {
  const navigate = useNavigate();
  const { isPasswordRecovery, clearPasswordRecovery, isAuthenticated, logout } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [done, setDone] = useState(false);

  // If the user lands here without a recovery session AND isn't authenticated,
  // the link is invalid or expired — guide them back to login.
  const linkInvalid = !isPasswordRecovery && !isAuthenticated;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading("Updating password...");
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      clearPasswordRecovery();
      setDone(true);
      toast.success("Password updated! You're signed in.", { id: toastId });
    } catch (err) {
      toast.error(err?.message || "Failed to update password. The link may have expired.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  if (linkInvalid) {
    return (
      <PageShell>
        <BrandHeader />
        <Card>
          <CardContent className="pt-6 pb-6 sm:pt-8 sm:pb-8 text-center">
            <h2 className="text-xl font-bold text-foreground mb-2">Reset link invalid or expired</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Please request a new password reset email and try again.
            </p>
            <Button onClick={() => navigate("/Login")} className="w-full">
              Back to Log In
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  if (done) {
    return (
      <PageShell>
        <BrandHeader />
        <Card>
          <CardContent className="pt-6 pb-6 sm:pt-8 sm:pb-8 text-center">
            <CheckCircle2 className="w-14 h-14 sm:w-16 sm:h-16 text-primary mx-auto mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Password updated</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Your password has been changed and you&apos;re signed in.
            </p>
            <Button onClick={() => navigate("/")} className="w-full">
              Continue to Dashboard
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <BrandHeader />
      <Card>
        <CardContent className="pt-6 pb-6 sm:pt-8 sm:pb-8">
          <h2 className="text-xl font-bold text-foreground mb-2">Set a new password</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Choose a strong password you haven&apos;t used before. You&apos;ll be signed in automatically once it&apos;s saved.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="ps-10 pe-10"
                  autoComplete="new-password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="ps-10"
                  autoComplete="new-password"
                />
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-destructive">Passwords do not match</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSaving || !newPassword || !confirmPassword}
              className="w-full"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
              {isSaving ? "Saving..." : "Update Password"}
            </Button>
          </form>

          <Button
            variant="ghost"
            onClick={async () => {
              clearPasswordRecovery();
              await logout(false);
              navigate("/Login");
            }}
            className="w-full mt-3 text-muted-foreground"
          >
            Cancel and return to Log In
          </Button>
        </CardContent>
      </Card>
    </PageShell>
  );
}
