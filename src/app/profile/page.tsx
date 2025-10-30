'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useNotification } from '@/components/Notification';
import usePageTitle from '@/hooks/usePageTitle';

interface ProfileFormData {
  name: string;
  email: string;
}

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { notify } = useNotification();

  // Profile form state
  const [profileData, setProfileData] = useState<ProfileFormData>({
    name: '',
    email: '',
  });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // Password form state
  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  // Email notification preferences state
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false);
  const [dueDateRemindersEnabled, setDueDateRemindersEnabled] = useState(false);
  const [isEmailPrefsLoading, setIsEmailPrefsLoading] = useState(false);

  usePageTitle("Profile");

  // Load user profile from API
  const loadUserProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const profile = await response.json();
        setUserProfile(profile);
        setProfileData({
          name: profile.name || '',
          email: profile.email || '',
        });
      } else {
        console.error('Failed to load user profile');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  // Initialize form data from session and load profile
  useEffect(() => {
    if (session?.user) {
      setProfileData({
        name: session.user.name || '',
        email: session.user.email || '',
      });
      loadUserProfile();
    }
  }, [session]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
    }
  }, [session, status, router]);

  // Validate password form
  const validatePasswordForm = (): boolean => {
    const errors: typeof passwordErrors = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters long';
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle profile update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProfileLoading(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profileData.name,
          email: profileData.email,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Update the session with new data
        await update({
          ...session,
          user: {
            ...session?.user,
            name: profileData.name,
            email: profileData.email,
          },
        });
        notify('Profile updated successfully!', { type: 'success' });
      } else {
        notify(result.error || 'Failed to update profile', { type: 'error' });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      notify('Error updating profile', { type: 'error' });
    } finally {
      setIsProfileLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePasswordForm()) {
      return;
    }

    setIsPasswordLoading(true);

    try {
      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Clear password form
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setPasswordErrors({});
        notify('Password changed successfully!', { type: 'success' });
      } else {
        if (result.field) {
          setPasswordErrors({ [result.field]: result.error });
        } else {
          notify(result.error || 'Failed to change password', { type: 'error' });
        }
      }
    } catch (error) {
      console.error('Error changing password:', error);
      notify('Error changing password', { type: 'error' });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardLayout
      title="Profile Settings"
      headerActions={
        <button
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
          onClick={() => router.back()}
        >
          ← Back
        </button>
      }
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Profile Information Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Information</h2>
            <p className="text-gray-600">Update your account's profile information and email address.</p>
          </div>

          <form onSubmit={handleProfileUpdate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your email address"
                  required
                />
              </div>
            </div>

            {/* User Avatar Display */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Profile Picture</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl font-medium">
                  {session.user?.name ? session.user.name.charAt(0).toUpperCase() : session.user?.email?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    Your profile picture is automatically generated from your initials.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isProfileLoading}
                className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProfileLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Updating...
                  </>
                ) : (
                  'Update Profile'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Password Change Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Change Password</h2>
            <p className="text-gray-600">Update your password to keep your account secure.</p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-6">
            {/* Current Password */}
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                value={passwordData.currentPassword}
                onChange={(e) => {
                  setPasswordData({ ...passwordData, currentPassword: e.target.value });
                  if (passwordErrors.currentPassword) {
                    setPasswordErrors({ ...passwordErrors, currentPassword: undefined });
                  }
                }}
                className={`w-full px-3 py-2 border rounded-md bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  passwordErrors.currentPassword ? 'border-red-300' : 'border-gray-200'
                }`}
                placeholder="Enter your current password"
              />
              {passwordErrors.currentPassword && (
                <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* New Password */}
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={passwordData.newPassword}
                  onChange={(e) => {
                    setPasswordData({ ...passwordData, newPassword: e.target.value });
                    if (passwordErrors.newPassword) {
                      setPasswordErrors({ ...passwordErrors, newPassword: undefined });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-md bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    passwordErrors.newPassword ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="Enter new password"
                />
                {passwordErrors.newPassword && (
                  <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword}</p>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={(e) => {
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value });
                    if (passwordErrors.confirmPassword) {
                      setPasswordErrors({ ...passwordErrors, confirmPassword: undefined });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-md bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    passwordErrors.confirmPassword ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="Confirm new password"
                />
                {passwordErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword}</p>
                )}
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${passwordData.newPassword.length >= 6 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  At least 6 characters long
                </li>
                <li className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${passwordData.newPassword && passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  Passwords match
                </li>
              </ul>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isPasswordLoading}
                className="inline-flex items-center gap-2 px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPasswordLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Changing...
                  </>
                ) : (
                  'Change Password'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Account Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Account Information</h2>
            <p className="text-gray-600">View your account details and creation date.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
              <div className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded">
                {userProfile?.id || 'Loading...'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Member Since</label>
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                {userProfile?.createdAt
                  ? new Date(userProfile.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })
                  : 'Loading...'
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}