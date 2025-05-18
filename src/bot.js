// Main bot file
require('dotenv').config(); // For loading environment variables

const { Client, GatewayIntentBits, Partials } = require('discord.js'); // Added Partials for DMs
const sqlite3 = require('sqlite3').verbose();
const cron = require('node-cron');
const {
  addHours, addDays, addWeeks, addMinutes,
  setHours, setMinutes, setSeconds,
  getTime, format, parse: dateParse, // Renamed to avoid conflict with native JSON.parse
  isFuture, startOfTomorrow, endOfDay, isValid,
  // Add specific weekday functions if needed later e.g., nextMonday
} = require('date-fns');

console.log('Bot is starting...');

// Discord Client Initialization
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Required to read message content
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessageReactions, // For emoji interactions later
    GatewayIntentBits.DirectMessageReactions // For emoji interactions later
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction] // Required for DMs and uncached reactions
});

// SQLite Database Initialization
const db = new sqlite3.Database('./reminders.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      userTag TEXT NOT NULL,
      content TEXT NOT NULL,
      dueTime INTEGER, /* Store as Unix timestamp (seconds) for easy comparison */
      isRecurring BOOLEAN DEFAULT 0,
      recurrencePattern TEXT,
      channelId TEXT NOT NULL,
      messageId TEXT,
      status TEXT DEFAULT 'pending', /* pending, done, snoozed, deleted */
      createdAt INTEGER DEFAULT (cast(strftime('%s', 'now') as int))
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS motivational_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL,
      category TEXT DEFAULT 'general'
    )`);
  }
});

// Helper function to parse time strings - can be expanded significantly
function parseTimeText(timeText, baseDate = new Date()) {
  if (!timeText) return null;
  const now = baseDate;
  let date = null;

  // "in X unit"
  let match = timeText.match(/in\s+(\d+)\s+(minute|min|hour|hr|day|week)s?/i);
  if (match) {
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    if (unit.startsWith('minute') || unit.startsWith('min')) date = addMinutes(now, value);
    else if (unit.startsWith('hour') || unit.startsWith('hr')) date = addHours(now, value);
    else if (unit.startsWith('day')) date = addDays(now, value);
    else if (unit.startsWith('week')) date = addWeeks(now, value);
  }

  // "tomorrow (at HH:MM am/pm)?"
  if (!date) {
    match = timeText.match(/tomorrow(?:\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/i);
    if (match) {
      date = startOfTomorrow();
      const hour = parseInt(match[1]);
      const minute = parseInt(match[2]) || 0;
      let actualHour = hour;
      if (match[3] && match[3].toLowerCase() === 'pm' && hour < 12) actualHour += 12;
      if (match[3] && match[3].toLowerCase() === 'am' && hour === 12) actualHour = 0; // Midnight
      if (!isNaN(actualHour)) {
        date = setHours(date, actualHour);
        if (!isNaN(minute)) date = setMinutes(date, minute);
      }
    }
  }
  
  // "at HH:MM (am/pm)? (today)?" - assumes today if time is future, otherwise tomorrow
   if (!date) {
    match = timeText.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?(?:\s+(today|tomorrow))?/i);
    if (match) {
        let hour = parseInt(match[1]);
        const minute = parseInt(match[2]) || 0;
        const ampm = match[3] ? match[3].toLowerCase() : null;
        const daySpecifier = match[4] ? match[4].toLowerCase() : null;

        if (ampm === 'pm' && hour < 12) hour += 12;
        if (ampm === 'am' && hour === 12) hour = 0; // Midnight case

        date = setSeconds(setMinutes(setHours(new Date(), hour), minute), 0);

        if (daySpecifier === 'tomorrow') {
            date = addDays(date, 1);
        } else if (!daySpecifier && !isFuture(date)) { // If "today" implied but time is past, assume tomorrow
            date = addDays(date, 1);
        }
    }
  }

  // Basic "todo" or no time specified means no specific due time for now
  if (timeText.match(/^todo\b/i) && !date) {
    return null; // Or a default like endOfDay(now)
  }
  
  return date && isValid(date) && isFuture(date) ? getTime(date) / 1000 : null; // Return Unix timestamp in seconds
}


const reminderPatterns = [
  // remind me to <task> in <number> <unit> | remind me <task> in <number> <unit>
  {
    regex: /remind\s*(?:me\s*to)?\s*(.+?)\s+(in\s+\d+\s+(?:minute|min|hour|hr|day|week)s?)/i,
    parser: (match) => ({ task: match[1].trim(), timeText: match[2].trim() })
  },
  // remind me to <task> tomorrow (at HH:MM am/pm)? | remind me <task> tomorrow (at HH:MM am/pm)?
  {
    regex: /remind\s*(?:me\s*to)?\s*(.+?)\s+(tomorrow(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?)/i,
    parser: (match) => ({ task: match[1].trim(), timeText: match[2].trim() })
  },
   // remind me to <task> at <time> (am/pm)? (today/tomorrow)?
  {
    regex: /remind\s*(?:me\s*to)?\s*(.+?)\s+(at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?(?:\s+today|\s+tomorrow)?)/i,
    parser: (match) => ({ task: match[1].trim(), timeText: match[2].trim() })
  },
  // todo <task> (with optional time phrases that might be caught by above or parsed directly)
  // This is a bit more generic, ensure specific time phrases are part of the task if not parsed separately
  {
    regex: /todo\s+(.+)/i,
    parser: (match) => {
        const fullTask = match[1].trim();
        // Try to see if a time phrase is at the end of the todo
        const timeMatch = fullTask.match(/(.*?)\s*((?:in|at|tomorrow).*)$/i);
        if (timeMatch && timeMatch[2]) {
            return { task: timeMatch[1].trim(), timeText: timeMatch[2].trim() };
        }
        return { task: fullTask, timeText: null }; // Default to no specific time
    }
  },
   // "remind <anything>" - a general catch-all if no specific time pattern is matched within "anything"
   // This regex should be less greedy with (.+) if more specific time patterns are to be extracted from "anything" later
  {
    regex: /^remind\s+(.+)/i, // General catch-all, might need refinement
    parser: (match) => {
        const fullText = match[1].trim();
        // Attempt to extract time-like phrases from the end of the fullText
        // This is a simplified approach; a more robust NLP-like parser would be better for complex cases
        const timeKeywords = ["in ", "at ", "tomorrow", "next week", "on monday"]; // Add more
        let task = fullText;
        let timeText = null;

        for (const keyword of timeKeywords) {
            const keywordIndex = fullText.toLowerCase().lastIndexOf(keyword);
            if (keywordIndex !== -1) {
                // Check if it's a plausible time phrase (e.g., not "in the middle of something")
                const potentialTimeText = fullText.substring(keywordIndex);
                // A simple heuristic: if it contains a number or specific day, it's more likely time
                if (potentialTimeText.match(/\d+|monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today/i)) {
                    task = fullText.substring(0, keywordIndex).trim();
                    timeText = potentialTimeText.trim();
                    break;
                }
            }
        }
        return { task, timeText };
    }
  }
];

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity('for your reminders! (no /commands)', { type: 'WATCHING' });
});

client.on('messageCreate', async msg => {
  if (msg.author.bot) return;
  // Allow bot to work in DMs or specified channels
  if (msg.channel.type === Partials.Channel && !client.guilds.cache.get(msg.guildId)?.channels.cache.get(msg.channelId) && msg.channel.type !== 'DM') {
      // If it's a partial channel and not a known guild channel, and not a DM, ignore (e.g. thread without bot perms)
      return;
  }

  const rawContent = msg.content; // Keep original casing for task

  if (rawContent.toLowerCase() === 'ping bot') {
    msg.reply('Pong!');
    return;
  }

  for (const pattern of reminderPatterns) {
    const match = rawContent.match(pattern.regex);
    if (match) {
      try {
        const parsed = pattern.parser(match);
        let taskContent = parsed.task;
        // Ensure task content is not empty after parsing
        if (!taskContent || taskContent.trim() === "") {
            // If task is empty, it might be a malformed command or only a time phrase
            // Example: "remind me in 2 hours" -> task might be empty.
            // For now, let's assume if task is empty, it's not a valid reminder.
            continue; // Try next pattern
        }

        const dueTime = parseTimeText(parsed.timeText); // Pass full timeText part
        
        // Use original casing for the task content
        const finalTask = taskContent; 

        const stmt = db.prepare("INSERT INTO reminders (userId, userTag, content, dueTime, channelId, createdAt) VALUES (?, ?, ?, ?, ?, cast(strftime('%s', 'now') as int))");
        stmt.run(msg.author.id, msg.author.tag, finalTask, dueTime, msg.channel.id, function(err) {
          if (err) {
            console.error("DB insert error:", err.message);
            msg.reply("Oops! I couldn't save that reminder. Something went wrong on my end. Please try again.");
            return;
          }
          const reminderId = this.lastID;
          let replyMessage = `On it! I'll remind you to: "${finalTask}"`;
          if (dueTime) {
            replyMessage += ` on ${format(new Date(dueTime * 1000), 'PPPPp')}.`; // e.g., "Tuesday, May 18th, 2025 at 3:30 AM"
          } else {
            replyMessage += `. I've added it to your list (no specific time).`;
          }
          replyMessage += ` (ID: ${reminderId})`;
          // TODO: Add buttons here in Step 4
          msg.reply(replyMessage).catch(console.error);
        });
        stmt.finalize();
        return; // Reminder handled
      } catch (error) {
        console.error("Error processing reminder:", error, "Original message:", rawContent);
        // Don't send a reply for every processing error, as it could be a non-reminder message partially matching a regex.
        // Only reply if we were fairly certain it was an attempt at a reminder.
        // For now, just log and continue to see if other patterns match.
      }
    }
  }
});

// TODO: Implement interactionCreate for buttons (Step 4)

// TODO: Setup node-cron scheduled tasks (Step 3 & 5)

if (process.env.DISCORD_TOKEN) {
  client.login(process.env.DISCORD_TOKEN);
} else {
  console.error('Error: DISCORD_TOKEN not found in .env file.');
  console.log('Please create a .env file in the root directory (c:\\Users\\mason\\CascadeProjects\\botbot\\.env) and add your DISCORD_TOKEN.');
  console.log('Example: DISCORD_TOKEN=your_bot_token_here');
}

console.log('bot.js with reminder parsing logic loaded.');
