/**
 * Guild Manager for handling clan/guild database operations
 * Provides CRUD operations for guilds, members, and invites
 */
class GuildManager {
  constructor(db) {
    this.db = db;
  }

  /**
   * Create a new guild
   * @param {string} name - Guild name
   * @param {string} ownerId - Discord user ID of the owner
   * @param {string} [description] - Optional guild description
   * @param {string} [emoji] - Optional guild emoji
   * @returns {Promise<Object>} - Created guild object with id
   */
  async createGuild(name, ownerId, description = null, emoji = null) {
    const stmt = await this.db.runAsync(
      `INSERT INTO guilds (name, description, emoji, ownerId)
       VALUES (?, ?, ?, ?)`,
      [name, description, emoji, ownerId]
    );

    const guildId = stmt.lastID;

    await this.db.runAsync(
      `INSERT INTO guild_members (guildId, userId, role)
       VALUES (?, ?, 'owner')`,
      [guildId, ownerId]
    );

    return {
      id: guildId,
      name,
      description,
      emoji,
      ownerId,
      createdAt: Math.floor(Date.now() / 1000) // Keep this for now, though DB might handle it
    };
  }

  /**
   * Get guild by ID
   * @param {number} guildId - Guild ID
   * @returns {Promise<Object|null>} - Guild object or null if not found
   */
  async getGuildById(guildId) {
    const guild = await this.db.getAsync(
      `SELECT * FROM guilds WHERE id = ?`,
      [guildId]
    );
    return guild || null;
  }

  /**
   * Get all guilds for a user
   * @param {string} userId - Discord user ID
   * @returns {Promise<Array>} - Array of guild objects
   */
  async getUserGuilds(userId) {
    const guilds = await this.db.allAsync(
      `SELECT g.* FROM guilds g
       JOIN guild_members m ON g.id = m.guildId
       WHERE m.userId = ?
       ORDER BY g.name ASC`,
      [userId]
    );
    return guilds || [];
  }

  /**
   * Update guild details
   * @param {number} guildId - Guild ID
   * @param {Object} updates - Object with fields to update
   * @returns {Promise<boolean>} - Success status
   */
  async updateGuild(guildId, updates) {
    const allowedFields = ['name', 'description', 'emoji'];
    const fields = Object.keys(updates).filter(field => allowedFields.includes(field));
    
    if (fields.length === 0) return false;
    
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updates[field]);
    values.push(guildId);
    
