/**
 * Guild Handler for processing natural language commands related to guilds/clans
 */
class GuildHandler {
  constructor(client, guildManager, reminderManager) {
    this.client = client;
    this.guildManager = guildManager;
    this.reminderManager = reminderManager;
    
    // Define natural language patterns for guild commands
    this.patterns = {
      // Create guild/clan patterns
      create: [
        /(?:create|make|start)(?:\s+a)?\s+(?:guild|clan|team|group)(?:\s+called|named)?\s+([^:]+?)(?:\s+with\s+emoji\s+(.+))?$/i,
        /(?:new|setup)(?:\s+a)?\s+(?:guild|clan|team|group)(?:\s+called|named)?\s+([^:]+?)(?:\s+with\s+emoji\s+(.+))?$/i
      ],
      
      // Invite patterns
      invite: [
        /(?:invite|add)(?:\s+users?)?\s+(.+)(?:\s+to)(?:\s+my)?\s+(?:guild|clan|team|group|(.+))/i,
        /(?:send|create)(?:\s+an?)?\s+invite(?:\s+for)?\s+(.+)(?:\s+to)(?:\s+join)?\s+(?:my)?\s+(?:guild|clan|team|group|(.+))/i
      ],
      
      // Join/accept patterns
      join: [
        /(?:join|accept)(?:\s+invite(?:\s+to)?)?\s+(?:guild|clan|team|group|(.+))/i,
        /(?:accept|yes|approve)\s+(?:the|that)?\s+invite(?:\s+from)?\s+(.+)/i
      ],
      
      // Leave/exit patterns
      leave: [
        /(?:leave|exit|quit)(?:\s+my)?\s+(?:guild|clan|team|group|(.+))/i,
        /(?:remove|take)\s+me\s+(?:out|from)(?:\s+of)?\s+(?:guild|clan|team|group|(.+))/i
      ],
      
      // Show guild info patterns
      info: [
        /(?:show|display|view|get|what(?:\s+are|'s))(?:\s+my)?\s+(?:guild|clan|team|group)(?:s|(?:\s+info|information|details))?/i,
        /(?:list|see)(?:\s+all)?\s+(?:my)?\s+(?:guild|clan|team|group)s/i
      ],
      
      // Guild task/reminder patterns
      task: [
        /(?:remind|tell)(?:\s+my)?\s+(?:guild|clan|team|group|(.+))\s+(?:about|to)\s+(.+?)(?:\s+on|at|by|in|tomorrow|next|tonight|today)/i,
        /(?:create|add|set)(?:\s+a)?\s+(?:guild|clan|team|group|(.+))\s+(?:task|reminder|todo)(?:\s+to)?\s+(.+)/i
      ]
    };
  }

  /**
   * Handle a message that might contain guild-related commands
   * @param {Message} msg - Discord message
   * @param {string} content - Message content
   * @returns {Promise<boolean>} - Whether the message was handled
   */
  async handleMessage(msg, content) {
    try {
      // Try each command type
      if (await this.handleCreateGuild(msg, content)) return true;
      if (await this.handleInvite(msg, content)) return true;
      if (await this.handleJoinGuild(msg, content)) return true;
      if (await this.handleLeaveGuild(msg, content)) return true;
      if (await this.handleGuildInfo(msg, content)) return true;
      if (await this.handleGuildTask(msg, content)) return true;
      
      return false;
    } catch (error) {
      console.error('Error handling guild message:', error);
      return false;
    }
  }

  /**
   * Handle guild creation
   * @param {Message} msg - Discord message
   * @param {string} content - Message content
   * @returns {Promise<boolean>} - Whether the message was handled
   */
  async handleCreateGuild(msg, content) {
    // Match against create patterns
    let match = null;
    for (const pattern of this.patterns.create) {
      match = content.match(pattern);
      if (match) break;
    }
    
    if (!match) return false;
    
    const guildName = match[1].trim();
    const guildEmoji = match[2] ? match[2].trim() : null;
    
    try {
      // Create the guild
      const guild = await this.guildManager.createGuild(
        guildName,
        msg.author.id,
        null, // No description yet
        guildEmoji
      );
      
      // Send confirmation message
      const embed = {
        color: 0x3498db,
        title: `🏰 Guild "${guild.name}" Created!`,
        description: `Your guild has been created successfully.${guildEmoji ? ` Guild emoji: ${guildEmoji}` : ''}`,
        fields: [
          {
            name: 'Next Steps',
            value: 'Invite members by saying "invite @user to my guild"\nAdd a description with "set guild description [text]"'
          }
        ],
        footer: { text: `You're the guild owner` }
      };
      
      await msg.reply({ embeds: [embed] });
      return true;
    } catch (error) {
      console.error('Error creating guild:', error);
      await msg.reply('I had trouble creating your guild. Please try again later.');
      return true;
    }
  }

  /**
   * Handle guild invites
   * @param {Message} msg - Discord message
   * @param {string} content - Message content
   * @returns {Promise<boolean>} - Whether the message was handled
   */
  async handleInvite(msg, content) {
    // Match against invite patterns
    let match = null;
    for (const pattern of this.patterns.invite) {
      match = content.match(pattern);
      if (match) break;
    }
    
    if (!match) return false;
    
    // Extract mentions
    const mentions = this.extractMentions(content);
    if (mentions.length === 0) {
      await msg.reply('Please mention the users you want to invite with @username.');
      return true;
    }
    
    // Find which guild to invite to
    let guildName = match[2] ? match[2].trim() : null;
    let guild = null;
    
    try {
      // Get user's guilds
      const userGuilds = await this.guildManager.getUserGuilds(msg.author.id);
      
      // If no guilds, can't invite
      if (userGuilds.length === 0) {
        await msg.reply('You need to create or join a guild before inviting others.');
        return true;
      }
      
      // If multiple guilds but no specific guild mentioned, ask which one
      if (userGuilds.length > 1 && !guildName) {
        // Create a list of guilds for the user to choose from
        const guildList = userGuilds.map((g, i) => `${i + 1}. ${g.name}`).join('\n');
        await msg.reply(`You're in multiple guilds. Which one do you want to invite to?\n${guildList}\n\nReply with the number or name of the guild.`);
        return true;
      }
      
      // If only one guild or specific guild mentioned
      if (userGuilds.length === 1) {
        guild = userGuilds[0];
      } else if (guildName) {
        // Try to find the guild by name
        guild = userGuilds.find(g => 
          g.name.toLowerCase() === guildName.toLowerCase() || 
          g.name.toLowerCase().includes(guildName.toLowerCase())
        );
      }
      
      if (!guild) {
        await msg.reply(`I couldn't find a guild${guildName ? ` named "${guildName}"` : ''} that you're a member of.`);
        return true;
      }
      
      // Send invites to all mentioned users
      const inviteResults = [];
      for (const userId of mentions) {
        try {
          // Skip if trying to invite themselves
          if (userId === msg.author.id) {
            inviteResults.push(`You can't invite yourself.`);
            continue;
          }
          
          // Try to get user from client
          const user = await this.client.users.fetch(userId);
          if (!user) {
            inviteResults.push(`Couldn't find user <@${userId}>.`);
            continue;
          }
          
          // Create the invite
          await this.guildManager.createInvite(guild.id, msg.author.id, userId);
          inviteResults.push(`Invited ${user.username} to "${guild.name}".`);
          
          // Send DM to the invited user
          try {
            const dmEmbed = {
              color: 0x3498db,
              title: `Guild Invitation`,
              description: `You've been invited to join the guild "${guild.name}" by ${msg.author.username}.`,
              fields: [
                {
                  name: 'How to Accept',
                  value: `Type "accept invite to ${guild.name}" to join.`
                }
              ],
              footer: { text: 'Guild invitation' }
            };
            
            await user.send({ embeds: [dmEmbed] });
          } catch (dmError) {
            console.error('Error sending invite DM:', dmError);
            // Can't send DM, but invite was created
          }
        } catch (inviteError) {
          console.error('Error creating invite:', inviteError);
          inviteResults.push(`Couldn't invite <@${userId}>: ${inviteError.message}`);
        }
      }
      
      // Send a summary of what happened
      await msg.reply({
        content: `Invitations for guild "${guild.name}":`,
        embeds: [{
          color: 0x3498db,
          description: inviteResults.join('\n'),
          footer: { text: 'Users will need to accept the invitations' }
        }]
      });
      
      return true;
    } catch (error) {
      console.error('Error handling guild invite:', error);
      await msg.reply('I had trouble processing those invites. Please try again later.');
      return true;
    }
  }

  /**
   * Handle joining a guild
   * @param {Message} msg - Discord message
   * @param {string} content - Message content
   * @returns {Promise<boolean>} - Whether the message was handled
   */
  async handleJoinGuild(msg, content) {
    // Match against join patterns
    let match = null;
    for (const pattern of this.patterns.join) {
      match = content.match(pattern);
      if (match) break;
    }
    
    if (!match) return false;
    
    // Extract guild name if specified
    const guildName = match[1] ? match[1].trim() : null;
    
    try {
      // Get pending invites for this user
      const invites = await this.guildManager.getPendingInvites(msg.author.id);
      
      if (invites.length === 0) {
        await msg.reply('You don\'t have any pending guild invitations.');
        return true;
      }
      
      // If a specific guild was mentioned, find that invite
      let invite = null;
      if (guildName) {
        invite = invites.find(i => 
          i.guildName.toLowerCase() === guildName.toLowerCase() || 
          i.guildName.toLowerCase().includes(guildName.toLowerCase())
        );
        
        if (!invite) {
          await msg.reply(`You don't have an invite to a guild named "${guildName}".`);
          return true;
        }
      } else if (invites.length === 1) {
        // If only one invite, use that
        invite = invites[0];
      } else {
        // Multiple invites, list them
        const inviteList = invites.map((i, index) => 
          `${index + 1}. **${i.guildName}**${i.guildEmoji ? ` ${i.guildEmoji}` : ''}`
        ).join('\n');
        
        await msg.reply(`You have multiple guild invitations. Which one do you want to accept?\n${inviteList}\n\nSay "accept invite to [guild name]" to join.`);
        return true;
      }
      
      // Accept the invite
      await this.guildManager.respondToInvite(invite.id, msg.author.id, 'accepted');
      
      // Send confirmation
      await msg.reply({
        embeds: [{
          color: 0x2ecc71,
          title: `🎉 Welcome to ${invite.guildName}!`,
          description: `You've successfully joined the guild.`,
          footer: { text: 'You can now participate in guild activities' }
        }]
      });
      
      return true;
    } catch (error) {
      console.error('Error joining guild:', error);
      await msg.reply('I had trouble processing your guild invitation. Please try again later.');
      return true;
    }
  }

  /**
   * Handle leaving a guild
   * @param {Message} msg - Discord message
   * @param {string} content - Message content
   * @returns {Promise<boolean>} - Whether the message was handled
   */
  async handleLeaveGuild(msg, content) {
    // Match against leave patterns
    let match = null;
    for (const pattern of this.patterns.leave) {
      match = content.match(pattern);
      if (match) break;
    }
    
    if (!match) return false;
    
    // Extract guild name if specified
    const guildName = match[1] ? match[1].trim() : null;
    
    try {
      // Get user's guilds
      const userGuilds = await this.guildManager.getUserGuilds(msg.author.id);
      
      if (userGuilds.length === 0) {
        await msg.reply('You aren\'t a member of any guilds.');
        return true;
      }
      
      // If a specific guild was mentioned, find that one
      let guild = null;
      if (guildName) {
        guild = userGuilds.find(g => 
          g.name.toLowerCase() === guildName.toLowerCase() || 
          g.name.toLowerCase().includes(guildName.toLowerCase())
        );
        
        if (!guild) {
          await msg.reply(`You aren't a member of a guild named "${guildName}".`);
          return true;
        }
      } else if (userGuilds.length === 1) {
        // If only one guild, use that
        guild = userGuilds[0];
      } else {
        // Multiple guilds, list them
        const guildList = userGuilds.map((g, index) => 
          `${index + 1}. **${g.name}**${g.emoji ? ` ${g.emoji}` : ''}`
        ).join('\n');
        
        await msg.reply(`You're a member of multiple guilds. Which one do you want to leave?\n${guildList}\n\nSay "leave [guild name]" to exit that guild.`);
        return true;
      }
      
      // Check if the user is the guild owner
      if (guild.ownerId === msg.author.id) {
        await msg.reply({
          embeds: [{
            color: 0xe74c3c,
            title: `⚠️ Guild Owner Action Required`,
            description: `You're the owner of "${guild.name}". If you leave, the guild will be deleted.`,
            fields: [
              {
                name: 'Transfer Ownership First',
                value: 'To keep the guild active, first transfer ownership by saying "make @user owner of my guild"'
              },
              {
                name: 'Delete the Guild',
                value: 'If you want to proceed with deletion, say "delete my guild"'
              }
            ]
          }]
        });
        return true;
      }
      
      // Leave the guild
      await this.guildManager.removeMember(guild.id, msg.author.id, msg.author.id);
      
      // Send confirmation
      await msg.reply({
        embeds: [{
          color: 0x95a5a6,
          title: `Left Guild: ${guild.name}`,
          description: `You've successfully left the guild.`,
          footer: { text: 'You can join again if you receive a new invitation' }
        }]
      });
      
      return true;
    } catch (error) {
      console.error('Error leaving guild:', error);
      await msg.reply('I had trouble processing your request to leave the guild. Please try again later.');
      return true;
    }
  }

  /**
   * Handle displaying guild information
   * @param {Message} msg - Discord message
   * @param {string} content - Message content
   * @returns {Promise<boolean>} - Whether the message was handled
   */
  async handleGuildInfo(msg, content) {
    // Match against info patterns
    let match = null;
    for (const pattern of this.patterns.info) {
      match = content.match(pattern);
      if (match) break;
    }
    
    if (!match) return false;
    
    try {
      // Get user's guilds
      const userGuilds = await this.guildManager.getUserGuilds(msg.author.id);
      
      if (userGuilds.length === 0) {
        await msg.reply({
          embeds: [{
            color: 0x95a5a6,
            title: 'No Guilds Found',
            description: 'You aren\'t a member of any guilds yet.',
            fields: [
              {
                name: 'Create a New Guild',
                value: 'Say "create a guild called [name]" to start your own guild'
              }
            ]
          }]
        });
        return true;
      }
      
      // Show all guilds the user is in
      const guildEmbeds = [];
      
      for (const guild of userGuilds) {
        // Get guild members
        const members = await this.guildManager.getGuildMembers(guild.id);
        const memberCount = members.length;
        
        // Find user's role in this guild
        const userMember = members.find(m => m.userId === msg.author.id);
        const userRole = userMember ? userMember.role : 'unknown';
        
        // Get guild reminders
        const reminders = await this.guildManager.getGuildReminders(guild.id);
        
        // Create an embed for this guild
        guildEmbeds.push({
          color: 0x3498db,
          title: `${guild.emoji || '🏰'} ${guild.name}`,
          description: guild.description || 'No description set.',
          fields: [
            {
              name: 'Members',
              value: `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`,
              inline: true
            },
            {
              name: 'Your Role',
              value: userRole.charAt(0).toUpperCase() + userRole.slice(1),
              inline: true
            },
            {
              name: 'Active Tasks',
              value: reminders.length > 0 
                ? `${reminders.length} active task${reminders.length === 1 ? '' : 's'}`
                : 'No active tasks',
              inline: true
            }
          ],
          footer: { text: `Guild ID: ${guild.id}` }
        });
      }
      
      // Send up to 10 embeds (Discord limit)
      await msg.reply({ 
        content: `Your guilds (${userGuilds.length}):`,
        embeds: guildEmbeds.slice(0, 10)
      });
      
      return true;
    } catch (error) {
      console.error('Error displaying guild info:', error);
      await msg.reply('I had trouble retrieving your guild information. Please try again later.');
      return true;
    }
  }

  /**
   * Handle guild task/reminder creation
   * @param {Message} msg - Discord message
   * @param {string} content - Message content
   * @returns {Promise<boolean>} - Whether the message was handled
   */
  async handleGuildTask(msg, content) {
    // Match against task patterns
    let match = null;
    for (const pattern of this.patterns.task) {
      match = content.match(pattern);
      if (match) break;
    }
    
    if (!match) return false;
    
    // Extract guild name and task
    const guildName = match[1] ? match[1].trim() : null;
    const taskText = match[2] ? match[2].trim() : null;
    
    if (!taskText) {
      await msg.reply('What task would you like to create for the guild?');
      return true;
    }
    
    try {
      // Get user's guilds
      const userGuilds = await this.guildManager.getUserGuilds(msg.author.id);
      
      if (userGuilds.length === 0) {
        await msg.reply('You need to be in a guild to create guild tasks.');
        return true;
      }
      
      // Find which guild to create task for
      let guild = null;
      
      if (guildName) {
        // Try to find by name
        guild = userGuilds.find(g => 
          g.name.toLowerCase() === guildName.toLowerCase() || 
          g.name.toLowerCase().includes(guildName.toLowerCase())
        );
      } else if (userGuilds.length === 1) {
        // If only one guild, use that
        guild = userGuilds[0];
      }
      
      if (!guild) {
        // Ask which guild
        const guildList = userGuilds.map((g, i) => `${i + 1}. ${g.name}`).join('\n');
        await msg.reply(`Which guild is this task for?\n${guildList}\n\nSay "create task for [guild name] to [task]"`);
        return true;
      }
      
      // Extract time information from the original message
      // We'll use the enhanced parser for this
      const EnhancedParserExtended = require('../enhancedParserExtended');
      const parser = new EnhancedParserExtended();
      const parsedResult = parser.parseReminder(content);
      
      // Create the guild task
      const guildTask = await this.guildManager.createGuildReminder(
        guild.id,
        msg.author.id,
        taskText,
        parsedResult.time || null,
        msg.channel.id
      );
      
      // Confirmation message
      const embed = {
        color: 0x2ecc71,
        title: `📋 Guild Task Created`,
        description: `Created a new task for "${guild.name}":`,
        fields: [
          {
            name: 'Task',
            value: taskText
          }
        ],
        footer: { text: 'All guild members will be notified when it\'s time' }
      };
      
      // Add due time if available
      if (parsedResult.time) {
        embed.fields.push({
          name: 'Due',
          value: parsedResult.timeText
        });
      }
      
      await msg.reply({ embeds: [embed] });
      return true;
    } catch (error) {
      console.error('Error creating guild task:', error);
      await msg.reply('I had trouble creating a task for your guild. Please try again later.');
      return true;
    }
  }

  /**
   * Extract user mentions from message content
   * @param {string} content - Message content
   * @returns {Array<string>} - Array of user IDs
   */
  extractMentions(content) {
    // Match <@USER_ID> pattern
    const mentionRegex = /<@!?(\d+)>/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  }
}

module.exports = GuildHandler;
