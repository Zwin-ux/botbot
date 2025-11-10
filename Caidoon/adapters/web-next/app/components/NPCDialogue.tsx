'use client';

import { NPC } from '@ai-encounters/core';
import { useState } from 'react';
import styles from './NPCDialogue.module.css';

interface NPCDialogueProps {
  npcs: NPC[];
}

export default function NPCDialogue({ npcs }: NPCDialogueProps) {
  const [selectedNPC, setSelectedNPC] = useState<string | null>(
    npcs.length > 0 ? npcs[0].id : null
  );

  const currentNPC = npcs.find(npc => npc.id === selectedNPC);

  if (npcs.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>NPCs</h2>
      
      <div className={styles.npcTabs}>
        {npcs.map((npc) => (
          <button
            key={npc.id}
            className={`${styles.npcTab} ${selectedNPC === npc.id ? styles.active : ''}`}
            onClick={() => setSelectedNPC(npc.id)}
          >
            <div className={styles.npcName}>{npc.name}</div>
            <div className={styles.npcRole}>{npc.role}</div>
          </button>
        ))}
      </div>

      {currentNPC && (
        <div className={styles.dialogueBox}>
          <div className={styles.dialogueHeader}>
            <span className={styles.dialogueNpcName}>{currentNPC.name}</span>
            <span className={styles.dialogueNpcRole}>({currentNPC.role})</span>
          </div>
          <div className={styles.dialogueList}>
            {currentNPC.dialogue.map((line: { trigger: string; text: string }, index: number) => (
              <div key={index} className={styles.dialogueLine}>
                <div className={styles.trigger}>{line.trigger}</div>
                <div className={styles.text}>"{line.text}"</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
