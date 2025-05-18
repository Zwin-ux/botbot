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
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO guilds (name, description, emoji, ownerId)
         VALUES (?, ?, ?, ?)`,
        [name, description, emoji, ownerId],
        function(err) {
          if (err) return reject(err);
          
          const guildId = this.lastID;
          
          // Also add the owner as a member with role 'owner'
          this.db.run(
            `INSERT INTO guild_members (guildId, userId, role)
             VALUES (?, ?, 'owner')`,
            [guildId, ownerId],
            (err) => {
              if (err) return reject(err);
              
              resolve({
                id: guildId,
                name,
                description,
                emoji,
                ownerId,
                createdAt: Math.floor(Date.now() / 1000)
              });
            }
          );
        }
      );
    });
  }

  /**
   * Get guild by ID
   * @param {number} guildId - Guild ID
   * @returns {Promise<Object|null>} - Guild object or null if not found
   */
  async getGuildById(guildId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM guilds WHERE id = ?`,
        [guildId],
        (err, guild) => {
          if (err) return reject(err);
          resolve(guild || null);
        }
      );
    });
  }

  /**
   * Get all guilds for a user
   * @param {string} userId - Discord user ID
   * @returns {Promise<Array>} - Array of guild objects
   */
  async getUserGuilds(userId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT g.* FROM guilds g
         JOIN guild_members m ON g.id = m.guildId
         WHERE m.userId = ?
         ORDER BY g.name ASC`,
        [userId],
        (err, guilds) => {
          if (err) return reject(err);
          resolve(guilds || []);
        }
      );
    });
  }

  /**
   * Update guild details
   * @param {number} guildId - Guild ID
   * @param {Object} updates - Object with fields to update
   * @param {string} [updates.name] - New guild name
   * @param {string} [updates.description] - New guild description
   * @param {string} [updates.emoji] - New guild emoji
   * @returns {Promise<boolean>} - Success status
   */
  async updateGuild(guildId, updates) {
    const allowedFields = ['name', 'description', 'emoji'];
    const fields = Object.keys(updates).filter(field => allowedFields.includes(field));
    
    if (fields.length === 0) return false;
    
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updates[field]);
    values.push(guildId);
    
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE guilds SET ${setClause} WHERE id = ?`,
        values,
        function(err) {
          if (err) return reject(err);
          resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Delete a guild
   * @param {number} guildId - Guild ID
   * @param {string} userId - User ID requesting deletion (must be owner)
   * @returns {Promise<boolean>} - Success status
   */
  async deleteGuild(guildId, userId) {
    return new Promise((resolve, reject) => {
      // First verify that the user is the owner
      this.db.get(
        `SELECT ownerId FROM guilds WHERE id = ?`,
        [guildId],
        (err, guild) => {
          if (err) return reject(err);
          if (!guild) return resolve(false);
          if (guild.ownerId !== userId) return resolve(false);
          
          // If verification passes, delete the guild
          // Foreign key constraints will cascade delete members and invites
          this.db.run(
            `DELETE FROM guilds WHERE id = ?`,
            [guildId],
            function(err) {
              if (err) return reject(err);
              resolve(this.changes > 0);
            }
          );
        }
      );
    });
  }

  /**
   * Add a member to a guild
   * @param {number} guildId - Guild ID
   * @param {string} userId - Discord user ID
   * @param {string} [role='member'] - Member role
   * @returns {Promise<boolean>} - Success status
   */
  async addMember(guildId, userId, role = 'member') {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO guild_members (guildId, userId, role)
         VALUES (?, ?, ?)
         ON CONFLICT(guildId, userId) 
         DO UPDATE SET role = ?`,
        [guildId, userId, role, role],
        function(err) {
          if (err) return reject(err);
          resolve(this.changes > 0);
        }
      );
    });
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
    // Can't change owner role through this method
    if (newRole === 'owner') return false;
    
    return new Promise((resolve, reject) => {
      // First check if requester has permission (must be owner or admin)
      this.db.get(
        `SELECT gm.role, g.ownerId 
         FROM guild_members gm
         JOIN guilds g ON gm.guildId = g.id
         WHERE gm.guildId = ? AND gm.userId = ?`,
        [guildId, requesterId],
        (err, requesterMember) => {
          if (err) return reject(err);
          if (!requesterMember) return resolve(false);
          
          // Only owner or admin can change roles
          if (requesterMember.role !== 'owner' && requesterMember.role !== 'admin') {
            return resolve(false);
          }
          
          // Admin can't change roles of other admins or owner
          if (requesterMember.role === 'admin') {
            this.db.get(
              `SELECT role FROM guild_members 
               WHERE guildId = ? AND userId = ?`,
              [guildId, userId],
              (err, targetMember) => {
                if (err) return reject(err);
                if (!targetMember) return resolve(false);
                
                // Admin can't change other admins or owner
                if (targetMember.role === 'admin' || targetMember.role === 'owner') {
                  return resolve(false);
                }
                
                this.updateRole();
              }
            );
          } else {
            // Owner can change any role except their own
            if (requesterMember.ownerId === userId) {
              return resolve(false);
            }
            
            this.updateRole();
          }
          
          function updateRole() {
            this.db.run(
              `UPDATE guild_members SET role = ?
               WHERE guildId = ? AND userId = ?`,
              [newRole, guildId, userId],
              function(err) {
                if (err) return reject(err);
                resolve(this.changes > 0);
              }
            );
          }
        }
      );
    });
  }

  /**
   * Remove a member from a guild
   * @param {number} guildId - Guild ID
   * @param {string} userId - Discord user ID to remove
   * @param {string} requesterId - User ID making the request
   * @returns {Promise<boolean>} - Success status
   */
  async removeMember(guildId, userId, requesterId) {
    return new Promise((resolve, reject) => {
      // First check permissions
      this.db.get(
        `SELECT gm.role, g.ownerId 
         FROM guild_members gm
         JOIN guilds g ON gm.guildId = g.id
         WHERE gm.guildId = ? AND gm.userId = ?`,
        [guildId, requesterId],
        (err, requesterMember) => {
          if (err) return reject(err);
          if (!requesterMember) return resolve(false);
          
          // Check if target is owner (can't remove owner)
          this.db.get(
            `SELECT role FROM guild_members 
             WHERE guildId = ? AND userId = ?`,
            [guildId, userId],
            (err, targetMember) => {
              if (err) return reject(err);
              if (!targetMember) return resolve(false);
              
              // Can't remove owner
              if (targetMember.role === 'owner') {
                return resolve(false);
              }
              
              // User can remove themselves
              if (userId === requesterId) {
                return removeUser();
              }
              
              // Only owner or admin can remove others
              if (requesterMember.role !== 'owner' && requesterMember.role !== 'admin') {
                return resolve(false);
              }
              
              // Admin can't remove other admins
              if (requesterMember.role === 'admin' && targetMember.role === 'admin') {
                return resolve(false);
              }
              
              removeUser();
            }
          );
          
          function removeUser() {
            this.db.run(
              `DELETE FROM guild_members
               WHERE guildId = ? AND userId = ?`,
              [guildId, userId],
              function(err) {
                if (err) return reject(err);
                resolve(this.changes > 0);
              }
            );
          }
        }
      );
    });
  }

  /**
   * Get members of a guild
   * @param {number} guildId - Guild ID
   * @returns {Promise<Array>} - Array of member objects
   */
  async getGuildMembers(guildId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT userId, role, joinedAt 
         FROM guild_members
         WHERE guildId = ?
         ORDER BY role DESC, joinedAt ASC`,
        [guildId],
        (err, members) => {
          if (err) return reject(err);
          resolve(members || []);
        }
      );
    });
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
    return new Promise((resolve, reject) => {
      // First check if inviter is a member with permission
      this.db.get(
        `SELECT role FROM guild_members
         WHERE guildId = ? AND userId = ?`,
        [guildId, inviterId],
        (err, member) => {
          if (err) return reject(err);
          if (!member) return reject(new Error('Inviter is not a member of this guild'));
          
          // Regular members can invite if the guild allows it (setting)
          if (member.role === 'member') {
            this.db.get(
              `SELECT settingValue FROM guild_settings
               WHERE guildId = ? AND settingKey = 'members_can_invite'`,
              [guildId],
              (err, setting) => {
                if (err) return reject(err);
                // If setting doesn't exist or is false, members can't invite
                if (!setting || setting.settingValue !== 'true') {
                  return reject(new Error('Only admins and owners can send invites'));
                }
                createInvite();
              }
            );
          } else {
            // Admins and owners can always invite
            createInvite();
          }
          
          function createInvite() {
            // Check if invitee is already a member
            this.db.get(
              `SELECT id FROM guild_members
               WHERE guildId = ? AND userId = ?`,
              [guildId, inviteeId],
              (err, existingMember) => {
                if (err) return reject(err);
                if (existingMember) return reject(new Error('User is already a member of this guild'));
                
                // Check if there's already a pending invite
                this.db.get(
                  `SELECT id FROM guild_invites
                   WHERE guildId = ? AND inviteeId = ? AND status = 'pending'`,
                  [guildId, inviteeId],
                  (err, existingInvite) => {
                    if (err) return reject(err);
                    if (existingInvite) return reject(new Error('There is already a pending invite for this user'));
                    
                    // Create the invite
                    const now = Math.floor(Date.now() / 1000);
                    this.db.run(
                      `INSERT INTO guild_invites
                       (guildId, inviterId, inviteeId, createdAt, expiresAt)
                       VALUES (?, ?, ?, ?, ?)`,
                      [guildId, inviterId, inviteeId, now, expiresIn ? now + expiresIn : null],
                      function(err) {
                        if (err) return reject(err);
                        resolve({
                          id: this.lastID,
                          guildId,
                          inviterId,
                          inviteeId,
                          status: 'pending',
                          createdAt: now,
                          expiresAt: expiresIn ? now + expiresIn : null
                        });
                      }
                    );
                  }
                );
              }
            );
          }
        }
      );
    });
  }

  /**
   * Get pending invites for a user
   * @param {string} userId - Discord user ID
   * @returns {Promise<Array>} - Array of invite objects
   */
  async getPendingInvites(userId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT i.*, g.name AS guildName, g.emoji AS guildEmoji
         FROM guild_invites i
         JOIN guilds g ON i.guildId = g.id
         WHERE i.inviteeId = ? AND i.status = 'pending'
         AND (i.expiresAt IS NULL OR i.expiresAt > cast(strftime('%s', 'now') as int))
         ORDER BY i.createdAt DESC`,
        [userId],
        (err, invites) => {
          if (err) return reject(err);
          resolve(invites || []);
        }
      );
    });
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
      return Promise.reject(new Error('Invalid status. Must be "accepted" or "declined".'));
    }
    
    return new Promise((resolve, reject) => {
      // Get the invite first to verify invitee
      this.db.get(
        `SELECT * FROM guild_invites 
         WHERE id = ? AND inviteeId = ? AND status = 'pending'
         AND (expiresAt IS NULL OR expiresAt > cast(strftime('%s', 'now') as int))`,
        [inviteId, userId],
        (err, invite) => {
          if (err) return reject(err);
          if (!invite) return resolve(false);
          
          // Update the invite status
          this.db.run(
            `UPDATE guild_invites SET status = ? WHERE id = ?`,
            [status, inviteId],
            (err) => {
              if (err) return reject(err);
              
              // If accepted, add the user as a guild member
              if (status === 'accepted') {
                this.addMember(invite.guildId, userId)
                  .then(() => resolve(true))
                  .catch(reject);
              } else {
                resolve(true);
              }
            }
          );
        }
      );
    });
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
    return new Promise((resolve, reject) => {
      // First check if the user is a member of the guild
      this.db.get(
        `SELECT role FROM guild_members
         WHERE guildId = ? AND userId = ?`,
        [guildId, creatorId],
        (err, member) => {
          if (err) return reject(err);
          if (!member) return reject(new Error('You must be a member of the guild to create reminders'));
          
          // Insert the reminder
          this.db.run(
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
            ],
            function(err) {
              if (err) return reject(err);
              
              resolve({
                id: this.lastID,
                userId: creatorId,
                content,
                dueTime: dueTime ? Math.floor(dueTime.getTime() / 1000) : null,
                channelId,
                categoryId,
                priority,
                guildId
              });
            }
          );
        }
      );
    });
  }

  /**
   * Get guild reminders
   * @param {number} guildId - Guild ID
   * @param {string} [status='pending'] - Reminder status
   * @returns {Promise<Array>} - Array of reminder objects
   */
  async getGuildReminders(guildId, status = 'pending') {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM reminders
         WHERE guildId = ? AND status = ?
         ORDER BY dueTime ASC`,
        [guildId, status],
        (err, reminders) => {
          if (err) return reject(err);
          resolve(reminders || []);
        }
      );
    });
  }
}

module.exports = GuildManager;
