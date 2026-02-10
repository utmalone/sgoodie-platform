'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
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

type MobileSheetKey = 'menu' | 'actions' | null;

function MobileMenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M3 5h12M3 9h12M3 13h12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MobileActionsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="9" r="1.4" />
      <circle cx="9" cy="9" r="1.4" />
      <circle cx="13" cy="9" r="1.4" />
    </svg>
  );
}

function SheetArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6 3l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ActionIcon({ children }: { children: React.ReactNode }) {
  return <span className={styles.mobileSheetIcon}>{children}</span>;
}

function AdminMobileChrome({
  pathname,
  previewPath
}: {
  pathname: string;
  previewPath: string;
}) {
  const router = useRouter();
  const { openPreview } = usePreview();
  const { isDirty, status, errorMessage, saveAll, clearStatus } = useSave();

  const [activeSheet, setActiveSheet] = useState<MobileSheetKey>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const isOpen = activeSheet !== null;
  const isMenuOpen = activeSheet === 'menu';
  const isActionsOpen = activeSheet === 'actions';

  useEffect(() => {
    if (!isOpen) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveSheet(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();
  }, [isOpen]);

  const navLinks = [
    { href: '/admin/profile', label: 'Profile' },
    { href: '/admin/dashboard', label: 'Dashboard' },
    { href: '/admin/pages', label: 'Pages' },
    { href: '/admin/portfolio', label: 'Portfolio' },
    { href: '/admin/journal', label: 'Journal' },
    { href: '/admin/photos', label: 'Photos' }
  ];

  const isNavActive = (href: string) => {
    if (href === '/admin/dashboard') {
      return pathname === '/admin/dashboard' || pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  const closeSheet = () => {
    setActiveSheet(null);
    if (status === 'error' || status === 'success') clearStatus();
  };

  const toggleMenu = () => setActiveSheet((current) => (current === 'menu' ? null : 'menu'));
  const toggleActions = () =>
    setActiveSheet((current) => (current === 'actions' ? null : 'actions'));

  const openPreviewTab = () => {
    const sep = previewPath.includes('?') ? '&' : '?';
    window.open(
      `${previewPath}${sep}preview=draft`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={toggleMenu}
        className={`${styles.mobileFab} ${styles.mobileFabLeft} ${isMenuOpen ? styles.mobileFabActive : ''}`}
        aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isMenuOpen}
        aria-controls="admin-mobile-sheet"
      >
        <MobileMenuIcon />
      </button>
      <button
        type="button"
        onClick={toggleActions}
        className={`${styles.mobileFab} ${styles.mobileFabRight} ${isActionsOpen ? styles.mobileFabActive : ''}`}
        aria-label={isActionsOpen ? 'Close actions' : 'Open actions'}
        aria-expanded={isActionsOpen}
        aria-controls="admin-mobile-sheet"
      >
        <MobileActionsIcon />
      </button>

      {isOpen && (
        <div className={styles.mobileOverlay} onClick={closeSheet} role="presentation">
          <div
            id="admin-mobile-sheet"
            className={styles.mobileSheet}
            role="dialog"
            aria-modal="true"
            aria-label={isMenuOpen ? 'Admin menu' : 'Admin actions'}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.mobileSheetHeader}>
              <p className={styles.mobileSheetTitle}>
                {isMenuOpen ? 'Menu' : 'Actions'}
              </p>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeSheet}
                className={styles.mobileSheetClose}
              >
                Close
              </button>
            </div>

            {isMenuOpen ? (
              <div className={styles.mobileSheetList}>
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`${styles.mobileSheetLink} ${isNavActive(link.href) ? styles.mobileSheetLinkActive : ''}`}
                    onClick={closeSheet}
                  >
                    <span>{link.label}</span>
                    <SheetArrow />
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.mobileSheetList}>
                <div className={styles.mobileSheetCard}>
                  <div className={styles.mobileSheetCardHeader}>
                    <p className={styles.mobileSheetCardTitle}>Save</p>
                    {isDirty && status !== 'saving' && (
                      <span className={styles.mobileDirtyDot} aria-label="Unsaved changes" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void saveAll()}
                    disabled={!isDirty || status === 'saving'}
                    className={`${styles.mobilePrimaryAction} ${(!isDirty || status === 'saving') ? styles.mobilePrimaryActionDisabled : ''}`}
                  >
                    {status === 'saving' ? 'Saving…' : 'Save All'}
                  </button>
                  {status === 'success' && (
                    <p className={styles.mobileSheetHint}>All changes saved</p>
                  )}
                  {status === 'error' && (
                    <p className={styles.mobileSheetHintError}>
                      {errorMessage || 'Save failed'}
                    </p>
                  )}
                </div>

                <div className={styles.mobileSheetCard}>
                  <p className={styles.mobileSheetCardTitle}>Preview</p>
                  <button
                    type="button"
                    onClick={() => {
                      closeSheet();
                      openPreview(previewPath);
                    }}
                    className={styles.mobileActionRow}
                  >
                    <span className={styles.mobileActionRowLeft}>
                      <ActionIcon>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
                          <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      </ActionIcon>
                      <span>Preview Site</span>
                    </span>
                    <SheetArrow />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeSheet();
                      openPreviewTab();
                    }}
                    className={styles.mobileActionRow}
                  >
                    <span className={styles.mobileActionRowLeft}>
                      <ActionIcon>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path
                            d="M6.5 3H3.5A1.5 1.5 0 002 4.5v8A1.5 1.5 0 003.5 14h8A1.5 1.5 0 0013 12.5v-3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M9 2h5v5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M14 2L7.5 8.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </ActionIcon>
                      <span>Preview Tab</span>
                    </span>
                    <SheetArrow />
                  </button>
                </div>

                <div className={styles.mobileSheetCard}>
                  <p className={styles.mobileSheetCardTitle}>Account</p>
                  <button
                    type="button"
                    onClick={() => {
                      closeSheet();
                      router.push('/');
                    }}
                    className={styles.mobileActionRow}
                  >
                    <span className={styles.mobileActionRowLeft}>
                      <ActionIcon>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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
                      </ActionIcon>
                      <span>Public Home</span>
                    </span>
                    <SheetArrow />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeSheet();
                      signOut({ callbackUrl: '/' });
                    }}
                    className={`${styles.mobileActionRow} ${styles.mobileActionRowDanger}`}
                  >
                    <span className={styles.mobileActionRowLeft}>
                      <ActionIcon>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path
                            d="M6 14H4a2 2 0 01-2-2V4a2 2 0 012-2h2"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                          <path
                            d="M11 11l3-3-3-3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M14 8H6"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </ActionIcon>
                      <span>Log out</span>
                    </span>
                    <SheetArrow />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

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
  const { isDirty, status, saveAll } = useSave();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);

  const isDirtyRef = useRef(isDirty);
  const statusRef = useRef(status);
  const saveAllRef = useRef(saveAll);
  const autoSavePromiseRef = useRef<Promise<void> | null>(null);
  const isSigningOutRef = useRef(false);

  useEffect(() => {
    isDirtyRef.current = isDirty;
    statusRef.current = status;
    saveAllRef.current = saveAll;
  }, [isDirty, status, saveAll]);

  const attemptAutoSave = useCallback(async (
    reason: 'warning' | 'timeout',
    options?: { waitIfSaving?: boolean }
  ) => {
    if (isSigningOutRef.current) return;

    const waitIfSaving = options?.waitIfSaving ?? false;

    if (statusRef.current === 'saving') {
      if (waitIfSaving) {
        const started = Date.now();
        while (statusRef.current === 'saving' && Date.now() - started < 20_000) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      } else {
        return;
      }
    }

    if (statusRef.current === 'saving') return;
    if (!isDirtyRef.current) return;

    if (!autoSavePromiseRef.current) {
      autoSavePromiseRef.current = (async () => {
        try {
          await saveAllRef.current();
        } catch (err) {
          console.error(`Auto-save failed (${reason}):`, err);
        }
      })().finally(() => {
        autoSavePromiseRef.current = null;
      });
    }

    await autoSavePromiseRef.current;
  }, []);

  const resetTimeout = useCallback(() => {
    // Clear existing timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    // Set warning timeout
    warningRef.current = setTimeout(() => {
      console.log('Session will expire in 2 minutes due to inactivity');
      void attemptAutoSave('warning');
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE_TIMEOUT);

    // Set logout timeout
    timeoutRef.current = setTimeout(() => {
      void (async () => {
        if (isSigningOutRef.current) return;
        isSigningOutRef.current = true;

        console.log('Session expired due to inactivity');

        try {
          // Best-effort save before signing out. Do not block forever.
          await Promise.race([
            attemptAutoSave('timeout', { waitIfSaving: true }),
            new Promise<void>((resolve) => setTimeout(resolve, 20_000))
          ]);
        } finally {
          signOut({ callbackUrl: '/admin/login?reason=timeout' });
        }
      })();
    }, INACTIVITY_TIMEOUT);
  }, [attemptAutoSave]);

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

  const previewPath = getPreviewPath();

  return (
    <>
      <div className={styles.shell} style={isOpen ? { display: 'none' } : undefined}>
        <AdminMobileChrome key={`${isOpen}-${pathname}`} pathname={pathname} previewPath={previewPath} />
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
              onClick={() => openPreview(previewPath)}
              className={styles.previewBtn}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span>Preview Site</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const sep = previewPath.includes('?') ? '&' : '?';
                window.open(`${previewPath}${sep}preview=draft`, '_blank', 'noopener,noreferrer');
              }}
              className={styles.previewBtn}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6.5 3H3.5A1.5 1.5 0 002 4.5v8A1.5 1.5 0 003.5 14h8A1.5 1.5 0 0013 12.5v-3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 2h5v5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 2L7.5 8.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Preview Tab</span>
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
            <button type="button" onClick={() => signOut({ callbackUrl: '/' })} className={styles.logoutBtn}>
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
