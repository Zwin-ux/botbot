import { Reward } from '@ai-encounters/core';
import styles from './RewardsDisplay.module.css';

interface RewardsDisplayProps {
  rewards: Reward[];
}

export default function RewardsDisplay({ rewards }: RewardsDisplayProps) {
  const getRewardIcon = (type: Reward['type']) => {
    switch (type) {
      case 'currency': return '💰';
      case 'item': return '🎁';
      case 'experience': return '⭐';
      default: return '🏆';
    }
  };

  const getRewardLabel = (reward: Reward) => {
    switch (reward.type) {
      case 'currency':
        return `${reward.amount} Gold`;
      case 'item':
        return reward.itemId ? `${reward.itemId} (x${reward.amount})` : `Item x${reward.amount}`;
      case 'experience':
        return `${reward.amount} XP`;
      default:
        return `${reward.amount}`;
    }
  };

  if (rewards.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Rewards</h2>
      <div className={styles.rewardsList}>
        {rewards.map((reward, index) => (
          <div key={index} className={styles.reward}>
            <span className={styles.icon}>{getRewardIcon(reward.type)}</span>
            <div className={styles.details}>
              <div className={styles.label}>{getRewardLabel(reward)}</div>
              <div className={styles.type}>{reward.type}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
