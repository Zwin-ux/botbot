import { CoreMessage, CoreResponse, PlatformId } from '../../core/types';
import { ConversationManager } from '../../memory/conversation-manager';

export class SMSPlatform {
    constructor(private conversationManager: ConversationManager) { }

    /**
     * Simulate receiving an SMS message.
     */
    async receiveMessage(
        userId: string,
        content: string
    ): Promise<CoreMessage> {
        return {
            id: `sms-${Date.now()}`,
            userId,
            platformId: 'sms',
            platformUserId: userId, // Phone number in real app
            channelId: 'sms-channel',
            content,
            timestamp: new Date(),
        };
    }

    /**
     * Generate a response with Continuity Markers.
     */
    async generateResponse(
        message: CoreMessage,
        baseResponse: string
    ): Promise<string> {
        const history = this.conversationManager.getHistory();
        const lastTurn = history[history.length - 1];

        let response = baseResponse;

        // Check for continuity opportunity
        // If the last message was recent (< 1 hour) and from a DIFFERENT platform
        if (lastTurn) {
            const isRecent = Date.now() - lastTurn.timestamp < 3600000; // 1 hour
            // In a real app, we'd store platformId in ConversationTurn to check this.
            // For MVP, let's assume if we are on SMS, and there is history, it might be from Discord.

            if (isRecent) {
                response = `(Continuing from our chat earlier...) ${response}`;
            }
        }

        return response;
    }
}
