import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const LOGO_URL =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b44f73a9997833d114376d/f255c3751_image.png";

// Reused header so every branch (login, signup, forgot, confirm-email) shares
// the same logo + brand block — fixes the "inconsistent" feel.
const BrandHeader = () => (
  <div className="text-center mb-8">
    <img
      src={LOGO_URL}
      alt="Wasla"
      width={64}
      height={64}
      className="w-16 h-16 mx-auto mb-4 object-contain"
    />
    <h1 className="text-3xl font-bold text-primary tracking-tight">Wasla</h1>
    <p className="text-muted-foreground text-sm mt-1">Property Solutions</p>
  </div>
);

const PageShell = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <div className="w-full max-w-md">{children}</div>
  </div>
);

// Single source of truth for the icon-prefixed input — avoids the slight
// vertical mis-alignment from the previous `top-3` magic number, and uses
// logical properties so RTL flips correctly.
const IconInput = ({ id, icon: Icon, ...props }) => (
  <div className="relative">
    <Icon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
    <Input id={id} className="ps-10" {...props} />
  </div>
);

export default function Login() {
  const { isDemoMode, login, signUp, resendConfirmation, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [confirmEmailSent, setConfirmEmailSent] = useState(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signUpData, setSignUpData] = useState({ email: "", password: "", confirmPassword: "" });

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      toast.error("Please enter your email and password.");
      return;
    }
    setIsLoading(true);
    try {
      await login(loginData.email, loginData.password);
      navigate("/");
    } catch (error) {
      const msg = error.message || "Login failed. Please check your credentials.";
      if (msg.toLowerCase().includes("email not confirmed") || msg.toLowerCase().includes("verify")) {
        toast.error("Please verify your email address to log in.");
        setConfirmEmailSent(loginData.email);
        resendConfirmation(loginData.email).catch(() => {});
      } else {
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!signUpData.email || !signUpData.password) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (signUpData.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (signUpData.password !== signUpData.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await signUp(signUpData.email, signUpData.password);
      if (result?.confirmEmail) {
        setConfirmEmailSent(signUpData.email);
      } else {
        toast.success("Account created successfully!");
        navigate("/");
      }
    } catch (error) {
      const msg = error.message || "Sign up failed. Please try again.";
      if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
        toast.error("Account already exists. If you haven't verified it, click Resend on the next screen.", { duration: 6000 });
        setConfirmEmailSent(signUpData.email);
      } else {
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ───────── Forgot password ─────────
  if (showForgotPassword) {
    return (
      <PageShell>
        <BrandHeader />
        <Card>
          <CardContent className="pt-8 pb-8">
            <h2 className="text-xl font-bold text-foreground mb-2">Reset your password</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!forgotEmail) {
                  toast.error("Please enter your email address.");
                  return;
                }
                setIsLoading(true);
                try {
                  await resetPassword(forgotEmail);
                  toast.success("Password reset email sent! Check your inbox.");
                } catch (err) {
                  toast.error(err.message || "Failed to send reset email. Please try again.");
                } finally {
                  setIsLoading(false);
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <IconInput
                  id="forgot-email"
                  icon={Mail}
                  type="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
            <Button
              variant="ghost"
              onClick={() => {
                setShowForgotPassword(false);
                setActiveTab("login");
              }}
              className="w-full mt-3 text-muted-foreground"
            >
              Back to Log In
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  // ───────── Confirm email sent ─────────
  if (confirmEmailSent) {
    return (
      <PageShell>
        <BrandHeader />
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Check your email</h2>
            <p className="text-muted-foreground mb-1">We sent a confirmation link to</p>
            <p className="font-medium text-foreground mb-6 break-all">{confirmEmailSent}</p>
            <p className="text-sm text-muted-foreground mb-6">
              Click the link in the email to activate your account. If you don&apos;t see it, check your spam folder.
            </p>
            <div className="space-y-3">
              <Button
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    await resendConfirmation(confirmEmailSent);
                    toast.success("Verification email resent! Please check your inbox and spam folder.");
                  } catch (err) {
                    toast.error(err.message || "Failed to resend email. Please try again later.");
                  } finally {
                    setIsLoading(false);
                  }
                }}
                variant="outline"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                Resend Verification Email
              </Button>
              <Button
                onClick={() => {
                  setConfirmEmailSent(null);
                  setActiveTab("login");
                  setLoginData((p) => ({ ...p, email: confirmEmailSent }));
                }}
                className="w-full"
              >
                Back to Log In
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  // ───────── Demo mode ─────────
  if (isDemoMode) {
    return (
      <PageShell>
        <BrandHeader />
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <p className="text-muted-foreground mb-4">Running in demo mode. No login required.</p>
            <Button onClick={() => navigate("/")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  // ───────── Default: login + signup tabs ─────────
  return (
    <PageShell>
      <BrandHeader />
      <Card>
        <CardContent className="pt-6 pb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Log In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* Fixed-min-height wrapper so the card doesn't jump when switching
                between login (2 fields) and signup (3 fields). */}
            <div className="min-h-[340px]">
              <TabsContent value="login" className="mt-0 space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Welcome back</h2>
                  <p className="text-sm text-muted-foreground mt-1">Sign in to continue to your dashboard.</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <IconInput
                      id="login-email"
                      icon={Mail}
                      type="email"
                      placeholder="you@example.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData((p) => ({ ...p, email: e.target.value }))}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <IconInput
                      id="login-password"
                      icon={Lock}
                      type="password"
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(e) => setLoginData((p) => ({ ...p, password: e.target.value }))}
                      autoComplete="current-password"
                    />
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                    {isLoading ? "Logging in..." : "Log In"}
                  </Button>
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(loginData.email);
                        setShowForgotPassword(true);
                      }}
                      className="text-sm text-primary hover:text-primary/80 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0 space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Create an account</h2>
                  <p className="text-sm text-muted-foreground mt-1">Set up your Wasla workspace in seconds.</p>
                </div>
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <IconInput
                      id="signup-email"
                      icon={Mail}
                      type="email"
                      placeholder="you@example.com"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData((p) => ({ ...p, email: e.target.value }))}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <IconInput
                      id="signup-password"
                      icon={Lock}
                      type="password"
                      placeholder="At least 6 characters"
                      value={signUpData.password}
                      onChange={(e) => setSignUpData((p) => ({ ...p, password: e.target.value }))}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirm Password</Label>
                    <IconInput
                      id="signup-confirm"
                      icon={Lock}
                      type="password"
                      placeholder="••••••••"
                      value={signUpData.confirmPassword}
                      onChange={(e) => setSignUpData((p) => ({ ...p, confirmPassword: e.target.value }))}
                      autoComplete="new-password"
                    />
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                    {isLoading ? "Creating account..." : "Sign Up"}
                  </Button>
                </form>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </PageShell>
  );
}
