import { EncounterSpec } from '@ai-encounters/core';
import styles from './EncounterDisplay.module.css';

interface EncounterDisplayProps {
  encounter: EncounterSpec;
}

export default function EncounterDisplay({ encounter }: EncounterDisplayProps) {
  const difficultyColors = {
    easy: '#4ade80',
    medium: '#fbbf24',
    hard: '#f87171',
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{encounter.title}</h1>
        <div className={styles.meta}>
          <span 
            className={styles.difficulty}
            style={{ color: difficultyColors[encounter.difficulty] }}
          >
            {encounter.difficulty.toUpperCase()}
          </span>
          <span className={styles.duration}>
            ~{encounter.estimatedDuration} min
          </span>
        </div>
      </div>
      <p className={styles.description}>{encounter.description}</p>
    </div>
  );
}
