'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function Home() {
  const [playerId, setPlayerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!playerId.trim()) {
      setError('Please enter a player ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const engineUrl = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://localhost:8786';
      const response = await fetch(`${engineUrl}/session/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerId: playerId.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Failed to start session' } }));
        throw new Error(errorData.error?.message || 'Failed to start session');
      }

      const session = await response.json();
      router.push(`/session/${session.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>AI Encounters</h1>
        <p className={styles.subtitle}>Start your dynamic AI-powered adventure</p>

        <form onSubmit={handleStartSession} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="playerId" className={styles.label}>
              Player ID
            </label>
            <input
              id="playerId"
              type="text"
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              placeholder="Enter your player ID"
              className={styles.input}
              disabled={loading}
            />
          </div>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className={styles.button}
            disabled={loading}
          >
            {loading ? 'Starting...' : 'Start Encounter'}
          </button>
        </form>

        <div className={styles.info}>
          <p>Enter any player ID to generate a unique encounter tailored for you.</p>
        </div>
      </div>
    </main>
  );
}
