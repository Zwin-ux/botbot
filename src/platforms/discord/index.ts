import { Client, Message } from 'discord.js';
import { CompanionLLM } from '../../llm/companion-llm';
import { CoreMessage } from '../../core/types';

export class CompanionDiscordHandler {
    constructor(
        private client: Client,
        private llm: CompanionLLM
    ) { }

    async handleMessage(message: Message): Promise<void> {
        // Ignore bots and self
        if (message.author.bot) return;

        // Convert to CoreMessage
        const coreMessage: CoreMessage = {
            id: message.id,
            userId: message.author.id,
            platformId: 'discord',
            platformUserId: message.author.id,
            channelId: message.channelId,
            content: message.content,
            timestamp: message.createdAt,
            metadata: {
                username: message.author.username,
                guildId: message.guildId,
            }
        };

        try {
            // Generate Response
            const response = await this.llm.generateResponse(
                coreMessage.userId,
                coreMessage.content,
                'discord'
            );

            // Send Response
            await message.reply(response.text);

            // Handle Events (e.g. if we need to trigger side effects)
            // For now, just log them
            if (response.events.length > 0) {
                console.log('Events triggered:', response.events.map(e => e.type));
            }

        } catch (error) {
            console.error('Error handling Discord message:', error);
            await message.reply('I had a bit of a brain freeze. Try again?');
        }
    }
}
