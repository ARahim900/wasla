
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon, Mail, Phone, Save, Bell, Moon, Sun, Settings as SettingsIcon, Building } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { motion } from "framer-motion";

const ProfileField = ({ id, label, icon: Icon, ...props }) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-foreground font-medium">{label}</Label>
    <div className="relative">
      {Icon && <Icon className="absolute start-3 top-3 w-4 h-4 text-muted-foreground" />}
      <Input id={id} name={id} className={Icon ? "ps-10" : ""} {...props} />
    </div>
  </div>
);

export default function Settings() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [profileData, setProfileData] = useState({ full_name: "", email: "", phone: "", company: "", address: "" });
  const [preferences, setPreferences] = useState({ notifications: true, darkMode: false, emailReminders: true });

  const loadUserData = async () => {
    try {
      const userData = await User.me();
      if (userData) {
        setUser(userData);
        setProfileData({
          full_name: userData.full_name || "", email: userData.email || "", phone: userData.phone || "",
          company: userData.company || "", address: userData.address || ""
        });
        setPreferences({
          notifications: userData.notifications ?? true, darkMode: userData.darkMode ?? false,
          emailReminders: userData.emailReminders ?? true
        });
      }
    } catch (error) {
      toast.error("Failed to load user data.");
      console.error("Error loading user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const dataToSave = activeTab === 'profile' ? profileData : preferences;
    const toastId = toast.loading(`Saving ${activeTab}...`);
    try {
      await User.updateMe(dataToSave);
      await loadUserData(); // Refresh data from server
      toast.success(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} saved successfully!`, { id: toastId });
    } catch (error) {
      toast.error(`Failed to save ${activeTab}.`, { id: toastId });
      console.error(`Error saving ${activeTab}:`, error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-4 md:p-8"><div className="animate-pulse"><div className="h-8 bg-muted rounded w-1/4 mb-4" /><div className="h-4 bg-muted rounded w-1/2 mb-8" /><div className="h-96 bg-muted rounded" /></div></div>;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 lg:space-y-8"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-2">Settings</h1>
        <p className="text-sm md:text-base text-muted-foreground">Account and app preferences.</p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <motion.div variants={itemVariants}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>
        </motion.div>

        <TabsContent value="profile" className="space-y-6">
          <motion.div variants={itemVariants}>
            <Card className="transition-all duration-200">
            <CardHeader><CardTitle className="flex items-center gap-2 text-foreground"><UserIcon className="w-5 h-5" />Profile Information</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <Avatar className="w-20 h-20"><AvatarImage src={user?.avatar} /><AvatarFallback className="text-2xl font-semibold">{profileData.full_name?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                <div className="text-center sm:text-left">
                  <h3 className="font-semibold text-foreground">{profileData.full_name || 'User'}</h3>
                  <p className="text-muted-foreground text-sm">{profileData.email}</p>
                  <Button variant="outline" size="sm" className="mt-2">Change Photo</Button>
                </div>
              </div>
              <Separator />
              <div className="grid md:grid-cols-2 gap-6">
                <ProfileField id="full_name" label="Full Name" icon={UserIcon} value={profileData.full_name} onChange={handleProfileChange} placeholder="Your full name" />
                <ProfileField id="email" label="Email Address" icon={Mail} type="email" value={profileData.email} disabled placeholder="your.email@example.com" />
                <ProfileField id="phone" label="Phone Number" icon={Phone} value={profileData.phone} onChange={handleProfileChange} placeholder="+1 (555) 123-4567" />
                <ProfileField id="company" label="Company" icon={Building} value={profileData.company} onChange={handleProfileChange} placeholder="Your company name" />
              </div>
              <ProfileField id="address" label="Address" value={profileData.address} onChange={handleProfileChange} placeholder="Your business address" />
            </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <motion.div variants={itemVariants}>
            <Card className="transition-all duration-200">
            <CardHeader><CardTitle className="flex items-center gap-2 text-foreground"><SettingsIcon className="w-5 h-5" />Application Preferences</CardTitle></CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2"><Bell className="w-5 h-5" />Notifications</h3>
                <div className="space-y-4 ps-7">
                  <div className="flex items-center justify-between"><Label htmlFor="notifications-switch" className="text-muted-foreground font-medium cursor-pointer">Push Notifications</Label><Switch id="notifications-switch" checked={preferences.notifications} onCheckedChange={(c) => handlePreferenceChange('notifications', c)} /></div>
                  <div className="flex items-center justify-between"><Label htmlFor="reminders-switch" className="text-muted-foreground font-medium cursor-pointer">Email Reminders</Label><Switch id="reminders-switch" checked={preferences.emailReminders} onCheckedChange={(c) => handlePreferenceChange('emailReminders', c)} /></div>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">{preferences.darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}Appearance</h3>
                <div className="ps-7"><div className="flex items-center justify-between"><Label htmlFor="darkmode-switch" className="text-muted-foreground font-medium cursor-pointer">Dark Mode</Label><Switch id="darkmode-switch" checked={preferences.darkMode} onCheckedChange={(c) => handlePreferenceChange('darkMode', c)} /></div></div>
              </div>
            </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
      <motion.div variants={itemVariants} className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto min-h-[44px]">
          <Save className="w-4 h-4 me-2" />{isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </motion.div>
    </motion.div>
  );
}
