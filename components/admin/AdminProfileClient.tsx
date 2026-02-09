'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { SiteProfile, PhotoAsset } from '@/types';
import { useSave } from '@/lib/admin/save-context';
import { usePreview } from '@/lib/admin/preview-context';
import { saveDraftProfile, clearDraftProfile } from '@/lib/admin/draft-profile-store';
import { FieldInfoTooltip } from './FieldInfoTooltip';
import styles from '@/styles/admin/AdminProfile.module.css';

const profileFieldHelp = {
  name: [
    'Brand name shown in the site header (logo) and elsewhere.',
    'Example: S.Goodie'
  ],
  title: [
    'Your role or tagline shown under your name.',
    'Example: Creative Direction + Photography.'
  ],
  photo: [
    'Headshot or brand image used on About and Contact.'
  ],
  email: [
    'Public contact email address.',
    'Example: hello@sgoodie.com.'
  ],
  phone: [
    'Public contact phone number.',
    'Example: (202) 555-0123.'
  ],
  street: [
    'Optional street address for footer and contact.',
    'Example: 123 Main St.'
  ],
  city: [
    'City shown with your address.',
    'Example: Washington.'
  ],
  state: [
    'State or region abbreviation.',
    'Example: DC.'
  ],
  regions: [
    'Areas you serve, separated by commas.',
    'Example: DC, MD, VA.'
  ],
  availability: [
    'Short availability message.',
    'Example: Booking Spring 2026.'
  ],
  instagramHandle: [
    'Your handle, usually starts with @.',
    'Example: @sgoodiestudio.'
  ],
  instagramUrl: [
    'Full link to your Instagram profile.',
    'Example: https://instagram.com/sgoodiestudio.'
  ],
  linkedinName: [
    'Display name for the LinkedIn link.',
    'Example: S.Goodie Studio.'
  ],
  linkedinUrl: [
    'Full LinkedIn profile or company URL.',
    'Example: https://linkedin.com/company/sgoodie.'
  ],
  twitterHandle: [
    'Optional handle.',
    'Example: @sgoodie.'
  ],
  twitterUrl: [
    'Optional profile URL.',
    'Example: https://x.com/sgoodie.'
  ],
  facebookName: [
    'Display name for your Facebook page.',
    'Example: S.Goodie Studio.'
  ],
  facebookUrl: [
    'Full Facebook page URL.',
    'Example: https://facebook.com/sgoodiestudio.'
  ],
  currentPassword: [
    'Your existing admin password.'
  ],
  newPassword: [
    'Choose a new password (8+ characters).'
  ],
  confirmPassword: [
    'Re-enter the new password to confirm.'
  ],
  heroTitleColor: [
    'Color of hero titles across all pages (Home, About, Contact, Journal, Portfolio).'
  ],
  heroSubtitleColor: [
    'Color of hero subtitles across all pages. Slightly dimmer than the title by default.'
  ]
};

