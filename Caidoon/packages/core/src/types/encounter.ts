export interface EncounterSpec {
  id: string;
  title: string;
  description: string;
  objectives: Objective[];
  npcs: NPC[];
  rewards: Reward[];
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedDuration: number; // minutes
}

export interface Objective {
  id: string;
  description: string;
  type: 'collect' | 'eliminate' | 'interact' | 'reach';
  target?: string;
  quantity?: number;
  completed: boolean;
}

export interface NPC {
  id: string;
  name: string;
  role: string;
  dialogue: DialogueLine[];
}

export interface DialogueLine {
  trigger: string;
  text: string;
}

export interface Reward {
  type: 'currency' | 'item' | 'experience';
  amount: number;
  itemId?: string;
}
