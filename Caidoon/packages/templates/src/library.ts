import { EncounterTemplate } from './types.js';

/**
 * Library of pre-built encounter templates
 */
export const TEMPLATE_LIBRARY: Record<string, EncounterTemplate> = {
  'combat-ambush': {
    id: 'combat-ambush',
    name: 'Ambush Encounter',
    category: 'combat',
    description: 'A surprise attack by enemies requiring quick tactical response',
    difficulty: 'medium',
    estimatedDuration: 15,
    structure: {
      title: 'Ambush!',
      description: 'You are suddenly ambushed by {{enemy_type}}!',
      objectives: [
        {
          id: 'obj_defeat_enemies',
          description: 'Defeat all {{enemy_count}} {{enemy_type}}',
          type: 'eliminate',
          target: '{{enemy_type}}',
          quantity: '{{enemy_count}}' as any,
          completed: false
        },
        {
          id: 'obj_survive',
          description: 'Survive the ambush',
          type: 'interact',
          completed: false
        }
      ],
      npcs: [],
      rewards: [
        {
          type: 'experience',
          amount: '{{xp_reward}}' as any
        },
        {
          type: 'currency',
          amount: '{{gold_reward}}' as any
        }
      ],
      difficulty: 'medium',
      estimatedDuration: 15
    },
    customizableFields: ['enemy_type', 'enemy_count', 'xp_reward', 'gold_reward'],
    requiredFields: ['enemy_type', 'enemy_count'],
    tags: ['combat', 'action', 'quick', 'tactical']
  },

  'puzzle-riddle': {
    id: 'puzzle-riddle',
    name: 'Riddle Challenge',
    category: 'puzzle',
    description: 'A mental challenge requiring logic and problem-solving',
    difficulty: 'medium',
    estimatedDuration: 20,
    structure: {
      title: '{{puzzle_title}}',
      description: 'A mysterious {{puzzle_object}} blocks your path, presenting a riddle.',
      objectives: [
        {
          id: 'obj_solve_riddle',
          description: 'Solve the riddle: {{riddle_text}}',
          type: 'interact',
          target: '{{puzzle_object}}',
          completed: false
        },
        {
          id: 'obj_find_clues',
          description: 'Find {{clue_count}} clues to help solve the puzzle',
          type: 'collect',
          target: 'clue',
          quantity: '{{clue_count}}' as any,
          completed: false
        }
      ],
      npcs: [
        {
          id: 'npc_riddler',
          name: '{{riddler_name}}',
          role: 'Puzzle Master',
          dialogue: [
            {
              trigger: 'greeting',
              text: 'Welcome, traveler. Can you solve my riddle?'
            },
            {
              trigger: 'hint',
              text: '{{hint_text}}'
            }
          ]
        }
      ],
      rewards: [
        {
          type: 'experience',
          amount: '{{xp_reward}}' as any
        },
        {
          type: 'item',
          amount: 1,
          itemId: '{{reward_item}}'
        }
      ],
      difficulty: 'medium',
      estimatedDuration: 20
    },
    customizableFields: [
      'puzzle_title',
      'puzzle_object',
      'riddle_text',
      'clue_count',
      'riddler_name',
      'hint_text',
      'xp_reward',
      'reward_item'
    ],
    requiredFields: ['puzzle_title', 'puzzle_object', 'riddle_text', 'riddler_name'],
    tags: ['puzzle', 'mental', 'riddle', 'logic']
  },

  'social-negotiation': {
    id: 'social-negotiation',
    name: 'Negotiation Encounter',
    category: 'social',
    description: 'A diplomatic challenge requiring persuasion and social skills',
    difficulty: 'medium',
    estimatedDuration: 25,
    structure: {
      title: 'Negotiation with {{npc_name}}',
      description: 'You must negotiate with {{npc_name}} to {{negotiation_goal}}.',
      objectives: [
        {
          id: 'obj_persuade',
          description: 'Persuade {{npc_name}} to agree to your terms',
          type: 'interact',
          target: '{{npc_name}}',
          completed: false
        },
        {
          id: 'obj_gather_info',
          description: 'Gather {{info_count}} pieces of information about {{npc_name}}',
          type: 'collect',
          target: 'information',
          quantity: '{{info_count}}' as any,
          completed: false
        }
      ],
      npcs: [
        {
          id: 'npc_negotiator',
          name: '{{npc_name}}',
          role: '{{npc_role}}',
          dialogue: [
            {
              trigger: 'greeting',
              text: '{{greeting_text}}'
            },
            {
              trigger: 'negotiation',
              text: '{{negotiation_text}}'
            },
            {
              trigger: 'agreement',
              text: 'Very well, we have a deal.'
            },
            {
              trigger: 'refusal',
              text: 'I cannot agree to those terms.'
            }
          ]
        }
      ],
      rewards: [
        {
          type: 'experience',
          amount: '{{xp_reward}}' as any
        },
        {
          type: 'currency',
          amount: '{{gold_reward}}' as any
        }
      ],
      difficulty: 'medium',
      estimatedDuration: 25
    },
    customizableFields: [
      'npc_name',
      'npc_role',
      'negotiation_goal',
      'info_count',
      'greeting_text',
      'negotiation_text',
      'xp_reward',
      'gold_reward'
    ],
    requiredFields: ['npc_name', 'npc_role', 'negotiation_goal'],
    tags: ['social', 'diplomacy', 'persuasion', 'dialogue']
  },

  'exploration-discovery': {
    id: 'exploration-discovery',
    name: 'Discovery Expedition',
    category: 'exploration',
    description: 'An exploration challenge to discover new locations and secrets',
    difficulty: 'easy',
    estimatedDuration: 30,
    structure: {
      title: 'Explore {{location_name}}',
      description: 'Venture into {{location_name}} and uncover its secrets.',
      objectives: [
        {
          id: 'obj_reach_location',
          description: 'Reach the {{destination}}',
          type: 'reach',
          target: '{{destination}}',
          completed: false
        },
        {
          id: 'obj_discover_secrets',
          description: 'Discover {{secret_count}} hidden secrets',
          type: 'collect',
          target: 'secret',
          quantity: '{{secret_count}}' as any,
          completed: false
        },
        {
          id: 'obj_map_area',
          description: 'Map {{area_count}} areas of {{location_name}}',
          type: 'interact',
          target: 'area',
          quantity: '{{area_count}}' as any,
          completed: false
        }
      ],
      npcs: [
        {
          id: 'npc_guide',
          name: '{{guide_name}}',
          role: 'Local Guide',
          dialogue: [
            {
              trigger: 'greeting',
              text: 'Welcome to {{location_name}}. Let me show you around.'
            },
            {
              trigger: 'warning',
              text: '{{warning_text}}'
            }
          ]
        }
      ],
      rewards: [
        {
          type: 'experience',
          amount: '{{xp_reward}}' as any
        },
        {
          type: 'item',
          amount: 1,
          itemId: '{{discovery_item}}'
        }
      ],
      difficulty: 'easy',
      estimatedDuration: 30
    },
    customizableFields: [
      'location_name',
      'destination',
      'secret_count',
      'area_count',
      'guide_name',
      'warning_text',
      'xp_reward',
      'discovery_item'
    ],
    requiredFields: ['location_name', 'destination'],
    tags: ['exploration', 'discovery', 'adventure', 'secrets']
  },

  'stealth-infiltration': {
    id: 'stealth-infiltration',
    name: 'Stealth Infiltration',
    category: 'stealth',
    description: 'A covert operation requiring stealth and careful planning',
    difficulty: 'hard',
    estimatedDuration: 35,
    structure: {
      title: 'Infiltrate {{target_location}}',
      description: 'Sneak into {{target_location}} without being detected to {{mission_goal}}.',
      objectives: [
        {
          id: 'obj_avoid_detection',
          description: 'Avoid detection by {{guard_count}} guards',
          type: 'interact',
          target: 'guard',
          quantity: '{{guard_count}}' as any,
          completed: false
        },
        {
          id: 'obj_reach_target',
          description: 'Reach the {{target_object}}',
          type: 'reach',
          target: '{{target_object}}',
          completed: false
        },
        {
          id: 'obj_complete_mission',
          description: '{{mission_goal}}',
          type: 'interact',
          target: '{{target_object}}',
          completed: false
        },
        {
          id: 'obj_escape',
          description: 'Escape {{target_location}} undetected',
          type: 'reach',
          target: 'exit',
          completed: false
        }
      ],
      npcs: [
        {
          id: 'npc_contact',
          name: '{{contact_name}}',
          role: 'Inside Contact',
          dialogue: [
            {
              trigger: 'briefing',
              text: '{{briefing_text}}'
            },
            {
              trigger: 'warning',
              text: 'Be careful, security is tight tonight.'
            }
          ]
        }
      ],
      rewards: [
        {
          type: 'experience',
          amount: '{{xp_reward}}' as any
        },
        {
          type: 'currency',
          amount: '{{gold_reward}}' as any
        },
        {
          type: 'item',
          amount: 1,
          itemId: '{{mission_item}}'
        }
      ],
      difficulty: 'hard',
      estimatedDuration: 35
    },
    customizableFields: [
      'target_location',
      'mission_goal',
      'guard_count',
      'target_object',
      'contact_name',
      'briefing_text',
      'xp_reward',
      'gold_reward',
      'mission_item'
    ],
    requiredFields: ['target_location', 'mission_goal', 'target_object'],
    tags: ['stealth', 'infiltration', 'covert', 'tactical', 'challenging']
  }
};

/**
 * Get all available templates
 */
export function getAllTemplates(): EncounterTemplate[] {
  return Object.values(TEMPLATE_LIBRARY);
}

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): EncounterTemplate | undefined {
  return TEMPLATE_LIBRARY[id];
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): EncounterTemplate[] {
  return getAllTemplates().filter(t => t.category === category);
}

/**
 * Get templates by difficulty
 */
export function getTemplatesByDifficulty(difficulty: string): EncounterTemplate[] {
  return getAllTemplates().filter(t => t.difficulty === difficulty);
}

/**
 * Search templates by tags
 */
export function searchTemplatesByTags(tags: string[]): EncounterTemplate[] {
  return getAllTemplates().filter(template =>
    tags.some(tag => template.tags.includes(tag))
  );
}
