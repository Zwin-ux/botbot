const { format, addMinutes, addHours, addDays, addWeeks, isValid } = require('date-fns');

/**
 * Enhanced natural language parser with broader pattern recognition
 */
class EnhancedParserExtended {
  constructor() {
    this.timePatterns = [
      // Basic time patterns (e.g., "at 3pm", "at 15:00")
      {
        regex: /(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i,
        handler: (match, baseDate = new Date()) => {
          let [_, hours, minutes = '00', period] = match;
          hours = parseInt(hours);
          minutes = parseInt(minutes);

          // Convert to 24-hour format
          if (period?.toLowerCase() === 'pm' && hours < 12) hours += 12;
          if (period?.toLowerCase() === 'am' && hours === 12) hours = 0;

          let date = new Date(baseDate);
          date.setHours(hours, minutes, 0, 0);

          // If the time has already passed today, set it for tomorrow
          if (date <= new Date()) {
            date = addDays(date, 1);
          }

          return date;
        }
      },
      // Relative time (e.g., "in 2 hours", "in 30 minutes")
      {
        regex: /in\s+(\d+)\s+(minute|hour|day|week)s?/i,
        handler: (match) => {
          const [_, amount, unit] = match;
          const numAmount = parseInt(amount);
          const now = new Date();

          switch (unit.toLowerCase()) {
            case 'minute':
            case 'minutes':
              return addMinutes(now, numAmount);
            case 'hour':
            case 'hours':
              return addHours(now, numAmount);
            case 'day':
            case 'days':
              return addDays(now, numAmount);
            case 'week':
            case 'weeks':
              return addDays(now, numAmount * 7);
          }
        }
      },
      // Days of the week (e.g., "on monday", "next friday")
      {
        regex: /(?:on\s+)?(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
        handler: (match) => {
          const [_, next, day] = match;
          const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const targetDay = days.indexOf(day.toLowerCase());
          let date = new Date();
          
          // Set to next occurrence of that day
          date.setDate(date.getDate() + ((targetDay + 7 - date.getDay()) % 7));
          
          // If "next" is specified or if the day has already passed this week
          if (next || date <= new Date()) {
            date.setDate(date.getDate() + 7);
          }
          
          date.setHours(9, 0, 0, 0); // Default to 9 AM
          return date;
        }
      },
      // Extended time phrases (e.g., "noon", "midnight", "this evening")
      {
        regex: /(noon|midnight|morning|afternoon|evening|tonight)/i,
        handler: (match) => {
          const [_, timePhrase] = match;
          const now = new Date();
          let hours = 0;
          
          switch (timePhrase.toLowerCase()) {
            case 'noon':
              hours = 12;
              break;
            case 'midnight':
              hours = 0;
              // If it's already past midnight, set for next day
              if (now.getHours() > 0) {
                return addDays(new Date(now.setHours(0, 0, 0, 0)), 1);
              }
              break;
            case 'morning':
              hours = 8;
              break;
            case 'afternoon':
              hours = 14; // 2 PM
              break;
            case 'evening':
            case 'tonight':
              hours = 20; // 8 PM
              break;
          }
          
          const date = new Date(now);
          date.setHours(hours, 0, 0, 0);
          
          // If the time has already passed today, set for tomorrow
          if (date <= now) {
            return addDays(date, 1);
          }
          
          return date;
        }
      },
      // Dates (e.g., "on May 15th", "January 1st")
      {
        regex: /(?:on\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)/i,
        handler: (match) => {
          const [_, day, month] = match;
          const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
          const monthIndex = months.indexOf(month.toLowerCase());
          
          if (monthIndex === -1) return null;
          
          const now = new Date();
          let year = now.getFullYear();
          
          // Create the date
          const date = new Date(year, monthIndex, parseInt(day), 9, 0, 0, 0); // Default to 9 AM
          
          // If the date has already passed this year, set for next year
          if (date <= now) {
            date.setFullYear(year + 1);
          }
          
          return date;
        }
      },
      // "This Friday", "This weekend", etc.
      {
        regex: /this\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend)/i,
        handler: (match) => {
          const [_, dayOrWeekend] = match;
          const now = new Date();
          
          if (dayOrWeekend.toLowerCase() === 'weekend') {
            // Set to upcoming Saturday at 12 PM
            const daysUntilSaturday = (6 - now.getDay() + 7) % 7; // 6 is Saturday
            const date = new Date(now);
            date.setDate(date.getDate() + daysUntilSaturday);
            date.setHours(12, 0, 0, 0);
            return date;
          } else {
            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const targetDay = days.indexOf(dayOrWeekend.toLowerCase());
            
            // Calculate days until the target day
            let daysUntil = (targetDay - now.getDay() + 7) % 7;
            if (daysUntil === 0) {
              // If today is the target day and it's before noon, set it for today at noon
              // Otherwise, set it for next week
              if (now.getHours() < 12) {
                const date = new Date(now);
                date.setHours(12, 0, 0, 0);
                return date;
              } else {
                daysUntil = 7;
              }
            }
            
            const date = new Date(now);
            date.setDate(date.getDate() + daysUntil);
            date.setHours(9, 0, 0, 0);
            return date;
          }
        }
      }
    ];

    // Task extraction patterns - expanded for more natural phrasing
    this.taskPatterns = [
      // Standard reminder format
      {
        regex: /remind\s+(?:me|us|everyone|the team|#\w+)?\s*(?:to\s*)?(.*?)(?:\s+(?:at|on|in|by|tomorrow|next|tonight|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|noon|midnight|morning|afternoon|evening|this|every|daily|weekly)|$)/i,
        handler: (match) => match[1].trim()
      },
      // Todo format
      {
        regex: /(?:todo|task|add|create)\s+(.*?)(?:\s+(?:at|on|in|by|tomorrow|next|tonight|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|noon|midnight|morning|afternoon|evening|this|every|daily|weekly)|$)/i,
        handler: (match) => match[1].trim()
      },
      // Need to / Have to format
      {
        regex: /(?:need to|have to|must|should)\s+(.*?)(?:\s+(?:at|on|in|by|tomorrow|next|tonight|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|noon|midnight|morning|afternoon|evening|this|every|daily|weekly)|$)/i,
        handler: (match) => match[1].trim()
      },
      // Task at time format
      {
        regex: /^(.*?)\s+(?:at|on|in|by)\s+(.*)/i,
        handler: (match) => match[1].trim()
      },
      // "Don't forget to" format
      {
        regex: /(?:don'?t forget|remember) to\s+(.*?)(?:\s+(?:at|on|in|by|tomorrow|next|tonight|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|noon|midnight|morning|afternoon|evening|this|every|daily|weekly)|$)/i,
        handler: (match) => match[1].trim()
      },
      // "I need a reminder to" format
      {
        regex: /(?:i need|set|create) a reminder to\s+(.*?)(?:\s+(?:at|on|in|by|tomorrow|next|tonight|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|noon|midnight|morning|afternoon|evening|this|every|daily|weekly)|$)/i,
        handler: (match) => match[1].trim()
      }
    ];
    
    // Recurring time patterns
    this.recurringPatterns = [
      {
        regex: /(?:every|each)\s+(day|morning|evening|night|week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekday|weekend)(?:\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/i,
        handler: (match) => {
          const [_, period, hours, minutes, ampm] = match;
          const frequency = period.toLowerCase();
          
          // Default time is 9am if not specified
          let hour = hours ? parseInt(hours) : 9;
          const minute = minutes ? parseInt(minutes) : 0;
          
          // Convert to 24-hour format if AM/PM is specified
          if (ampm?.toLowerCase() === 'pm' && hour < 12) hour += 12;
          if (ampm?.toLowerCase() === 'am' && hour === 12) hour = 0;
          
          return {
            frequency,
            hour,
            minute
          };
        }
      },
      {
        regex: /(?:daily|weekly|monthly)(?:\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/i,
        handler: (match) => {
          const [_, hours, minutes, ampm] = match;
          const frequency = match[0].startsWith('daily') ? 'day' : 
                            match[0].startsWith('weekly') ? 'week' : 'month';
          
          // Default time is 9am if not specified
          let hour = hours ? parseInt(hours) : 9;
          const minute = minutes ? parseInt(minutes) : 0;
          
          // Convert to 24-hour format if AM/PM is specified
          if (ampm?.toLowerCase() === 'pm' && hour < 12) hour += 12;
          if (ampm?.toLowerCase() === 'am' && hour === 12) hour = 0;
          
          return {
            frequency,
            hour,
            minute
          };
        }
      }
    ];
    
    // Target extraction patterns (me, us, @user, #channel, team, everyone)
    this.targetPatterns = [
      {
        regex: /remind\s+(me|us|everyone|all|the team|the channel)\s+to/i,
        handler: (match) => {
          const target = match[1].toLowerCase();
          if (target === 'me') return { type: 'user', self: true };
          if (target === 'us' || target === 'everyone' || target === 'all' || target === 'the team') return { type: 'group', target: 'everyone' };
          if (target === 'the channel') return { type: 'channel', target: 'current' };
          return { type: 'user', self: true }; // Default to self
        }
      },
      {
        regex: /remind\s+(\@[\w-]+|#[\w-]+)\s+to/i,
        handler: (match) => {
          const target = match[1];
          if (target.startsWith('@')) return { type: 'user', target: target.substring(1) };
          if (target.startsWith('#')) return { type: 'channel', target: target.substring(1) };
          return { type: 'user', self: true }; // Default to self
        }
      }
    ];
    
    // Priority patterns
    this.priorityPatterns = [
      {
        regex: /(high|important|urgent|critical)\s+priority\s*:/i,
        priority: 3
      },
      {
        regex: /(medium|normal)\s+priority\s*:/i,
        priority: 2
      },
      {
        regex: /(low)\s+priority\s*:/i,
        priority: 1
      },
      {
        regex: /\s+!\s+/,
        priority: 3
      },
      {
        regex: /\s+!!\s+/,
        priority: 3
      }
    ];
  }

  parseTime(text, baseDate = new Date()) {
    if (!text) return null;

    // Common time phrases
    const timePhrases = {
      'now': () => new Date(Date.now() + 60000), // 1 minute from now
      'in a minute': () => addMinutes(new Date(), 1),
      'in an hour': () => addHours(new Date(), 1),
      'in a day': () => addDays(new Date(), 1),
      'in a week': () => addWeeks(new Date(), 1),
      'tomorrow': () => {
        const date = addDays(new Date(), 1);
        date.setHours(9, 0, 0, 0); // Default to 9 AM
        return date;
      },
      'tonight': () => {
        const date = new Date();
        date.setHours(20, 0, 0, 0); // 8 PM
        if (date <= new Date()) {
          date.setDate(date.getDate() + 1); // If it's already past 8 PM, set for tomorrow
        }
        return date;
      },
      'this morning': () => {
        const date = new Date();
        date.setHours(9, 0, 0, 0);
        if (date <= new Date()) {
          date.setDate(date.getDate() + 1); // If it's already past morning, set for tomorrow
        }
        return date;
      },
      'this afternoon': () => {
        const date = new Date();
        date.setHours(14, 0, 0, 0); // 2 PM
        if (date <= new Date()) {
          date.setDate(date.getDate() + 1); // If it's already past afternoon, set for tomorrow
        }
        return date;
      },
      'this evening': () => {
        const date = new Date();
        date.setHours(18, 0, 0, 0); // 6 PM
        if (date <= new Date()) {
          date.setDate(date.getDate() + 1); // If it's already past evening, set for tomorrow
        }
        return date;
      },
      'next week': () => {
        const date = addDays(new Date(), 7);
        date.setHours(9, 0, 0, 0); // Default to 9 AM
        return date;
      },
      'this week': () => {
        // Set to Friday of this week at noon
        const date = new Date();
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
        const daysToFriday = dayOfWeek === 5 ? 0 : (5 - dayOfWeek + 7) % 7;
        date.setDate(date.getDate() + daysToFriday);
        date.setHours(12, 0, 0, 0);
        return date;
      },
      'next month': () => {
        const date = new Date();
        date.setMonth(date.getMonth() + 1, 1); // 1st day of next month
        date.setHours(9, 0, 0, 0);
        return date;
      }
    };

    const lowerText = text.toLowerCase().trim();
    if (timePhrases[lowerText]) {
      return timePhrases[lowerText]();
    }

    // Try all regex patterns
    for (const { regex, handler } of this.timePatterns) {
      const match = text.toLowerCase().match(regex);
      if (match) {
        try {
          const result = handler(match, new Date(baseDate));
          if (result) return result;
        } catch (e) {
          console.error('Error parsing time:', e);
        }
      }
    }

    return null;
  }

  extractTask(text) {
    if (!text) return { task: '', timeText: '', target: null, recurring: null, priority: 0 };

    // Default response
    let response = {
      task: text.trim(),
      timeText: '',
      target: { type: 'user', self: true },
      recurring: null,
      priority: 0
    };
    
    // Check for priority
    for (const { regex, priority } of this.priorityPatterns) {
      if (regex.test(text)) {
        response.priority = priority;
        // Remove priority marker from task text
        response.task = text.replace(regex, ' ').trim();
        break;
      }
    }
    
    // Check for target
    for (const { regex, handler } of this.targetPatterns) {
      const match = text.match(regex);
      if (match) {
        response.target = handler(match);
        break;
      }
    }
    
    // Look for recurring patterns first
    for (const { regex, handler } of this.recurringPatterns) {
      const match = text.match(regex);
      if (match) {
        response.recurring = handler(match);
        
        // Remove recurring info from task text
        const recurringText = match[0];
        response.task = text.replace(recurringText, '').trim();
        
        // Don't look for one-time patterns if we found a recurring one
        return response;
      }
    }
    
    // Look for time patterns
    let timeMatch = null;
    for (const { regex } of this.timePatterns) {
      const match = text.match(regex);
      if (match) {
        timeMatch = match[0];
        response.timeText = timeMatch.trim();
        
        // Remove the time from the task
        response.task = text.replace(new RegExp(`\\s*${timeMatch}\\s*`, 'i'), ' ').trim();
        break;
      }
    }
    
    // If no time was found and no recurring pattern, try to extract just the task
    if (!timeMatch && !response.recurring) {
      for (const { regex, handler } of this.taskPatterns) {
        const match = text.match(regex);
        if (match) {
          response.task = handler(match);
          break;
        }
      }
    }
    
    return response;
  }

  parseReminder(text) {
    const extracted = this.extractTask(text);
    const time = extracted.timeText ? this.parseTime(extracted.timeText) : null;
    
    return {
      task: extracted.task,
      time,
      timeText: time ? format(time, 'PPPPpppp') : null,
      target: extracted.target,
      recurring: extracted.recurring,
      priority: extracted.priority
    };
  }
}

module.exports = EnhancedParserExtended;
