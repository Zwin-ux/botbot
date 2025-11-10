'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Session } from '@ai-encounters/core';
import EncounterDisplay from '../../components/EncounterDisplay';
import ObjectiveList from '../../components/ObjectiveList';
import NPCDialogue from '../../components/NPCDialogue';
import RewardsDisplay from '../../components/RewardsDisplay';
import styles from './page.module.css';

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  const engineUrl = process.env.NEXT_PUBLIC_ENGINE_URL || 'http://localhost:8786';

  const fetchSession = async () => {
    try {
      const response = await fetch(`${engineUrl}/session/${sessionId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Session not found' } }));
        throw new Error(errorData.error?.message || 'Failed to load session');
      }

      const data = await response.json();
      setSession(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  const handleObjectiveComplete = async (objectiveId: string) => {
    if (!session) return;

    try {
      const response = await fetch(
        `${engineUrl}/session/${sessionId}/objective/${objectiveId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update objective');
      }

      const updatedSession = await response.json();
      setSession(updatedSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update objective');
    }
  };

  const handleCompleteSession = async () => {
    if (!session) return;

    setCompleting(true);
    try {
      const response = await fetch(`${engineUrl}/session/${sessionId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to complete session');
      }

      const completedSession = await response.json();
      setSession(completedSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete session');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <main className={styles.main}>
        <div className={styles.loading}>Loading encounter...</div>
      </main>
    );
  }

  if (error || !session) {
    return (
      <main className={styles.main}>
        <div className={styles.errorContainer}>
          <h1 className={styles.errorTitle}>Error</h1>
          <p className={styles.errorMessage}>{error || 'Session not found'}</p>
          <button 
            className={styles.backButton}
            onClick={() => router.push('/')}
          >
            Back to Home
          </button>
        </div>
      </main>
    );
  }

  const allObjectivesCompleted = session.encounter.objectives.every((obj: { completed: boolean }) => obj.completed);
  const isSessionCompleted = !!session.completedAt;

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.header}>
          <button 
            className={styles.backLink}
            onClick={() => router.push('/')}
          >
            ← Back
          </button>
          <div className={styles.sessionInfo}>
            <span className={styles.sessionId}>Session: {sessionId}</span>
            <span className={styles.playerId}>Player: {session.playerId}</span>
          </div>
        </div>

        {isSessionCompleted && (
          <div className={styles.completedBanner}>
            ✓ Encounter Completed!
          </div>
        )}

        <EncounterDisplay encounter={session.encounter} />
        
        <ObjectiveList 
          objectives={session.encounter.objectives}
          onObjectiveComplete={!isSessionCompleted ? handleObjectiveComplete : undefined}
        />

        <NPCDialogue npcs={session.encounter.npcs} />

        <RewardsDisplay rewards={session.encounter.rewards} />

        {!isSessionCompleted && allObjectivesCompleted && (
          <div className={styles.completeSection}>
            <p className={styles.completeMessage}>
              All objectives completed! Ready to finish this encounter?
            </p>
            <button 
              className={styles.completeButton}
              onClick={handleCompleteSession}
              disabled={completing}
            >
              {completing ? 'Completing...' : 'Complete Encounter'}
            </button>
          </div>
        )}

        {error && (
          <div className={styles.errorBanner}>
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
