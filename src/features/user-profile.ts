import fs from 'fs/promises';
import path from 'path';
import { UserProfile } from '../core/types';

const PROFILE_PATH = process.env.USER_PROFILE_PATH || './data/profiles.json';

export class UserProfileManager {
    private cache: Map<string, UserProfile> = new Map();
    private initialized = false;

    private async ensureInit() {
        if (this.initialized) return;
        try {
            const dir = path.dirname(PROFILE_PATH);
            await fs.mkdir(dir, { recursive: true });
            const data = await fs.readFile(PROFILE_PATH, 'utf-8');
            const profiles = JSON.parse(data);
            for (const p of profiles) {
                this.cache.set(p.id, p);
            }
        } catch (error) {
            // If file doesn't exist, start empty
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                console.error('Failed to load profiles:', error);
            }
        }
        this.initialized = true;
    }

    private async save() {
        const profiles = Array.from(this.cache.values());
        await fs.writeFile(PROFILE_PATH, JSON.stringify(profiles, null, 2));
    }

    async getProfile(userId: string): Promise<UserProfile> {
        await this.ensureInit();
        let profile = this.cache.get(userId);
        if (!profile) {
            profile = {
                id: userId,
                name: 'User', // Default, should be updated
                preferredTone: 'casual',
                interactionRhythm: 'sporadic',
                doNotMention: [],
                lastInteraction: new Date(),
            };
            this.cache.set(userId, profile);
            await this.save();
        }
        return profile;
    }

    async updateProfile(userId: string, update: Partial<UserProfile>): Promise<void> {
        await this.ensureInit();
        const profile = await this.getProfile(userId);
        const updated = { ...profile, ...update, lastInteraction: new Date() };
        this.cache.set(userId, updated);
        await this.save();
    }

    /**
     * Simple heuristic to detect tone.
     * In a real system, this would be an LLM classification.
     */
    detectTone(content: string): UserProfile['preferredTone'] {
        const length = content.length;
        const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(content);
        const isFormal = content.match(/\b(please|kindly|regards|sincerely)\b/i);

        if (isFormal) return 'formal';
        if (hasEmoji) return 'playful';
        if (length < 20) return 'concise';
        return 'casual';
    }
}
