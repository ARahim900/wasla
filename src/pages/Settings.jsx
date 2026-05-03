
import React, { useState, useEffect, useRef } from "react";
import { User } from "@/api/entities";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  User as UserIcon,
  Mail,
  Phone,
  Save,
  Bell,
  Moon,
  Sun,
  Settings as SettingsIcon,
  Building,
  MapPin,
  Camera,
  Lock,
  Loader2,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";

const ProfileField = ({ id, label, icon: Icon, ...props }) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-foreground font-medium text-sm">
      {label}
    </Label>
    <div className="relative">
      {Icon && (
        <Icon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      )}
      <Input
        id={id}
        name={id}
        className={`${Icon ? "ps-10" : ""} bg-background border-border focus:border-primary`}
        {...props}
      />
    </div>
  </div>
);

export default function Settings() {
  const { logout } = useAuth();
  const fileInputRef = useRef(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [profileData, setProfileData] = useState({
    full_name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
  });
  const [preferences, setPreferences] = useState({
    notifications: true,
    darkMode: false,
    emailReminders: true,
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState(null);

  const loadUserData = async () => {
    try {
      const userData = await User.me();
      if (userData) {
        setUser(userData);
        const profile = {
          full_name: userData.full_name || "",
          email: userData.email || "",
          phone: userData.phone || "",
          company: userData.company || "",
          address: userData.address || "",
        };
        setProfileData(profile);
        setOriginalData(profile);
        setPreferences({
          notifications: userData.notifications ?? true,
          darkMode: userData.darkMode ?? false,
          emailReminders: userData.emailReminders ?? true,
        });
      }
    } catch (error) {
      toast.error("Failed to load user data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  // Track changes
  useEffect(() => {
    if (originalData) {
      const changed = Object.keys(profileData).some(
        (key) => profileData[key] !== originalData[key]
      );
      setHasChanges(changed);
    }
  }, [profileData, originalData]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePreferenceChange = async (key, value) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);

    // Save preference immediately
    try {
      if (key === "darkMode") {
        document.documentElement.classList.toggle("dark", value);
        localStorage.setItem("theme", value ? "dark" : "light");
        await User.updateMe({ darkMode: value, theme: value ? "dark" : "light" });
      } else {
        await User.updateMe({ [key]: value });
      }
      toast.success(`${key === "darkMode" ? "Theme" : key === "notifications" ? "Notifications" : "Email reminders"} updated`);
    } catch (error) {
      // Revert on failure
      setPreferences((prev) => ({ ...prev, [key]: !value }));
      if (key === "darkMode") {
        document.documentElement.classList.toggle("dark", !value);
        localStorage.setItem("theme", !value ? "dark" : "light");
      }
      toast.error("Failed to update preference");
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploadingAvatar(true);
    const toastId = toast.loading("Uploading photo...");

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const filePath = `avatars/${authUser.id}/avatar.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        // If bucket doesn't exist, try the general bucket
        const generalPath = `public/${authUser.id}/avatar.${fileExt}`;
        const { error: generalError } = await supabase.storage
          .from("base44-prod")
          .upload(generalPath, file, { upsert: true });

        if (generalError) throw generalError;

        const { data: urlData } = supabase.storage
          .from("base44-prod")
          .getPublicUrl(generalPath);

        await User.updateMe({ avatar: urlData.publicUrl });
        setUser((prev) => ({ ...prev, avatar: urlData.publicUrl }));
      } else {
        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);

        await User.updateMe({ avatar: urlData.publicUrl });
        setUser((prev) => ({ ...prev, avatar: urlData.publicUrl }));
      }

      toast.success("Photo updated!", { id: toastId });
    } catch (error) {
      console.error("Avatar upload failed:", error);
      toast.error("Failed to upload photo. Please try again.", { id: toastId });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveProfile = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    const toastId = toast.loading("Saving profile...");
    try {
      await User.updateMe({
        full_name: profileData.full_name,
        phone: profileData.phone,
        company: profileData.company,
        address: profileData.address,
      });
      setOriginalData({ ...profileData });
      setHasChanges(false);
      await loadUserData();
      toast.success("Profile saved successfully!", { id: toastId });
    } catch (error) {
      toast.error("Failed to save profile.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsChangingPassword(true);
    const toastId = toast.loading("Changing password...");
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });
      if (error) throw error;
      setPasswordData({ newPassword: "", confirmPassword: "" });
      toast.success("Password changed successfully!", { id: toastId });
    } catch (error) {
      toast.error(error.message || "Failed to change password", { id: toastId });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account, profile, and preferences.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md bg-muted/60">
          <TabsTrigger value="profile" className="text-sm font-medium">
            Profile
          </TabsTrigger>
          <TabsTrigger value="preferences" className="text-sm font-medium">
            Preferences
          </TabsTrigger>
          <TabsTrigger value="security" className="text-sm font-medium">
            Security
          </TabsTrigger>
        </TabsList>

        {/* ===== PROFILE TAB ===== */}
        <TabsContent value="profile" className="space-y-6">
          {/* Avatar Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative group">
                  <Avatar className="w-24 h-24 border-2 border-border">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                      {profileData.full_name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    aria-label="Change profile photo"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6 text-white" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div className="text-center sm:text-start space-y-1">
                  <h3 className="text-lg font-semibold text-foreground">
                    {profileData.full_name || "User"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {profileData.email}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {user?.role || "user"}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                  >
                    <Camera className="w-3.5 h-3.5 me-1.5" />
                    {isUploadingAvatar ? "Uploading..." : "Change Photo"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Fields Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base text-foreground">
                <UserIcon className="w-4 h-4 text-primary" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal details. Changes are saved when you click Save.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <ProfileField
                  id="full_name"
                  label="Full Name"
                  icon={UserIcon}
                  value={profileData.full_name}
                  onChange={handleProfileChange}
                  placeholder="Your full name"
                />
                <ProfileField
                  id="email"
                  label="Email Address"
                  icon={Mail}
                  type="email"
                  value={profileData.email}
                  disabled
                  placeholder="your.email@example.com"
                />
                <ProfileField
                  id="phone"
                  label="Phone Number"
                  icon={Phone}
                  value={profileData.phone}
                  onChange={handleProfileChange}
                  placeholder="+968 9XXX XXXX"
                />
                <ProfileField
                  id="company"
                  label="Company"
                  icon={Building}
                  value={profileData.company}
                  onChange={handleProfileChange}
                  placeholder="Your company name"
                />
              </div>
              <ProfileField
                id="address"
                label="Address"
                icon={MapPin}
                value={profileData.address}
                onChange={handleProfileChange}
                placeholder="Your business address"
              />

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving || !hasChanges}
                  className="min-h-[44px] min-w-[140px]"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 me-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 me-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== PREFERENCES TAB ===== */}
        <TabsContent value="preferences" className="space-y-6">
          {/* Notifications Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base text-foreground">
                <Bell className="w-4 h-4 text-primary" />
                Notifications
              </CardTitle>
              <CardDescription>
                Control how you receive updates and reminders.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="notifications-switch"
                    className="text-sm font-medium text-foreground cursor-pointer"
                  >
                    Push Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receive alerts for inspection updates and status changes.
                  </p>
                </div>
                <Switch
                  id="notifications-switch"
                  checked={preferences.notifications}
                  onCheckedChange={(c) =>
                    handlePreferenceChange("notifications", c)
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="reminders-switch"
                    className="text-sm font-medium text-foreground cursor-pointer"
                  >
                    Email Reminders
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Get email summaries and scheduled inspection reminders.
                  </p>
                </div>
                <Switch
                  id="reminders-switch"
                  checked={preferences.emailReminders}
                  onCheckedChange={(c) =>
                    handlePreferenceChange("emailReminders", c)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Appearance Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base text-foreground">
                {preferences.darkMode ? (
                  <Moon className="w-4 h-4 text-primary" />
                ) : (
                  <Sun className="w-4 h-4 text-primary" />
                )}
                Appearance
              </CardTitle>
              <CardDescription>
                Customize the look and feel of the application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="darkmode-switch"
                    className="text-sm font-medium text-foreground cursor-pointer"
                  >
                    Dark Mode
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Switch between light and dark themes.
                  </p>
                </div>
                <Switch
                  id="darkmode-switch"
                  checked={preferences.darkMode}
                  onCheckedChange={(c) =>
                    handlePreferenceChange("darkMode", c)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== SECURITY TAB ===== */}
        <TabsContent value="security" className="space-y-6">
          {/* Change Password Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base text-foreground">
                <Lock className="w-4 h-4 text-primary" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your password to keep your account secure.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="newPassword"
                    className="text-foreground font-medium text-sm"
                  >
                    New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      className="ps-10 pe-10 bg-background"
                      placeholder="Min 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-foreground font-medium text-sm"
                  >
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      className="ps-10 bg-background"
                      placeholder="Confirm your password"
                    />
                  </div>
                </div>
              </div>
              {passwordData.newPassword &&
                passwordData.confirmPassword &&
                passwordData.newPassword !== passwordData.confirmPassword && (
                  <p className="text-sm text-destructive">
                    Passwords do not match
                  </p>
                )}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleChangePassword}
                  disabled={
                    isChangingPassword ||
                    !passwordData.newPassword ||
                    !passwordData.confirmPassword
                  }
                  variant="outline"
                  className="min-h-[44px]"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 me-2 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 me-2" />
                      Update Password
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions Card */}
          <Card className="border-destructive/20">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base text-foreground">
                <SettingsIcon className="w-4 h-4 text-destructive" />
                Account
              </CardTitle>
              <CardDescription>
                Manage your account session.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">
                    Sign Out
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Log out of your account on this device.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logout()}
                  className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
