'use client';

import { Objective } from '@ai-encounters/core';
import styles from './ObjectiveList.module.css';

interface ObjectiveListProps {
  objectives: Objective[];
  onObjectiveComplete?: (objectiveId: string) => void;
}

export default function ObjectiveList({ objectives, onObjectiveComplete }: ObjectiveListProps) {
  const getObjectiveIcon = (type: Objective['type']) => {
    switch (type) {
      case 'collect': return '📦';
      case 'eliminate': return '⚔️';
      case 'interact': return '💬';
      case 'reach': return '📍';
      default: return '✓';
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Objectives</h2>
      <div className={styles.list}>
        {objectives.map((objective) => (
          <div 
            key={objective.id} 
            className={`${styles.objective} ${objective.completed ? styles.completed : ''}`}
          >
            <div className={styles.checkbox}>
              {objective.completed ? '✓' : '○'}
            </div>
            <div className={styles.content}>
              <div className={styles.header}>
                <span className={styles.icon}>{getObjectiveIcon(objective.type)}</span>
                <span className={styles.description}>{objective.description}</span>
              </div>
              {objective.target && (
                <div className={styles.details}>
                  Target: {objective.target}
                  {objective.quantity && ` (${objective.quantity})`}
                </div>
              )}
            </div>
            {!objective.completed && onObjectiveComplete && (
              <button 
                className={styles.completeBtn}
                onClick={() => onObjectiveComplete(objective.id)}
              >
                Complete
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