export function AdminProfileClient() {
  const router = useRouter();
  const { registerChange, unregisterChange } = useSave();
  const { refreshPreview } = usePreview();
  const [profile, setProfile] = useState<SiteProfile | null>(null);
  const [savedProfile, setSavedProfile] = useState<SiteProfile | null>(null);
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  const saveProfile = useCallback(async (): Promise<boolean> => {
    if (!profile) return false;

    if (profile.email && !profile.email.includes('@')) {
      setEmailError('Email must include an "@" symbol.');
      return false;
    }
    
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
        clearDraftProfile();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [profile, refreshPreview]);

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

  useEffect(() => {
    if (!profile || isLoading) return;
    saveDraftProfile({ name: profile.name });
  }, [profile, isLoading]);

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
      </div>

      {/* Basic Info */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Basic Information</h2>
          <p>Your name and title as shown on the site.</p>
        </div>

        <div className={`${styles.formGrid} ${styles.formGrid2}`}>
          <label className={styles.formLabel}>
            <span className={styles.labelText}>
              Name
              <FieldInfoTooltip label="Name" lines={profileFieldHelp.name} />
            </span>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => updateField('name', e.target.value)}
              className={styles.formInput}
            />
          </label>
          <label className={styles.formLabel}>
            <span className={styles.labelText}>
              Title
              <FieldInfoTooltip label="Title" lines={profileFieldHelp.title} />
            </span>
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
          <span className={styles.labelText}>
            Profile Photo
            <FieldInfoTooltip label="Profile Photo" lines={profileFieldHelp.photo} />
          </span>
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

      {/* Hero Colors */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Hero Colors</h2>
          <p>Default font colors for all hero titles and subtitles. Individual pages can override these with their own colors.</p>
        </div>
        <div className={`${styles.formGrid} ${styles.formGrid2}`}>
          <label className={styles.formLabel}>
            <span className={styles.labelText}>
              Hero Title Color
              <FieldInfoTooltip label="Hero Title Color" lines={profileFieldHelp.heroTitleColor} />
            </span>
            <div className={styles.colorPickerRow}>
              <input
                type="color"
                value={profile.heroTitleColor || '#ffffff'}
                onChange={(e) => updateField('heroTitleColor', e.target.value)}
                className={styles.colorPicker}
                aria-label="Hero title color"
              />
              <input
                type="text"
                value={profile.heroTitleColor || '#ffffff'}
                onChange={(e) => updateField('heroTitleColor', e.target.value)}
                className={styles.colorHexInput}
                placeholder="#ffffff"
              />
            </div>
          </label>
          <label className={styles.formLabel}>
            <span className={styles.labelText}>
              Hero Subtitle Color
              <FieldInfoTooltip label="Hero Subtitle Color" lines={profileFieldHelp.heroSubtitleColor} />
            </span>
            <div className={styles.colorPickerRow}>
              <input
                type="color"
                value={
                  profile.heroSubtitleColor?.startsWith('#')
                    ? profile.heroSubtitleColor
                    : '#e6e6e6'
                }
                onChange={(e) => updateField('heroSubtitleColor', e.target.value)}
                className={styles.colorPicker}
                aria-label="Hero subtitle color"
              />
              <input
                type="text"
                value={profile.heroSubtitleColor || ''}
                onChange={(e) => updateField('heroSubtitleColor', e.target.value)}
                className={styles.colorHexInput}
                placeholder="#e6e6e6 (leave empty for default)"
              />
            </div>
          </label>
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
            <span className={styles.labelText}>
              Email
              <FieldInfoTooltip label="Email" lines={profileFieldHelp.email} />
            </span>
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
            <span className={styles.labelText}>
              Phone
              <FieldInfoTooltip label="Phone" lines={profileFieldHelp.phone} />
            </span>
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
            <span className={styles.labelText}>
              Street Address
              <FieldInfoTooltip label="Street Address" lines={profileFieldHelp.street} />
            </span>
            <input
              type="text"
              value={profile.address.street}
              onChange={(e) => updateField('address.street', e.target.value)}
              className={styles.formInput}
              placeholder="Optional"
            />
          </label>
          <label className={styles.formLabel}>
            <span className={styles.labelText}>
              City
              <FieldInfoTooltip label="City" lines={profileFieldHelp.city} />
            </span>
            <input
              type="text"
              value={profile.address.city}
              onChange={(e) => updateField('address.city', e.target.value)}
              className={styles.formInput}
            />
          </label>
          <label className={styles.formLabel}>
            <span className={styles.labelText}>
              State
              <FieldInfoTooltip label="State" lines={profileFieldHelp.state} />
            </span>
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
            <span className={styles.labelText}>
              Regions (comma-separated)
              <FieldInfoTooltip label="Regions" lines={profileFieldHelp.regions} />
            </span>
            <input
              type="text"
              value={profile.availability.regions.join(', ')}
              onChange={(e) => updateField('availability.regions', e.target.value.split(',').map(s => s.trim()))}
              className={styles.formInput}
              placeholder="DC, MD, VA"
            />
          </label>
          <label className={styles.formLabel}>
            <span className={styles.labelText}>
              Availability Note
              <FieldInfoTooltip label="Availability Note" lines={profileFieldHelp.availability} />
            </span>
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
                <span className={styles.labelText}>
                  Instagram Handle
                  <FieldInfoTooltip label="Instagram Handle" lines={profileFieldHelp.instagramHandle} />
                </span>
                <input
                  type="text"
                  value={profile.social.instagram.handle || ''}
                  onChange={(e) => updateField('social.instagram.handle', e.target.value)}
                  className={styles.formInput}
                  placeholder="@yourhandle"
                />
              </label>
              <label className={styles.formLabel}>
                <span className={styles.labelText}>
                  Instagram URL
                  <FieldInfoTooltip label="Instagram URL" lines={profileFieldHelp.instagramUrl} />
                </span>
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
                <span className={styles.labelText}>
                  LinkedIn Name
                  <FieldInfoTooltip label="LinkedIn Name" lines={profileFieldHelp.linkedinName} />
                </span>
                <input
                  type="text"
                  value={profile.social.linkedin.name || ''}
                  onChange={(e) => updateField('social.linkedin.name', e.target.value)}
                  className={styles.formInput}
                  placeholder="Your Company"
                />
              </label>
              <label className={styles.formLabel}>
                <span className={styles.labelText}>
                  LinkedIn URL
                  <FieldInfoTooltip label="LinkedIn URL" lines={profileFieldHelp.linkedinUrl} />
                </span>
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
                <span className={styles.labelText}>
                  Twitter/X Handle
                  <FieldInfoTooltip label="Twitter/X Handle" lines={profileFieldHelp.twitterHandle} />
                </span>
                <input
                  type="text"
                  value={profile.social.twitter.handle || ''}
                  onChange={(e) => updateField('social.twitter.handle', e.target.value)}
                  className={styles.formInput}
                  placeholder="@yourhandle (optional)"
                />
              </label>
              <label className={styles.formLabel}>
                <span className={styles.labelText}>
                  Twitter/X URL
                  <FieldInfoTooltip label="Twitter/X URL" lines={profileFieldHelp.twitterUrl} />
                </span>
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
                <span className={styles.labelText}>
                  Facebook Name
                  <FieldInfoTooltip label="Facebook Name" lines={profileFieldHelp.facebookName} />
                </span>
                <input
                  type="text"
                  value={profile.social.facebook.name || ''}
                  onChange={(e) => updateField('social.facebook.name', e.target.value)}
                  className={styles.formInput}
                  placeholder="Your Page (optional)"
                />
              </label>
              <label className={styles.formLabel}>
                <span className={styles.labelText}>
                  Facebook URL
                  <FieldInfoTooltip label="Facebook URL" lines={profileFieldHelp.facebookUrl} />
                </span>
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
            <span className={styles.labelText}>
              Current Password
              <FieldInfoTooltip label="Current Password" lines={profileFieldHelp.currentPassword} />
            </span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={styles.formInput}
            />
          </label>
          <label className={styles.formLabel}>
            <span className={styles.labelText}>
              New Password
              <FieldInfoTooltip label="New Password" lines={profileFieldHelp.newPassword} />
            </span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={styles.formInput}
            />
          </label>
          <label className={styles.formLabel}>
            <span className={styles.labelText}>
              Confirm New Password
              <FieldInfoTooltip label="Confirm New Password" lines={profileFieldHelp.confirmPassword} />
            </span>
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
