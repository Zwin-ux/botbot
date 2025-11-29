const { spawn } = require('child_process');
const path = require('path');

function startProcess(command, args, name) {
    const proc = spawn(command, args, {
        stdio: 'pipe',
        shell: true,
        env: { ...process.env, FORCE_COLOR: 'true' },
    });

    proc.stdout.on('data', (data) => {
        console.log(`[${name}] ${data.toString().trim()}`);
    });

    proc.stderr.on('data', (data) => {
        console.error(`[${name}] ${data.toString().trim()}`);
    });

    proc.on('close', (code) => {
        console.log(`[${name}] exited with code ${code}`);
        process.exit(code);
    });

    return proc;
}

console.log('--- Starting BotBot Services ---');

// Start Next.js (Website)
const web = startProcess('npm', ['run', 'web:start'], 'WEB');

// Start Bot (Discord)
// We use npx tsx to ensure we use the local version
const bot = startProcess('npx', ['tsx', 'src/main.ts'], 'BOT');

// Handle shutdown
process.on('SIGINT', () => {
    web.kill();
    bot.kill();
    process.exit();
});

process.on('SIGTERM', () => {
    web.kill();
    bot.kill();
    process.exit();
});
