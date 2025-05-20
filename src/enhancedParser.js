const { format, addMinutes, addHours, addDays, addWeeks, isValid } = require('date-fns');

class EnhancedParser {
  constructor() {
    // Multi-language time patterns: extendable for more languages
    this.timePatternsByLanguage = {
      en: [
        // ...existing English patterns...
      ],
      fr: [
        // Relative time (e.g., "dans 2 heures", "dans 30 minutes")
        {
          regex: /dans\s+(\d+)\s+(minute|heure|jour|semaine)s?/i,
          handler: (match) => {
            const [_, amount, unit] = match;
            const numAmount = parseInt(amount);
            const now = new Date();
            switch (unit.toLowerCase()) {
              case 'minute':
              case 'minutes':
                return addMinutes(now, numAmount);
              case 'heure':
              case 'heures':
                return addHours(now, numAmount);
              case 'jour':
              case 'jours':
                return addDays(now, numAmount);
              case 'semaine':
              case 'semaines':
                return addDays(now, numAmount * 7);
              default:
                return null;
            }
          }
        }
        // Add more French patterns here
        ,
        // Absolute date (e.g., "le 5 mai", "le 12 janvier")
        {
          regex: /le\s+(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/i,
          handler: (match) => {
            const day = parseInt(match[1]);
            const monthNames = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
            const month = monthNames.indexOf(match[2].toLowerCase());
            if (month === -1) return null;
            const now = new Date();
            let date = new Date(now.getFullYear(), month, day);
            if (date < now) date.setFullYear(now.getFullYear() + 1);
            return date;
          }
        }
      ],
      ja: [
        // Relative time (e.g., "2時間後", "5分後")
        {
          regex: /(\d+)(分|時間|日|週間)後/,
          handler: (match) => {
            const amount = parseInt(match[1]);
            const unit = match[2];
            const now = new Date();
            switch (unit) {
              case '分':
                return addMinutes(now, amount);
              case '時間':
                return addHours(now, amount);
              case '日':
                return addDays(now, amount);
              case '週間':
                return addDays(now, amount * 7);
              default:
                return null;
            }
          }
        }
        // Add more Japanese patterns here
        ,
        // Absolute date (e.g., "5月5日", "12月1日")
        {
          regex: /(\d{1,2})月(\d{1,2})日/,
          handler: (match) => {
            const month = parseInt(match[1]) - 1;
            const day = parseInt(match[2]);
            const now = new Date();
            let date = new Date(now.getFullYear(), month, day);
            if (date < now) date.setFullYear(now.getFullYear() + 1);
            return date;
          }
        }
      ],
      es: [
        // Relative time (e.g., "en 2 horas", "en 5 minutos")
        {
          regex: /en\s+(\d+)\s+(minuto|minutos|hora|horas|día|días|semana|semanas)/i,
          handler: (match) => {
            const [_, amount, unit] = match;
            const numAmount = parseInt(amount);
            const now = new Date();
            switch (unit.toLowerCase()) {
              case 'minuto':
              case 'minutos':
                return addMinutes(now, numAmount);
              case 'hora':
              case 'horas':
                return addHours(now, numAmount);
              case 'día':
              case 'días':
                return addDays(now, numAmount);
              case 'semana':
              case 'semanas':
                return addDays(now, numAmount * 7);
              default:
                return null;
            }
          }
        }
        // Add more Spanish patterns here
        ,
        // Absolute date (e.g., "el 5 de mayo", "el 12 de enero")
        {
          regex: /el\s+(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i,
          handler: (match) => {
            const day = parseInt(match[1]);
            const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
            const month = monthNames.indexOf(match[2].toLowerCase());
            if (month === -1) return null;
            const now = new Date();
            let date = new Date(now.getFullYear(), month, day);
            if (date < now) date.setFullYear(now.getFullYear() + 1);
            return date;
          }
        }
      ]
    };


    // English time patterns (legacy, for backward compatibility)
    this.englishPatterns = [
      // Time patterns (e.g., "at 3pm", "at 15:00")
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
      }
    ];

    // Task extraction patterns
    this.taskPatterns = [
      // "remind me to [task] [time]"
      {
        regex: /remind\s+(?:me\s*to\s*)?(.*?)\s*(?:at|on|in|tomorrow|next|tonight|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|$)/i,
        handler: (match) => match[1].trim()
      },
      // "todo [task] [time]"
      {
        regex: /todo\s+(.*?)\s*(?:at|on|in|tomorrow|next|tonight|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|$)/i,
        handler: (match) => match[1].trim()
      },
      // "[task] at [time]"
      {
        regex: /^(.*?)\s+(?:at|on|in|@)\s+(.*)/i,
        handler: (match) => match[1].trim()
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
    if (!text) return { task: '', timeText: '' };

    // First, try to find a time in the text
    let timeText = '';
    let task = text.trim();

    // Try to extract task and time using task patterns
    for (const { regex, handler } of this.taskPatterns) {
      const match = text.match(regex);
      if (match) {
        task = handler(match);
        timeText = text.replace(new RegExp(`^${task}\\s*`, 'i'), '').trim();
        break;
      }
    }

    if (!timeMatch) {
      for (const { regex, handler } of this.taskPatterns) {
        const match = text.match(regex);
        if (match) {
          task = handler(match);
          break;
        }
      }
    }

    return { task, timeText };
  }

  parseReminder(text) {
    const { task, timeText } = this.extractTask(text);
    const time = this.parseTime(timeText);
    
    return {
      task,
      time,
      timeText: time ? format(time, 'PPPPpppp') : null
    };
  }
}

module.exports = EnhancedParser;
