'use client';

import { useEffect, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { AdminNav } from './AdminNav';
import { AdminPreviewModal } from './AdminPreviewModal';
import { PreviewProvider, usePreview } from '@/lib/admin/preview-context';
import { SaveProvider, useSave } from '@/lib/admin/save-context';
import styles from '@/styles/admin/AdminShared.module.css';

// Inactivity timeout: 25 minutes (slightly less than session timeout for buffer)
const INACTIVITY_TIMEOUT = 25 * 60 * 1000; // 25 minutes in milliseconds
const WARNING_BEFORE_TIMEOUT = 2 * 60 * 1000; // Show warning 2 minutes before

const previewPathMap: Record<string, string> = {
  '/admin/profile': '/',
  '/admin/dashboard': '/',
  '/admin/pages': '/',
  '/admin/portfolio': '/portfolio/hotels',
  '/admin/journal': '/journal',
  '/admin/photos': '/'
};

function MasterSaveButton() {
  const { isDirty, status, errorMessage, saveAll, clearStatus } = useSave();

  const buttonClass = [
    styles.saveBtn,
    !isDirty && styles.saveBtnDisabled,
    status === 'saving' && styles.saveBtnSaving
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.saveStatusContainer}>
      <button
        type="button"
        onClick={saveAll}
        disabled={!isDirty || status === 'saving'}
        className={buttonClass}
      >
        {status === 'saving' ? (
          <>
            <svg className={styles.iconSpin} width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>Saving...</span>
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M13 14H3a1 1 0 01-1-1V3a1 1 0 011-1h8l3 3v9a1 1 0 01-1 1z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M11 14v-4H5v4M5 2v3h5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Save All</span>
          </>
        )}
      </button>

      {status === 'success' && (
        <div className={styles.statusSuccess}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M4 7l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>All changes saved</span>
        </div>
      )}

      {status === 'error' && (
        <div className={styles.statusError}>
          <div className={styles.statusErrorText}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M7 4v3M7 9v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span>{errorMessage || 'Save failed'}</span>
          </div>
          <button type="button" onClick={clearStatus} className={styles.statusDismiss}>
            Dismiss
          </button>
        </div>
      )}

      {isDirty && status === 'idle' && (
        <p className={styles.statusUnsaved}>Unsaved changes</p>
      )}
    </div>
  );
}

function useInactivityTimeout() {
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimeout = useCallback(() => {
    // Clear existing timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    // Set warning timeout
    warningRef.current = setTimeout(() => {
      // Could show a warning modal here
      console.log('Session will expire in 2 minutes due to inactivity');
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE_TIMEOUT);

    // Set logout timeout
    timeoutRef.current = setTimeout(() => {
      console.log('Session expired due to inactivity');
      signOut({ callbackUrl: '/admin/login?reason=timeout' });
    }, INACTIVITY_TIMEOUT);
  }, []);

  useEffect(() => {
    // Activity events to track
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click'
    ];

    // Reset timeout on activity
    const handleActivity = () => resetTimeout();

    // Add event listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Initial timeout setup
    resetTimeout();

    // Cleanup
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [resetTimeout]);
}

function AdminShellInner({ children }: { children: React.ReactNode }) {
  const { isOpen, initialPath, refreshKey, openPreview, closePreview } = usePreview();
  const pathname = usePathname();
  const router = useRouter();

  // Inactivity timeout hook
  useInactivityTimeout();

  function getPreviewPath() {
    for (const [adminPath, publicPath] of Object.entries(previewPathMap)) {
      if (pathname.startsWith(adminPath)) {
        return publicPath;
      }
    }
    return '/';
  }

  function handleLogout() {
    signOut({ callbackUrl: '/' });
  }

  return (
    <>
      <div className={styles.shell} style={isOpen ? { display: 'none' } : undefined}>
        <aside className={styles.sidebar}>
          <div>
            <h2 className={styles.sidebarTitle}>Admin</h2>
            <p className={styles.sidebarSubtitle}>S.Goodie</p>
            <div className={styles.sidebarNav}>
              <AdminNav />
            </div>
          </div>
          
          <div className={styles.sidebarFooter}>
            {/* Preview Button */}
            <button
              type="button"
              onClick={() => openPreview(getPreviewPath())}
              className={styles.previewBtn}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span>Preview Site</span>
            </button>

            {/* Master Save Button */}
            <MasterSaveButton />

            {/* Divider */}
            <div className={styles.divider} />

            {/* Public Site Button */}
            <button
              type="button"
              onClick={() => router.push('/')}
              className={styles.previewBtn}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 2.5a5.5 5.5 0 1 1-5.5 5.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M2.5 8H8V2.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Public Home</span>
            </button>

            {/* Logout Button */}
            <button type="button" onClick={handleLogout} className={styles.logoutBtn}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M5 12H3a1 1 0 01-1-1V3a1 1 0 011-1h2M9.5 10l3-3-3-3M12.5 7H5"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Log out</span>
            </button>
          </div>
        </aside>
        <main className={styles.mainContent}>{children}</main>
      </div>
      <AdminPreviewModal
        isOpen={isOpen}
        onClose={closePreview}
        initialPath={initialPath}
        refreshKey={refreshKey}
      />
    </>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <PreviewProvider>
      <SaveProvider>
        <AdminShellInner>{children}</AdminShellInner>
      </SaveProvider>
    </PreviewProvider>
  );
}
