"use client";

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import Image from 'next/image';
import { apiClient } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileUpload } from '@/components/ui/file-upload';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
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
  MapPin,
  CreditCard,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';

// Updated interfaces to match database schema
interface TenantSettings {
  id: string;
  company_name: string;
  company_logo_url?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  timezone: string;
  currency_code: string;
  date_format: string;
  language: string;
  fiscal_year_start: number;
  tax_id?: string;
  website_url?: string;
  theme: 'light' | 'dark' | 'auto';
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  avatar_url?: string;
}

interface NotificationSettings {
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  low_stock_alerts: boolean;
  expiry_alerts: boolean;
  order_updates: boolean;
  payment_reminders: boolean;
  marketing_emails: boolean;
  weekly_reports: boolean;
}

interface FormErrors {
  [key: string]: string;
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

   // Permission-based access control
   const canEditProfile = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'user';
   const canEditOrganization = user?.role === 'admin' || user?.role === 'manager';
   const canEditSystemSettings = user?.role === 'admin';

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
    company_name: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    timezone: 'UTC',
    currency_code: 'USD',
    date_format: 'YYYY-MM-DD',
    language: 'en',
    fiscal_year_start: 1,
    tax_id: '',
    website_url: '',
    theme: 'light',
  });

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true,
    low_stock_alerts: true,
    expiry_alerts: true,
    order_updates: true,
    payment_reminders: true,
    marketing_emails: false,
    weekly_reports: true,
  });

  // Form errors and validation
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const { data: tenantResp, mutate: mutateTenant } = useSWR('settings:tenant', () => apiClient.settings.getTenant());
  const { data: notifResp, mutate: mutateNotif } = useSWR('settings:notifications', () => apiClient.settings.getNotifications());

  useEffect(() => {
    if (tenantResp) {
      const d = (tenantResp as any).data ?? tenantResp;
      setTenantSettings((prev) => ({ ...prev, ...(d || {}) }));
    }
  }, [tenantResp]);

  useEffect(() => {
    if (notifResp) {
      const d = (notifResp as any).data ?? notifResp;
      setNotificationSettings((prev) => ({ ...prev, ...(d || {}) }));
    }
  }, [notifResp]);

  // Validation functions
  const validateTenantSettings = (): boolean => {
    const errors: FormErrors = {};

    if (!tenantSettings.company_name?.trim()) {
      errors.company_name = 'Organization name is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateProfile = (): boolean => {
    const errors: FormErrors = {};

    if (!profile.name?.trim()) {
      errors.name = 'Full name is required';
    }

    if (!profile.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      errors.email = 'Please enter a valid email address';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // File upload handlers
  const handleAvatarUpload = (file: File | null) => {
    setAvatarFile(file);
    if (file) {
      // Create preview URL
      const url = URL.createObjectURL(file);
      setProfile({ ...profile, avatar_url: url });
    } else {
      setProfile({ ...profile, avatar_url: undefined });
    }
  };

  const handleLogoUpload = (file: File | null) => {
    setLogoFile(file);
    if (file) {
      // Create preview URL
      const url = URL.createObjectURL(file);
      setTenantSettings({ ...tenantSettings, company_logo_url: url });
    } else {
      setTenantSettings({ ...tenantSettings, company_logo_url: undefined });
    }
  };

  // Wrapper functions for onClick handlers
  const openAvatarUpload = () => {
    document.getElementById('avatar-upload')?.click();
  };

  const openLogoUpload = () => {
    document.getElementById('logo-upload')?.click();
  };

  // Upload file utility
  const uploadFile = async (file: File, type: 'avatar' | 'logo'): Promise<string> => {
    try {
      // In a real implementation, you would upload to your file storage service
      // For now, we'll simulate the upload and return the file URL
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      // TODO: Implement actual file upload to your backend
      // const response = await apiClient.uploadFile(formData);
      // return response.data.url;

      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      return URL.createObjectURL(file); // Return preview URL for now
    } catch (error) {
      console.error(`Failed to upload ${type}:`, error);
      throw new Error(`Failed to upload ${type}`);
    }
  };

  const handleSaveProfile = async () => {
    if (!validateProfile()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    setLoading(true);
    try {
      let avatar_url = profile.avatar_url;

      // Upload avatar if a new file was selected
      if (avatarFile) {
        avatar_url = await uploadFile(avatarFile, 'avatar');
      }

      await apiClient.profile.update({
        name: profile.name,
        phone: profile.phone,
        avatar_url,
      });

      setAvatarFile(null);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTenantSettings = async () => {
    if (!validateTenantSettings()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    setLoading(true);
    try {
      let logo_url = tenantSettings.company_logo_url;

      // Upload logo if a new file was selected
      if (logoFile) {
        logo_url = await uploadFile(logoFile, 'logo');
      }

      const settingsToSave = {
        ...tenantSettings,
        company_logo_url: logo_url,
      };

      await apiClient.settings.updateTenant(settingsToSave);
      mutateTenant();
      setLogoFile(null);
      toast.success('Organization settings updated successfully');
    } catch (error) {
      console.error('Failed to update organization settings:', error);
      toast.error('Failed to update organization settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    try {
      await apiClient.settings.updateNotifications(notificationSettings);
      mutateNotif();
      toast.success('Notification preferences updated successfully');
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      toast.error('Failed to update notification preferences');
    } finally {
      setLoading(false);
    }
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
                        <Image
                          src={profile.avatar_url}
                          alt="User avatar"
                          width={80}
                          height={80}
                          loading="lazy"
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
                      onClick={openAvatarUpload}
                    >
                      <Camera className="h-3 w-3" />
                    </Button>
                  </div>
                  {/* Hidden file input for avatar */}
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      handleAvatarUpload(file);
                    }}
                    className="hidden"
                  />
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
                  <Button
                    onClick={handleSaveProfile}
                    disabled={loading || !canEditProfile}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
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
                      {tenantSettings.company_logo_url ? (
                        <Image
                          src={tenantSettings.company_logo_url}
                          alt="Organization logo"
                          width={80}
                          height={80}
                          loading="lazy"
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
                      onClick={openLogoUpload}
                    >
                      <Upload className="h-3 w-3" />
                    </Button>
                  </div>
                  {/* Hidden file input for logo */}
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      handleLogoUpload(file);
                    }}
                    className="hidden"
                  />
                  <div>
                    <h3 className="font-medium">Organization Logo</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload your organization's logo (max 5MB)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="grid gap-2">
                     <Label htmlFor="org-name">Organization Name *</Label>
                     <Input
                       id="org-name"
                       value={tenantSettings.company_name}
                       onChange={(e) => setTenantSettings({ ...tenantSettings, company_name: e.target.value })}
                       className={formErrors.company_name ? 'border-destructive' : ''}
                     />
                     {formErrors.company_name && (
                       <p className="text-sm text-destructive">{formErrors.company_name}</p>
                     )}
                   </div>
                   <div className="grid gap-2">
                     <Label htmlFor="org-email">Contact Email</Label>
                     <Input
                       id="org-email"
                       type="email"
                       value={tenantSettings.company_email || ''}
                       onChange={(e) => setTenantSettings({ ...tenantSettings, company_email: e.target.value })}
                     />
                   </div>
                   <div className="grid gap-2">
                     <Label htmlFor="org-phone">Contact Phone</Label>
                     <Input
                       id="org-phone"
                       value={tenantSettings.company_phone || ''}
                       onChange={(e) => setTenantSettings({ ...tenantSettings, company_phone: e.target.value })}
                     />
                   </div>
                   <div className="grid gap-2">
                     <Label htmlFor="tax-id">Tax ID</Label>
                     <Input
                       id="tax-id"
                       value={tenantSettings.tax_id || ''}
                       onChange={(e) => setTenantSettings({ ...tenantSettings, tax_id: e.target.value })}
                     />
                   </div>
                   <div className="grid gap-2">
                     <Label htmlFor="website">Website</Label>
                     <Input
                       id="website"
                       type="url"
                       value={tenantSettings.website_url || ''}
                       onChange={(e) => setTenantSettings({ ...tenantSettings, website_url: e.target.value })}
                       placeholder="https://example.com"
                     />
                   </div>
                   <div className="grid gap-2">
                     <Label htmlFor="language">Language</Label>
                     <Select
                       value={tenantSettings.language}
                       onValueChange={(value) => setTenantSettings({ ...tenantSettings, language: value })}
                     >
                       <SelectTrigger>
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="en">English</SelectItem>
                         <SelectItem value="es">Spanish</SelectItem>
                         <SelectItem value="fr">French</SelectItem>
                         <SelectItem value="de">German</SelectItem>
                         <SelectItem value="it">Italian</SelectItem>
                         <SelectItem value="pt">Portuguese</SelectItem>
                         <SelectItem value="hi">Hindi</SelectItem>
                         <SelectItem value="zh">Chinese</SelectItem>
                         <SelectItem value="ja">Japanese</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                 </div>

                 <div className="grid gap-2">
                   <Label htmlFor="org-address">Address</Label>
                   <Textarea
                     id="org-address"
                     value={tenantSettings.company_address || ''}
                     onChange={(e) => setTenantSettings({ ...tenantSettings, company_address: e.target.value })}
                     rows={3}
                     placeholder="Enter your organization address"
                   />
                 </div>

                 <div className="grid gap-2">
                   <Label htmlFor="fiscal-year">Fiscal Year Start Month</Label>
                   <Select
                     value={tenantSettings.fiscal_year_start.toString()}
                     onValueChange={(value) => setTenantSettings({ ...tenantSettings, fiscal_year_start: parseInt(value) })}
                   >
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="1">January</SelectItem>
                       <SelectItem value="2">February</SelectItem>
                       <SelectItem value="3">March</SelectItem>
                       <SelectItem value="4">April</SelectItem>
                       <SelectItem value="5">May</SelectItem>
                       <SelectItem value="6">June</SelectItem>
                       <SelectItem value="7">July</SelectItem>
                       <SelectItem value="8">August</SelectItem>
                       <SelectItem value="9">September</SelectItem>
                       <SelectItem value="10">October</SelectItem>
                       <SelectItem value="11">November</SelectItem>
                       <SelectItem value="12">December</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveTenantSettings}
                    disabled={loading || !canEditOrganization}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                  {!canEditOrganization && (
                    <p className="text-sm text-muted-foreground ml-2">
                      Admin or Manager access required
                    </p>
                  )}
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
                      <Label>SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive important notifications via SMS
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.sms_notifications}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, sms_notifications: checked })
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
                      <Label>Expiry Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when products are expiring soon
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.expiry_alerts}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, expiry_alerts: checked })
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
                      <Label>Payment Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Reminders for overdue payments and invoices
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.payment_reminders}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, payment_reminders: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Marketing Emails</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive promotional offers and updates
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.marketing_emails}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, marketing_emails: checked })
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
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
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
                      value={tenantSettings.currency_code}
                      onValueChange={(value) => setTenantSettings({ ...tenantSettings, currency_code: value })}
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
                  <Button
                    onClick={handleSaveTenantSettings}
                    disabled={loading || !canEditSystemSettings}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Preferences
                  </Button>
                  {!canEditSystemSettings && (
                    <p className="text-sm text-muted-foreground ml-2">
                      Admin access required
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
