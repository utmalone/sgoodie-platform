'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const result = await signIn('credentials', {
      redirect: true,
      callbackUrl: '/admin/dashboard',
      email,
      password
    });

    if (result?.error) {
      setError('Invalid credentials. Please try again.');
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
      <p className="text-xs uppercase tracking-[0.4em] text-black/50">Admin</p>
      <h1 className="mt-3 text-3xl font-semibold">Sign in</h1>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm">
          <span className="text-black/60">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-full border border-black/20 px-4 py-2"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-black/60">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-full border border-black/20 px-4 py-2"
            required
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-full border border-black/20 bg-black px-4 py-2 text-sm uppercase tracking-[0.2em] text-white hover:bg-black/80"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