    const stmt = await this.db.runAsync(
      `UPDATE guilds SET ${setClause} WHERE id = ?`,
      values
    );
    return stmt.changes > 0;
  }

  /**
   * Delete a guild
   * @param {number} guildId - Guild ID
   * @param {string} userId - User ID requesting deletion (must be owner)
   * @returns {Promise<boolean>} - Success status
   */
  async deleteGuild(guildId, userId) {
    const guild = await this.db.getAsync(
      `SELECT ownerId FROM guilds WHERE id = ?`,
      [guildId]
    );

    if (!guild || guild.ownerId !== userId) {
      return false;
    }

    const stmt = await this.db.runAsync(
      `DELETE FROM guilds WHERE id = ?`,
      [guildId]
    );
    return stmt.changes > 0;
  }

  /**
   * Add a member to a guild
   * @param {number} guildId - Guild ID
   * @param {string} userId - Discord user ID
   * @param {string} [role='member'] - Member role
   * @returns {Promise<boolean>} - Success status
   */
  async addMember(guildId, userId, role = 'member') {
    const stmt = await this.db.runAsync(
      `INSERT INTO guild_members (guildId, userId, role)
       VALUES (?, ?, ?)
       ON CONFLICT(guildId, userId)
       DO UPDATE SET role = ?`,
      [guildId, userId, role, role]
    );
    return stmt.changes > 0;
  }

  /**
   * Update member role in a guild
   * @param {number} guildId - Guild ID
   * @param {string} userId - Discord user ID
   * @param {string} newRole - New role (member, admin)
   * @param {string} requesterId - User ID making the request (must be owner or admin)
   * @returns {Promise<boolean>} - Success status
   */
  async updateMemberRole(guildId, userId, newRole, requesterId) {
    if (newRole === 'owner') return false;
    
    const requesterMember = await this.db.getAsync(
      `SELECT gm.role, g.ownerId
       FROM guild_members gm
       JOIN guilds g ON gm.guildId = g.id
       WHERE gm.guildId = ? AND gm.userId = ?`,
      [guildId, requesterId]
    );

    if (!requesterMember || (requesterMember.role !== 'owner' && requesterMember.role !== 'admin')) {
      return false;
    }

    const targetMember = await this.db.getAsync(
      `SELECT role FROM guild_members
       WHERE guildId = ? AND userId = ?`,
      [guildId, userId]
    );

    if (!targetMember) return false;

    if (requesterMember.role === 'admin' && (targetMember.role === 'admin' || targetMember.role === 'owner')) {
      return false;
    }

    if (requesterMember.role === 'owner' && requesterMember.ownerId === userId) { // Owner trying to change their own role
        return false;
    }

    const stmt = await this.db.runAsync(
      `UPDATE guild_members SET role = ?
       WHERE guildId = ? AND userId = ?`,
      [newRole, guildId, userId]
    );
    return stmt.changes > 0;
  }

  /**
   * Remove a member from a guild
   * @param {number} guildId - Guild ID
   * @param {string} userId - Discord user ID to remove
   * @param {string} requesterId - User ID making the request
   * @returns {Promise<boolean>} - Success status
   */
  async removeMember(guildId, userId, requesterId) {
    const requesterMember = await this.db.getAsync(
      `SELECT gm.role, g.ownerId
       FROM guild_members gm
       JOIN guilds g ON gm.guildId = g.id
       WHERE gm.guildId = ? AND gm.userId = ?`,
      [guildId, requesterId]
    );

    if (!requesterMember) return false;

    const targetMember = await this.db.getAsync(
      `SELECT role FROM guild_members
       WHERE guildId = ? AND userId = ?`,
      [guildId, userId]
    );

    if (!targetMember || targetMember.role === 'owner') { // Can't remove owner
      return false;
    }

    if (userId !== requesterId) { // Not self-removal
      if (requesterMember.role !== 'owner' && requesterMember.role !== 'admin') {
        return false; // Only owner/admin can remove others
      }
      if (requesterMember.role === 'admin' && targetMember.role === 'admin') {
        return false; // Admin can't remove other admins
      }
    }

    const stmt = await this.db.runAsync(
      `DELETE FROM guild_members
       WHERE guildId = ? AND userId = ?`,
      [guildId, userId]
    );
    return stmt.changes > 0;
  }

  /**
   * Get members of a guild
   * @param {number} guildId - Guild ID
   * @returns {Promise<Array>} - Array of member objects
   */
  async getGuildMembers(guildId) {
    const members = await this.db.allAsync(
      `SELECT userId, role, joinedAt
       FROM guild_members
       WHERE guildId = ?
       ORDER BY role DESC, joinedAt ASC`,
      [guildId]
    );
    return members || [];
  }

  /**
   * Create an invite to a guild
   * @param {number} guildId - Guild ID
   * @param {string} inviterId - Inviter's Discord user ID
   * @param {string} inviteeId - Invitee's Discord user ID
   * @param {number} [expiresIn=86400] - Expiration time in seconds (default: 24 hours)
   * @returns {Promise<Object>} - Created invite object
   */
  async createInvite(guildId, inviterId, inviteeId, expiresIn = 86400) {
    const inviterMember = await this.db.getAsync(
      `SELECT role FROM guild_members
       WHERE guildId = ? AND userId = ?`,
      [guildId, inviterId]
    );

    if (!inviterMember) {
      throw new Error('Inviter is not a member of this guild');
    }

    if (inviterMember.role === 'member') {
      const setting = await this.db.getAsync(
        `SELECT settingValue FROM guild_settings
         WHERE guildId = ? AND settingKey = 'members_can_invite'`,
        [guildId]
      );
      if (!setting || setting.settingValue !== 'true') {
        throw new Error('Only admins and owners can send invites');
      }
    }

    const existingMember = await this.db.getAsync(
      `SELECT id FROM guild_members
       WHERE guildId = ? AND userId = ?`,
      [guildId, inviteeId]
    );
    if (existingMember) {
      throw new Error('User is already a member of this guild');
    }

    const existingInvite = await this.db.getAsync(
      `SELECT id FROM guild_invites
       WHERE guildId = ? AND inviteeId = ? AND status = 'pending'`,
      [guildId, inviteeId]
    );
    if (existingInvite) {
      throw new Error('There is already a pending invite for this user');
    }

    const now = Math.floor(Date.now() / 1000);
    const stmt = await this.db.runAsync(
      `INSERT INTO guild_invites
       (guildId, inviterId, inviteeId, createdAt, expiresAt)
       VALUES (?, ?, ?, ?, ?)`,
      [guildId, inviterId, inviteeId, now, expiresIn ? now + expiresIn : null]
    );

    return {
      id: stmt.lastID,
      guildId,
      inviterId,
      inviteeId,
      status: 'pending',
      createdAt: now,
      expiresAt: expiresIn ? now + expiresIn : null
    };
  }

  /**
   * Get pending invites for a user
   * @param {string} userId - Discord user ID
   * @returns {Promise<Array>} - Array of invite objects
   */
  async getPendingInvites(userId) {
    const invites = await this.db.allAsync(
      `SELECT i.*, g.name AS guildName, g.emoji AS guildEmoji
       FROM guild_invites i
       JOIN guilds g ON i.guildId = g.id
       WHERE i.inviteeId = ? AND i.status = 'pending'
       AND (i.expiresAt IS NULL OR i.expiresAt > cast(strftime('%s', 'now') as int))
       ORDER BY i.createdAt DESC`,
      [userId]
    );
    return invites || [];
  }

  /**
   * Respond to an invite
   * @param {number} inviteId - Invite ID
   * @param {string} userId - Discord user ID (must be the invitee)
   * @param {string} status - New status ('accepted' or 'declined')
   * @returns {Promise<boolean>} - Success status
   */
  async respondToInvite(inviteId, userId, status) {
    if (status !== 'accepted' && status !== 'declined') {
      throw new Error('Invalid status. Must be "accepted" or "declined".');
    }
    
    const invite = await this.db.getAsync(
      `SELECT * FROM guild_invites
       WHERE id = ? AND inviteeId = ? AND status = 'pending'
       AND (expiresAt IS NULL OR expiresAt > cast(strftime('%s', 'now') as int))`,
      [inviteId, userId]
    );

    if (!invite) return false;

    await this.db.runAsync(
      `UPDATE guild_invites SET status = ? WHERE id = ?`,
      [status, inviteId]
    );

    if (status === 'accepted') {
      await this.addMember(invite.guildId, userId);
    }
    return true;
  }

  /**
   * Create a guild reminder
   * @param {number} guildId - Guild ID
   * @param {string} creatorId - Discord user ID of creator
   * @param {string} content - Reminder content
   * @param {Date} dueTime - Due time
   * @param {string} channelId - Channel ID where reminder was created
   * @param {number} [categoryId=null] - Category ID
   * @param {number} [priority=0] - Priority level
   * @returns {Promise<Object>} - Created reminder
   */
  async createGuildReminder(guildId, creatorId, content, dueTime, channelId, categoryId = null, priority = 0) {
    const member = await this.db.getAsync(
      `SELECT role FROM guild_members
       WHERE guildId = ? AND userId = ?`,
      [guildId, creatorId]
    );

    if (!member) {
      throw new Error('You must be a member of the guild to create reminders');
    }
          
    const stmt = await this.db.runAsync(
      `INSERT INTO reminders
       (userId, userTag, content, dueTime, channelId, categoryId, priority, guildId, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, cast(strftime('%s', 'now') as int))`,
      [
        creatorId,
        'Guild Reminder', // Will be updated with user tag when fetched
        content,
        dueTime ? Math.floor(dueTime.getTime() / 1000) : null,
        channelId,
        categoryId,
        priority,
        guildId
      ]
    );

    return {
      id: stmt.lastID,
      userId: creatorId,
      content,
      dueTime: dueTime ? Math.floor(dueTime.getTime() / 1000) : null,
      channelId,
      categoryId,
      priority,
      guildId
    };
  }

  /**
   * Get guild reminders
   * @param {number} guildId - Guild ID
   * @param {string} [status='pending'] - Reminder status
   * @returns {Promise<Array>} - Array of reminder objects
   */
  async getGuildReminders(guildId, status = 'pending') {
    const reminders = await this.db.allAsync(
      `SELECT * FROM reminders
       WHERE guildId = ? AND status = ?
       ORDER BY dueTime ASC`,
      [guildId, status]
    );
    return reminders || [];
  }
}

export default GuildManager;
