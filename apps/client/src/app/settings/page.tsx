"use client";

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  User,
  Building,
  Bell,
  Shield,
  Palette,
  Globe,
  Save,
  Upload,
  Camera,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';

interface TenantSettings {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  registration_number: string;
  logo_url?: string;
  timezone: string;
  currency: string;
  date_format: string;
  theme: 'light' | 'dark' | 'auto';
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  avatar_url?: string;
}

interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  low_stock_alerts: boolean;
  order_updates: boolean;
  system_alerts: boolean;
  weekly_reports: boolean;
}

const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'EST', label: 'EST (Eastern Standard Time)' },
  { value: 'PST', label: 'PST (Pacific Standard Time)' },
  { value: 'GMT', label: 'GMT (Greenwich Mean Time)' },
  { value: 'CET', label: 'CET (Central European Time)' },
];

const CURRENCIES = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
];

const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US Format)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (European Format)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO Format)' },
  { value: 'DD MMM YYYY', label: 'DD MMM YYYY (e.g., 15 Jan 2024)' },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Profile state
  const [profile, setProfile] = useState<UserProfile>({
    id: user?.id || '',
    name: user ? `${user.first_name} ${user.last_name}` : '',
    email: user?.email || '',
    phone: '', // User type doesn't have phone, will be loaded from API
    role: user?.role || '',
  });

  // Tenant settings state
  const [tenantSettings, setTenantSettings] = useState<TenantSettings>({
    id: '',
    name: 'AgroMart Company',
    email: 'contact@agromart.com',
    phone: '+1-555-0123',
    address: '123 Farm Street, Agriculture City, AC 12345',
    registration_number: 'REG123456789',
    timezone: 'UTC',
    currency: 'USD',
    date_format: 'MM/DD/YYYY',
    theme: 'light',
  });

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email_notifications: true,
    push_notifications: true,
    low_stock_alerts: true,
    order_updates: true,
    system_alerts: false,
    weekly_reports: true,
  });

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // TODO: Implement API call
      console.log('Saving profile:', profile);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTenantSettings = async () => {
    setLoading(true);
    try {
      // TODO: Implement API call
      console.log('Saving tenant settings:', tenantSettings);
      toast.success('Organization settings updated successfully');
    } catch (error) {
      toast.error('Failed to update organization settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    try {
      // TODO: Implement API call
      console.log('Saving notification settings:', notificationSettings);
      toast.success('Notification preferences updated successfully');
    } catch (error) {
      toast.error('Failed to update notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = () => {
    // TODO: Implement file upload
    toast('Avatar upload functionality coming soon', { icon: 'ℹ️' });
  };

  const handleLogoUpload = () => {
    // TODO: Implement file upload
    toast('Logo upload functionality coming soon', { icon: 'ℹ️' });
  };

  return (
    <DashboardLayout title="Settings">
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account and organization preferences
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger value="organization" className="flex items-center space-x-2">
              <Building className="h-4 w-4" />
              <span>Organization</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center space-x-2">
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center space-x-2">
              <Palette className="h-4 w-4" />
              <span>Preferences</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and account details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt="User avatar"
                          width={80}
                          height={80}
                          loading="lazy"
                          decoding="async"
                          sizes="80px"
                          className="w-20 h-20 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                      aria-label="Upload avatar"
                      onClick={handleAvatarUpload}
                    >
                      <Camera className="h-3 w-3" />
                    </Button>
                  </div>
                  <div>
                    <h3 className="font-medium">{profile.name}</h3>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                    <Badge variant="secondary" className="mt-1">
                      {profile.role}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="profile-name">Full Name</Label>
                    <Input
                      id="profile-name"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="profile-email">Email</Label>
                    <Input
                      id="profile-email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="profile-phone">Phone</Label>
                    <Input
                      id="profile-phone"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="profile-role">Role</Label>
                    <Input
                      id="profile-role"
                      value={profile.role}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={loading}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Organization Tab */}
          <TabsContent value="organization" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Organization Settings</CardTitle>
                <CardDescription>
                  Manage your organization's information and branding
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Section */}
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                      {tenantSettings.logo_url ? (
                        <img
                          src={tenantSettings.logo_url}
                          alt="Organization logo"
                          width={80}
                          height={80}
                          loading="lazy"
                          decoding="async"
                          sizes="80px"
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                      ) : (
                        <Building className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                      aria-label="Upload organization logo"
                      onClick={handleLogoUpload}
                    >
                      <Upload className="h-3 w-3" />
                    </Button>
                  </div>
                  <div>
                    <h3 className="font-medium">Organization Logo</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload your organization's logo (max 5MB)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="org-name">Organization Name</Label>
                    <Input
                      id="org-name"
                      value={tenantSettings.name}
                      onChange={(e) => setTenantSettings({ ...tenantSettings, name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="org-email">Contact Email</Label>
                    <Input
                      id="org-email"
                      type="email"
                      value={tenantSettings.email}
                      onChange={(e) => setTenantSettings({ ...tenantSettings, email: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="org-phone">Contact Phone</Label>
                    <Input
                      id="org-phone"
                      value={tenantSettings.phone}
                      onChange={(e) => setTenantSettings({ ...tenantSettings, phone: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="org-reg">Registration Number</Label>
                    <Input
                      id="org-reg"
                      value={tenantSettings.registration_number}
                      onChange={(e) => setTenantSettings({ ...tenantSettings, registration_number: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="org-address">Address</Label>
                  <Textarea
                    id="org-address"
                    value={tenantSettings.address}
                    onChange={(e) => setTenantSettings({ ...tenantSettings, address: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveTenantSettings} disabled={loading}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Configure how you want to receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.email_notifications}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, email_notifications: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications in your browser
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.push_notifications}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, push_notifications: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Low Stock Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when inventory is running low
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.low_stock_alerts}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, low_stock_alerts: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Order Updates</Label>
                      <p className="text-sm text-muted-foreground">
                        Notifications for order status changes
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.order_updates}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, order_updates: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>System Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Important system maintenance and updates
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.system_alerts}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, system_alerts: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Weekly Reports</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive weekly business summary reports
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.weekly_reports}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, weekly_reports: checked })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveNotifications} disabled={loading}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Preferences</CardTitle>
                <CardDescription>
                  Customize your application preferences and display settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={tenantSettings.timezone}
                      onValueChange={(value) => setTenantSettings({ ...tenantSettings, timezone: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={tenantSettings.currency}
                      onValueChange={(value) => setTenantSettings({ ...tenantSettings, currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="date-format">Date Format</Label>
                    <Select
                      value={tenantSettings.date_format}
                      onValueChange={(value) => setTenantSettings({ ...tenantSettings, date_format: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DATE_FORMATS.map((format) => (
                          <SelectItem key={format.value} value={format.value}>
                            {format.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="theme">Theme</Label>
                    <Select
                      value={tenantSettings.theme}
                      onValueChange={(value: any) => setTenantSettings({ ...tenantSettings, theme: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="auto">Auto (System)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveTenantSettings} disabled={loading}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
