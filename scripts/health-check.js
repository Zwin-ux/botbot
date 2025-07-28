#!/usr/bin/env node
/**
 * Health Check Script for BotBot Discord Bot
 * Verifies bot status and critical components
 */

import { Client, GatewayIntentBits } from 'discord.js';
import { existsSync } from 'fs';
import { resolve } from 'path';
import config from '../src/config.js';

console.log('🏥 BotBot Health Check Starting...\n');

let healthScore = 0;
let totalChecks = 0;

function checkPassed(name, status, details = '') {
  totalChecks++;
  if (status) {
    healthScore++;
    console.log(`✅ ${name}: PASS ${details}`);
  } else {
    console.log(`❌ ${name}: FAIL ${details}`);
  }
}

// 1. Environment Variables Check
console.log('🔧 Checking Environment Configuration...');
checkPassed('Discord Token', !!process.env.DISCORD_TOKEN, process.env.DISCORD_TOKEN ? '(configured)' : '(missing)');
checkPassed('Client ID', !!process.env.CLIENT_ID, process.env.CLIENT_ID ? '(configured)' : '(missing)');
checkPassed('Node Environment', !!process.env.NODE_ENV, `(${process.env.NODE_ENV || 'not set'})`);

// 2. File System Check
console.log('\n📁 Checking File System...');
const criticalFiles = [
  'src/index.js',
  'src/config.js',
  'src/enhancedParser.js',
  'src/handlers/naturalMessageHandler.js',
  'src/utils/intentRecognizer.js',
];

criticalFiles.forEach(file => {
  const fullPath = resolve(file);
  checkPassed(`File: ${file}`, existsSync(fullPath));
});

// 3. Database Check
console.log('\n🗄️  Checking Database...');
const dbPath = config.DB_PATH || './data/botbot.db';
checkPassed('Database Path', !!dbPath, `(${dbPath})`);

// 4. Configuration Check
console.log('\n⚙️  Checking Configuration...');
checkPassed('Config Loading', !!config, '(config object exists)');
checkPassed('Database Config', !!config.DB_PATH, `(${config.DB_PATH})`);
checkPassed('Port Config', !!config.PORT, `(${config.PORT})`);

// 5. Discord Connection Test (if token available)
if (process.env.DISCORD_TOKEN) {
  console.log('\n🤖 Testing Discord Connection...');
  
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions,
    ],
  });

  const connectionTimeout = setTimeout(() => {
    checkPassed('Discord Connection', false, '(timeout after 10s)');
    process.exit(1);
  }, 10000);

  client.once('ready', () => {
    clearTimeout(connectionTimeout);
    checkPassed('Discord Connection', true, `(connected as ${client.user.tag})`);
    client.destroy();
    
    // Final Results
    showResults();
  });

  client.on('error', (error) => {
    clearTimeout(connectionTimeout);
    checkPassed('Discord Connection', false, `(error: ${error.message})`);
    showResults();
  });

  try {
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    clearTimeout(connectionTimeout);
    checkPassed('Discord Connection', false, `(login failed: ${error.message})`);
    showResults();
  }
} else {
  console.log('\n🤖 Skipping Discord Connection Test (no token provided)');
  showResults();
}

function showResults() {
  console.log('\n📊 Health Check Results:');
  console.log('─'.repeat(40));
  
  const percentage = Math.round((healthScore / totalChecks) * 100);
  console.log(`Score: ${healthScore}/${totalChecks} (${percentage}%)`);
  
  if (percentage >= 90) {
    console.log('🎉 Status: EXCELLENT - Bot is ready for production!');
    process.exit(0);
  } else if (percentage >= 75) {
    console.log('👍 Status: GOOD - Bot should work with minor issues');
    process.exit(0);
  } else if (percentage >= 50) {
    console.log('⚠️  Status: FAIR - Bot needs attention before deployment');
    process.exit(1);
  } else {
    console.log('❌ Status: POOR - Bot is not ready for deployment');
    process.exit(1);
  }
}
