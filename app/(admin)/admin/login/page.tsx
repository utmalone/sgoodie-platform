'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import styles from '@/styles/admin/AdminShared.module.css';

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const reason = searchParams.get('reason');
  const callbackUrl = searchParams.get('callbackUrl') || '/admin/dashboard';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        callbackUrl,
        email,
        password
      });

      if (result?.error) {
        setError('Invalid credentials. Please try again.');
        setIsLoading(false);
        return;
      }

      if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
        return;
      }

      setError('Unable to sign in. Please try again.');
      setIsLoading(false);
    } catch {
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.card}>
      <p className={styles.sidebarSubtitle}>Admin</p>
      <h1 className={styles.pageTitle}>Sign in</h1>

      {reason === 'timeout' && (
        <div className={styles.statusError}>
          <p className={styles.statusErrorText}>
            Your session expired due to inactivity. Please sign in again.
          </p>
        </div>
      )}

      <form className={styles.formGrid} onSubmit={handleSubmit}>
        <label className={styles.label}>
          <span className={styles.labelText}>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={styles.input}
            required
            autoComplete="email"
          />
        </label>
        <label className={styles.label}>
          <span className={styles.labelText}>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={styles.input}
            required
            autoComplete="current-password"
          />
        </label>
        {error && (
          <div className={styles.statusError}>
            <p className={styles.statusErrorText}>{error}</p>
          </div>
        )}
        <button type="submit" disabled={isLoading} className={styles.btnPrimary}>
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className={styles.card}><p>Loading...</p></div>}>
      <LoginForm />
    </Suspense>
  );
}
