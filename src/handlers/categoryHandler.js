/**
 * Handles category-related commands and functionalities
 */
class CategoryHandler {
  constructor(client, categoryManager) {
    this.client = client;
    this.categoryManager = categoryManager;
  }

  /**
   * Process category-related commands
   * @param {Message} msg - Discord message
   * @param {string} content - Message content
   * @returns {Promise<boolean>} - True if handled, false otherwise
   */
  async handleMessage(msg, content) {
    const lowerContent = content.toLowerCase().trim();
    
    // Show categories command
    if (lowerContent.match(/^(?:show|list)\s+(?:categories|tags)/i)) {
      await this.showCategories(msg);
      return true;
    }
    
    // Create category command
    const createMatch = content.match(/^(?:create|add|new)\s+category\s+([^\s]+)\s+(.+)$/i);
    if (createMatch) {
      const emoji = createMatch[1].trim();
      const name = createMatch[2].trim();
      await this.createCategory(msg, emoji, name);
      return true;
    }
    
    // Subscribe to category command
    const subscribeMatch = content.match(/^(?:subscribe|follow)\s+(.+)$/i);
    if (subscribeMatch) {
      const categoryName = subscribeMatch[1].trim();
      await this.handleSubscribeCommand(msg, categoryName);
      return true;
    }
    
    // Unsubscribe from category command
    const unsubscribeMatch = content.match(/^(?:unsubscribe|unfollow)\s+(.+)$/i);
    if (unsubscribeMatch) {
      const categoryName = unsubscribeMatch[1].trim();
      await this.handleUnsubscribeCommand(msg, categoryName);
      return true;
    }
    
    // List my subscriptions command
    if (lowerContent.match(/^(?:my\s+(?:subscriptions|categories|tags)|what\s+(?:categories|tags)\s+(?:am\s+i\s+(?:subscribed|following)|do\s+i\s+(?:follow|have)))/i)) {
      await this.showUserSubscriptions(msg, msg.author.id);
      return true;
    }
    
    // Not a category command
    return false;
  }

  /**
   * Show available categories
   * @param {Message} msg - Discord message
   */
  async showCategories(msg) {
    try {
      const categories = await this.categoryManager.getAllCategories();
      
      if (categories.length === 0) {
        return msg.reply("There are no categories set up yet. Create one with `create category 🌟 Star Tasks`");
      }
      
      const categoryEmbed = {
        color: 0x0099ff,
        title: 'Available Categories',
        description: 'React with the emoji to subscribe to a category!',
        fields: categories.map(cat => ({
          name: `${cat.emoji} ${cat.name}`,
          value: cat.description || 'No description'
        })),
        footer: {
          text: 'React to this message with a category emoji to subscribe'
        }
      };
      
      const sentMsg = await msg.channel.send({ embeds: [categoryEmbed] });
      
      // Add reaction emojis
      for (const category of categories) {
        await sentMsg.react(category.emoji);
      }
      
    } catch (error) {
      console.error('Error showing categories:', error);
      await msg.reply('Sorry, I had trouble retrieving the categories. Please try again later.');
    }
  }

  /**
   * Create a new category
   * @param {Message} msg - Discord message
   * @param {string} emoji - Category emoji
   * @param {string} name - Category name
   */
  async createCategory(msg, emoji, name) {
    try {
      // Validate emoji (simple check)
      if (emoji.length > 2 && !emoji.startsWith('<:')) {
        return msg.reply("That doesn't look like a valid emoji. Please use a standard emoji or custom emoji.");
      }
      
      // Check if category with this emoji already exists
      const existingCategory = await this.categoryManager.getCategoryByEmoji(emoji);
      if (existingCategory) {
        return msg.reply(`A category with the emoji ${emoji} already exists: **${existingCategory.name}**`);
      }
      
      // Create the category
      const description = `Created by ${msg.author.tag}`;
      const categoryId = await this.categoryManager.createCategory(name, emoji, description);
      
      // Subscribe the creator
      await this.categoryManager.subscribeUserToCategory(msg.author.id, categoryId);
      
      await msg.reply(`✅ Created new category **${name}** ${emoji}! You're automatically subscribed.`);
    } catch (error) {
      console.error('Error creating category:', error);
      await msg.reply('Sorry, I had trouble creating that category. Please try again later.');
    }
  }

