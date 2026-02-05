'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { SiteProfile, PhotoAsset } from '@/types';
import { useSave } from '@/lib/admin/save-context';
import { usePreview } from '@/lib/admin/preview-context';
import styles from '@/styles/admin/AdminProfile.module.css';

export function AdminProfileClient() {
  const router = useRouter();
  const { registerChange, unregisterChange } = useSave();
  const { refreshPreview } = usePreview();
  const [profile, setProfile] = useState<SiteProfile | null>(null);
  const [savedProfile, setSavedProfile] = useState<SiteProfile | null>(null);
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [emailError, setEmailError] = useState('');
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const isDirty = useMemo(() => {
    if (!profile || !savedProfile) return false;
    return JSON.stringify(profile) !== JSON.stringify(savedProfile);
  }, [profile, savedProfile]);

  const isEmailValid = useMemo(() => {
    if (!profile?.email) return true;
    return profile.email.includes('@');
  }, [profile?.email]);

  const saveProfile = useCallback(async (): Promise<boolean> => {
    if (!profile) return false;
    
    try {
      const response = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      
      if (response.ok) {
        const updated = await response.json();
        setSavedProfile(updated);
        refreshPreview();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [profile]);

  useEffect(() => {
    if (isDirty && !isLoading) {
      registerChange({
        id: 'profile',
        type: 'page',
        save: saveProfile
      });
    } else {
      unregisterChange('profile');
    }
  }, [isDirty, isLoading, registerChange, unregisterChange, saveProfile]);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const [profileRes, photosRes] = await Promise.all([
        fetch('/api/admin/profile'),
        fetch('/api/admin/photos')
      ]);

      // If unauthorized, redirect to login
      if (profileRes.status === 401 || photosRes.status === 401) {
        router.push('/admin/login');
        return;
      }

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
        setSavedProfile(profileData);
      }

      if (photosRes.ok) {
        const photosData = await photosRes.json();
        setPhotos(photosData);
      }

      setIsLoading(false);
    }

    load();
  }, [router]);

  async function handleSave() {
    if (!profile) return;
    
    if (!isEmailValid) {
      setEmailError('Please enter a valid email address.');
      setStatus('Please fix the email address before saving.');
      return;
    }

    setStatus('Saving...');
    const success = await saveProfile();
    
    if (success) {
      setStatus('Profile saved successfully!');
    } else {
      setStatus('Failed to save profile.');
    }
  }

  async function handlePasswordChange() {
    if (newPassword !== confirmPassword) {
      setPasswordStatus('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordStatus('Password must be at least 8 characters.');
      return;
    }

    setIsChangingPassword(true);
    setPasswordStatus('Changing password...');

    try {
      const response = await fetch('/api/admin/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const result = await response.json();

      if (response.ok) {
        setPasswordStatus(`Password changed successfully!`);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordStatus(result.error || 'Failed to change password.');
      }
    } catch {
      setPasswordStatus('Failed to change password.');
    } finally {
      setIsChangingPassword(false);
    }
  }

  function updateField(path: string, value: string | string[]) {
    if (!profile) return;
    
    const keys = path.split('.');
    const updated = { ...profile };
    let current: Record<string, unknown> = updated;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...(current[keys[i]] as Record<string, unknown>) };
      current = current[keys[i]] as Record<string, unknown>;
    }
    
    current[keys[keys.length - 1]] = value;
    setProfile(updated as SiteProfile);
  }

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';

    const normalized = digits.startsWith('1') && digits.length > 10 ? digits.slice(1, 11) : digits.slice(0, 10);
    const part1 = normalized.slice(0, 3);
    const part2 = normalized.slice(3, 6);
    const part3 = normalized.slice(6, 10);

    if (normalized.length <= 3) return `(${part1}`;
    if (normalized.length <= 6) return `(${part1}) ${part2}`;
    return `(${part1}) ${part2}-${part3}`;
  }

  const selectedPhoto = photos.find(p => p.id === profile?.photoId);

  if (isLoading) {
    return <p className={styles.loadingText}>Loading profile...</p>;
  }

  if (!profile) {
    return null; // Will redirect to login
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h1>Profile</h1>
          <p>Manage your profile, contact info, and footer content.</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty}
          className={styles.saveButton}
        >
          Save Changes
        </button>
      </div>

      {status && <p className={styles.statusMessage}>{status}</p>}

      {/* Basic Info */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Basic Information</h2>
          <p>Your name and title as shown on the site.</p>
        </div>

        <div className={`${styles.formGrid} ${styles.formGrid2}`}>
          <label className={styles.formLabel}>
            <span className={styles.labelText}>Name</span>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => updateField('name', e.target.value)}
              className={styles.formInput}
            />
          </label>
          <label className={styles.formLabel}>
            <span className={styles.labelText}>Title</span>
            <input
              type="text"
              value={profile.title}
              onChange={(e) => updateField('title', e.target.value)}
              className={styles.formInput}
            />
          </label>
        </div>

        {/* Profile Photo */}
        <div>
          <span className={styles.labelText}>Profile Photo</span>
          <div className={styles.photoSection}>
            {selectedPhoto ? (
              <div className={styles.photoPreview}>
                <Image
                  src={selectedPhoto.src}
                  alt={selectedPhoto.alt}
                  fill
                  sizes="80px"
                />
              </div>
            ) : (
              <div className={styles.photoPlaceholder}>
                No photo
              </div>
            )}
            <select
              value={profile.photoId}
              onChange={(e) => updateField('photoId', e.target.value)}
              className={styles.photoSelect}
            >
              <option value="">Select a photo</option>
              {photos.map((photo) => (
                <option key={photo.id} value={photo.id}>
                  {photo.alt || photo.id}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Contact Info */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Contact Information</h2>
          <p>Shown in the footer and contact page.</p>
        </div>

        <div className={`${styles.formGrid} ${styles.formGrid2}`}>
          <label className={styles.formLabel}>
            <span className={styles.labelText}>Email</span>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => {
                setEmailError('');
                updateField('email', e.target.value);
              }}
              onBlur={() => {
                if (profile.email && !profile.email.includes('@')) {
                  setEmailError('Email must include an "@" symbol.');
                }
              }}
              className={styles.formInput}
            />
            {emailError && <p className={styles.statusMessage}>{emailError}</p>}
          </label>
          <label className={styles.formLabel}>
            <span className={styles.labelText}>Phone</span>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => updateField('phone', formatPhone(e.target.value))}
              className={styles.formInput}
            />
          </label>
        </div>

        <div className={`${styles.formGrid} ${styles.formGrid4}`}>
          <label className={`${styles.formLabel} ${styles.formGridSpan2}`}>
            <span className={styles.labelText}>Street Address</span>
            <input
              type="text"
              value={profile.address.street}
              onChange={(e) => updateField('address.street', e.target.value)}
              className={styles.formInput}
              placeholder="Optional"
            />
          </label>
          <label className={styles.formLabel}>
            <span className={styles.labelText}>City</span>
            <input
              type="text"
              value={profile.address.city}
              onChange={(e) => updateField('address.city', e.target.value)}
              className={styles.formInput}
            />
          </label>
          <label className={styles.formLabel}>
            <span className={styles.labelText}>State</span>
            <input
              type="text"
              value={profile.address.state}
              onChange={(e) => updateField('address.state', e.target.value)}
              className={styles.formInput}
            />
          </label>
        </div>
      </section>

      {/* Availability */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Availability</h2>
          <p>Regions you serve and availability note.</p>
        </div>

        <div className={`${styles.formGrid} ${styles.formGrid2}`}>
          <label className={styles.formLabel}>
            <span className={styles.labelText}>Regions (comma-separated)</span>
            <input
              type="text"
              value={profile.availability.regions.join(', ')}
              onChange={(e) => updateField('availability.regions', e.target.value.split(',').map(s => s.trim()))}
              className={styles.formInput}
              placeholder="DC, MD, VA"
            />
          </label>
          <label className={styles.formLabel}>
            <span className={styles.labelText}>Availability Note</span>
            <input
              type="text"
              value={profile.availability.note}
              onChange={(e) => updateField('availability.note', e.target.value)}
              className={styles.formInput}
            />
          </label>
        </div>
      </section>

      {/* Social Links */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Social Links</h2>
          <p>Links shown in the footer.</p>
        </div>

        <div className={styles.socialGroup}>
          {/* Instagram */}
          <div className={styles.socialItem}>
            <div className={`${styles.formGrid} ${styles.formGrid2}`}>
              <label className={styles.formLabel}>
                <span className={styles.labelText}>Instagram Handle</span>
                <input
                  type="text"
                  value={profile.social.instagram.handle || ''}
                  onChange={(e) => updateField('social.instagram.handle', e.target.value)}
                  className={styles.formInput}
                  placeholder="@yourhandle"
                />
              </label>
              <label className={styles.formLabel}>
                <span className={styles.labelText}>Instagram URL</span>
                <input
                  type="url"
                  value={profile.social.instagram.url}
                  onChange={(e) => updateField('social.instagram.url', e.target.value)}
                  className={styles.formInput}
                  placeholder="https://instagram.com/yourhandle"
                />
              </label>
            </div>
          </div>

          {/* LinkedIn */}
          <div className={styles.socialItem}>
            <div className={`${styles.formGrid} ${styles.formGrid2}`}>
              <label className={styles.formLabel}>
                <span className={styles.labelText}>LinkedIn Name</span>
                <input
                  type="text"
                  value={profile.social.linkedin.name || ''}
                  onChange={(e) => updateField('social.linkedin.name', e.target.value)}
                  className={styles.formInput}
                  placeholder="Your Company"
                />
              </label>
              <label className={styles.formLabel}>
                <span className={styles.labelText}>LinkedIn URL</span>
                <input
                  type="url"
                  value={profile.social.linkedin.url}
                  onChange={(e) => updateField('social.linkedin.url', e.target.value)}
                  className={styles.formInput}
                  placeholder="https://linkedin.com/company/yourcompany"
                />
              </label>
            </div>
          </div>

          {/* Twitter */}
          <div className={styles.socialItem}>
            <div className={`${styles.formGrid} ${styles.formGrid2}`}>
              <label className={styles.formLabel}>
                <span className={styles.labelText}>Twitter/X Handle</span>
                <input
                  type="text"
                  value={profile.social.twitter.handle || ''}
                  onChange={(e) => updateField('social.twitter.handle', e.target.value)}
                  className={styles.formInput}
                  placeholder="@yourhandle (optional)"
                />
              </label>
              <label className={styles.formLabel}>
                <span className={styles.labelText}>Twitter/X URL</span>
                <input
                  type="url"
                  value={profile.social.twitter.url}
                  onChange={(e) => updateField('social.twitter.url', e.target.value)}
                  className={styles.formInput}
                  placeholder="https://x.com/yourhandle (optional)"
                />
              </label>
            </div>
          </div>

          {/* Facebook */}
          <div className={styles.socialItem}>
            <div className={`${styles.formGrid} ${styles.formGrid2}`}>
              <label className={styles.formLabel}>
                <span className={styles.labelText}>Facebook Name</span>
                <input
                  type="text"
                  value={profile.social.facebook.name || ''}
                  onChange={(e) => updateField('social.facebook.name', e.target.value)}
                  className={styles.formInput}
                  placeholder="Your Page (optional)"
                />
              </label>
              <label className={styles.formLabel}>
                <span className={styles.labelText}>Facebook URL</span>
                <input
                  type="url"
                  value={profile.social.facebook.url}
                  onChange={(e) => updateField('social.facebook.url', e.target.value)}
                  className={styles.formInput}
                  placeholder="https://facebook.com/yourpage (optional)"
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Change Password */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Change Password</h2>
          <p>Update your admin password.</p>
        </div>

        <div className={`${styles.formGrid} ${styles.formGrid3}`}>
          <label className={styles.formLabel}>
            <span className={styles.labelText}>Current Password</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={styles.formInput}
            />
          </label>
          <label className={styles.formLabel}>
            <span className={styles.labelText}>New Password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={styles.formInput}
            />
          </label>
          <label className={styles.formLabel}>
            <span className={styles.labelText}>Confirm New Password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.formInput}
            />
          </label>
        </div>

        {passwordStatus && (
          <p className={`${styles.passwordStatus} ${passwordStatus.includes('successfully') ? styles.passwordStatusSuccess : ''}`}>
            {passwordStatus}
          </p>
        )}

        <button
          type="button"
          onClick={handlePasswordChange}
          disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
          className={styles.passwordButton}
        >
          {isChangingPassword ? 'Changing...' : 'Change Password'}
        </button>
      </section>
    </div>
  );
}
