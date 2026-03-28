import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

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
        resendConfirmation(loginData.email).catch(() => {}); // Attempt background resend
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

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-emerald-600">Wasla</h1>
            <p className="text-slate-600 mt-1">Property Solutions</p>
          </div>
          <Card>
            <CardContent className="pt-8 pb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Reset your password</h2>
              <p className="text-slate-600 text-sm mb-6">
                Enter your email address and we'll send you a link to reset your password.
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
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="you@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowForgotPassword(false);
                  setActiveTab("login");
                }}
                className="w-full mt-3 text-slate-600"
              >
                Back to Log In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (confirmEmailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50 p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-8 pb-8 text-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h2>
              <p className="text-slate-600 mb-1">
                We sent a confirmation link to
              </p>
              <p className="font-medium text-slate-900 mb-6">{confirmEmailSent}</p>
              <p className="text-sm text-slate-500 mb-6">
                Click the link in the email to activate your account. If you don't see it, check your spam folder.
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
                  className="w-full text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Resend Verification Email
                </Button>
                <Button
                  onClick={() => {
                    setConfirmEmailSent(null);
                    setActiveTab("login");
                    setLoginData((p) => ({ ...p, email: confirmEmailSent }));
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  Back to Log In
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isDemoMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-slate-600 mb-4">Running in demo mode. No login required.</p>
            <Button onClick={() => navigate("/")} className="bg-emerald-600 hover:bg-emerald-700">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b44f73a9997833d114376d/f255c3751_image.png"
            alt="Wasla Logo"
            className="w-16 h-16 mx-auto mb-4 object-contain"
          />
          <h1 className="text-3xl font-bold text-emerald-600">Wasla</h1>
          <p className="text-slate-600 mt-1">Property Solutions</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Log In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6">
                <CardTitle className="text-xl text-slate-900">Welcome back</CardTitle>
                <form onSubmit={handleLogin} className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={loginData.email}
                        onChange={(e) => setLoginData((p) => ({ ...p, email: e.target.value }))}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginData.password}
                        onChange={(e) => setLoginData((p) => ({ ...p, password: e.target.value }))}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-700">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {isLoading ? "Logging in..." : "Log In"}
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(loginData.email);
                        setShowForgotPassword(true);
                      }}
                      className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <CardTitle className="text-xl text-slate-900">Create an account</CardTitle>
                <form onSubmit={handleSignUp} className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={signUpData.email}
                        onChange={(e) => setSignUpData((p) => ({ ...p, email: e.target.value }))}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="At least 6 characters"
                        value={signUpData.password}
                        onChange={(e) => setSignUpData((p) => ({ ...p, password: e.target.value }))}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <Input
                        id="signup-confirm"
                        type="password"
                        placeholder="••••••••"
                        value={signUpData.confirmPassword}
                        onChange={(e) => setSignUpData((p) => ({ ...p, confirmPassword: e.target.value }))}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-700">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {isLoading ? "Creating account..." : "Sign Up"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