  /**
   * Handle subscription command
   * @param {Message} msg - Discord message
   * @param {string} categoryName - Category name or emoji
   */
  async handleSubscribeCommand(msg, categoryName) {
    try {
      let category;
      
      // Check if categoryName is actually an emoji
      if (categoryName.length <= 2 || categoryName.startsWith('<:')) {
        category = await this.categoryManager.getCategoryByEmoji(categoryName);
      } else {
        // Try to find by name (using a case-insensitive search)
        const allCategories = await this.categoryManager.getAllCategories();
        category = allCategories.find(c => 
          c.name.toLowerCase() === categoryName.toLowerCase() ||
          c.name.toLowerCase().includes(categoryName.toLowerCase())
        );
      }
      
      if (!category) {
        return msg.reply(`I couldn't find a category with the name or emoji "${categoryName}". Use \`list categories\` to see available options.`);
      }
      
      await this.categoryManager.subscribeUserToCategory(msg.author.id, category.id);
      await msg.reply(`✅ You're now subscribed to **${category.name}** ${category.emoji}!`);
    } catch (error) {
      console.error('Error subscribing to category:', error);
      await msg.reply('Sorry, I had trouble subscribing you to that category. Please try again later.');
    }
  }

  /**
   * Handle unsubscription command
   * @param {Message} msg - Discord message
   * @param {string} categoryName - Category name or emoji
   */
  async handleUnsubscribeCommand(msg, categoryName) {
    try {
      let category;
      
      // Check if categoryName is actually an emoji
      if (categoryName.length <= 2 || categoryName.startsWith('<:')) {
        category = await this.categoryManager.getCategoryByEmoji(categoryName);
      } else {
        // Try to find by name (using a case-insensitive search)
        const allCategories = await this.categoryManager.getAllCategories();
        category = allCategories.find(c => 
          c.name.toLowerCase() === categoryName.toLowerCase() ||
          c.name.toLowerCase().includes(categoryName.toLowerCase())
        );
      }
      
      if (!category) {
        return msg.reply(`I couldn't find a category with the name or emoji "${categoryName}". Use \`list categories\` to see available options.`);
      }
      
      const result = await this.categoryManager.unsubscribeUserFromCategory(msg.author.id, category.id);
      
      if (result) {
        await msg.reply(`✅ You've been unsubscribed from **${category.name}** ${category.emoji}.`);
      } else {
        await msg.reply(`You weren't subscribed to **${category.name}** ${category.emoji}.`);
      }
    } catch (error) {
      console.error('Error unsubscribing from category:', error);
      await msg.reply('Sorry, I had trouble unsubscribing you from that category. Please try again later.');
    }
  }

  /**
   * Show user subscriptions
   * @param {Message} msg - Discord message
   * @param {string} userId - User ID
   */
  async showUserSubscriptions(msg, userId) {
    try {
      const subscriptions = await this.categoryManager.getUserSubscriptions(userId);
      
      if (subscriptions.length === 0) {
        return msg.reply("You're not subscribed to any categories yet. Use `list categories` to see available options and react to subscribe!");
      }
      
      const subscriptionList = subscriptions.map(cat => `${cat.emoji} **${cat.name}**`).join('\n');
      
      await msg.reply(`**Your Category Subscriptions:**\n${subscriptionList}`);
    } catch (error) {
      console.error('Error showing user subscriptions:', error);
      await msg.reply('Sorry, I had trouble retrieving your subscriptions. Please try again later.');
    }
  }
}

export default CategoryHandler;
