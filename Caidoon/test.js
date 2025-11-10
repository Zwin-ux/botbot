#!/usr/bin/env node

/**
 * Flexible Test Runner Script
 * 
 * Supports multiple test modes:
 * - Build validation: Checks if all packages compile without errors
 * - TypeScript check: Validates TypeScript compilation
 * - Runtime validation: Runs packages to check for runtime errors
 * - Custom tests: Runs specific test suites when they exist
 * 
 * Usage:
 *   node test.js                    # Run all available tests
 *   node test.js build              # Only build validation
 *   node test.js typescript         # Only TypeScript checks
 *   node test.js runtime            # Runtime validation
 *   node test.js package:core       # Test specific package
 *   node test.js --verbose          # Verbose output
 *   node test.js --help             # Show this help
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const REPO_ROOT = process.cwd();
const VERBOSE = process.argv.includes('--verbose');
const HELP = process.argv.includes('--help');

// Test modes
const TEST_MODES = {
  ALL: 'all',
  BUILD: 'build',
  TYPESCRIPT: 'typescript',
  RUNTIME: 'runtime',
  PACKAGE: 'package'
};

// Packages to test
const PACKAGES = [
  '@ai-encounters/core',
  '@ai-encounters/validators',
  '@ai-encounters/sdk',
  '@ai-encounters/llm-proxy',
  '@ai-encounters/engine'
];

const ADAPTERS = [
  '@ai-encounters/web-next',
  '@ai-encounters/gmod-sidecar'
];

// Color codes for output
const COLORS = {
  RESET: '\x1b[0m',
  BRIGHT: '\x1b[1m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m'
};

function log(msg, color = 'RESET') {
  console.log(`${COLORS[color]}${msg}${COLORS.RESET}`);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'CYAN');
  log(`  ${title}`, 'BRIGHT');
  log(`${'='.repeat(60)}\n`, 'CYAN');
}

function logSuccess(msg) {
  log(`✓ ${msg}`, 'GREEN');
}

function logError(msg) {
  log(`✗ ${msg}`, 'RED');
}

function logWarning(msg) {
  log(`⚠ ${msg}`, 'YELLOW');
}

function logInfo(msg) {
  log(`ℹ ${msg}`, 'BLUE');
}

async function runCommand(cmd, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const defaultOptions = {
      cwd: REPO_ROOT,
      stdio: VERBOSE ? 'inherit' : 'pipe',
      shell: process.platform === 'win32'
    };

    const proc = spawn(cmd, args, { ...defaultOptions, ...options });
    let stdout = '';
    let stderr = '';

    if (!VERBOSE) {
      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
    }

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ code, stdout, stderr });
      } else {
        reject({ code, stdout, stderr, cmd: `${cmd} ${args.join(' ')}` });
      }
    });

    proc.on('error', (err) => {
      reject({ error: err, cmd: `${cmd} ${args.join(' ')}` });
    });
  });
}

async function testBuildValidation() {
  logSection('BUILD VALIDATION TEST');
  
  try {
    logInfo('Building all packages...');
    await runCommand('pnpm', ['build']);
    logSuccess('All packages built successfully');
    return { passed: true };
  } catch (err) {
    logError('Build validation failed');
    if (!VERBOSE && err.stderr) {
      console.log(err.stderr);
    }
    return { passed: false, error: err };
  }
}

async function testTypeScriptValidation() {
  logSection('TYPESCRIPT VALIDATION TEST');
  
  try {
    logInfo('Running TypeScript compiler checks...');
    await runCommand('pnpm', ['exec', 'tsc', '--noEmit']);
    logSuccess('TypeScript validation passed');
    return { passed: true };
  } catch (err) {
    logError('TypeScript validation failed');
    if (!VERBOSE && err.stderr) {
      console.log(err.stderr);
    }
    return { passed: false, error: err };
  }
}

async function testPackageCompilation(packageName) {
  logSection(`PACKAGE COMPILATION TEST: ${packageName}`);
  
  try {
    logInfo(`Building ${packageName}...`);
    await runCommand('pnpm', ['--filter', packageName, 'build']);
    logSuccess(`${packageName} compiled successfully`);
    return { passed: true, package: packageName };
  } catch (err) {
    logError(`${packageName} compilation failed`);
    if (!VERBOSE && err.stderr) {
      console.log(err.stderr);
    }
    return { passed: false, package: packageName, error: err };
  }
}

async function testEngineImports() {
  logSection('ENGINE IMPORTS TEST');
  
  try {
    logInfo('Checking if engine can import all dependencies...');
    const testCode = `
      import('@ai-encounters/core').then(() => console.log('✓ core'))
        .catch(e => { console.error('✗ core:', e.message); process.exit(1); });
      import('@ai-encounters/validators').then(() => console.log('✓ validators'))
        .catch(e => { console.error('✗ validators:', e.message); process.exit(1); });
      import('@ai-encounters/sdk').then(() => console.log('✓ sdk'))
        .catch(e => { console.error('✗ sdk:', e.message); process.exit(1); });
    `;
    
    const testFile = path.join(REPO_ROOT, '.test-imports.mjs');
    fs.writeFileSync(testFile, testCode);
    
    try {
      await runCommand('node', [testFile]);
      logSuccess('All imports validated');
      fs.unlinkSync(testFile);
      return { passed: true };
    } catch (err) {
      fs.unlinkSync(testFile);
      throw err;
    }
  } catch (err) {
    logError('Import validation failed');
    if (err.stderr) {
      console.log(err.stderr);
    }
    return { passed: false, error: err };
  }
}

async function testDockerBuild() {
  logSection('DOCKER BUILD TEST');
  
  try {
    logInfo('Building Docker image for engine service...');
    await runCommand('docker', [
      'build',
      '-f', 'docker/Dockerfile.engine',
      '-t', 'ai-encounters-engine:test',
      '.',
      '--no-cache'
    ]);
    logSuccess('Docker image built successfully');
    return { passed: true };
  } catch (err) {
    logError('Docker build failed');
    if (!VERBOSE && err.stderr) {
      console.log(err.stderr);
    }
    return { passed: false, error: err };
  }
}

async function testRuntimeValidation() {
  logSection('RUNTIME VALIDATION TEST');
  
  const results = [];
  
  // Test engine imports
  results.push(await testEngineImports());
  
  // Optionally test Docker if available
  try {
    await runCommand('docker', ['--version']);
    logInfo('Docker found, running Docker build test...');
    results.push(await testDockerBuild());
  } catch {
    logWarning('Docker not available, skipping Docker build test');
  }
  
  return { passed: results.every(r => r.passed), results };
}

async function showHelp() {
  log(`
Flexible Test Runner for AI Encounters Engine

USAGE:
  node test.js [mode] [options]

MODES:
  all              Run all tests (default)
  build            Test build compilation
  typescript       Test TypeScript validation
  runtime          Test runtime validation
  package:<name>   Test specific package (e.g., package:core)

OPTIONS:
  --verbose        Show detailed output
  --help          Show this help message

EXAMPLES:
  node test.js                       # Run all tests
  node test.js build                 # Only build validation
  node test.js typescript            # Only TypeScript checks
  node test.js package:core          # Test only core package
  node test.js --verbose             # Verbose output
  node test.js build --verbose       # Build test with verbose output

AVAILABLE PACKAGES:
  ${PACKAGES.join(', ')}

ADAPTERS (optional):
  ${ADAPTERS.join(', ')}
  `, 'CYAN');
}

async function runAllTests() {
  const results = {
    build: null,
    typescript: null,
    runtime: null
  };

  logSection('AI ENCOUNTERS ENGINE - COMPREHENSIVE TEST SUITE');
  logInfo('Running all test modes...\n');

  // Build validation
  results.build = await testBuildValidation();

  // TypeScript validation
  results.typescript = await testTypeScriptValidation();

  // Runtime validation
  results.runtime = await testRuntimeValidation();

  return results;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (HELP) {
    showHelp();
    process.exit(0);
  }

  let results = {};
  const testMode = args[0]?.split(':')[0] || TEST_MODES.ALL;
  const packageName = args[0]?.includes(':') ? args[0].split(':')[1] : null;

  try {
    switch (testMode) {
      case TEST_MODES.BUILD:
        results.build = await testBuildValidation();
        break;

      case TEST_MODES.TYPESCRIPT:
        results.typescript = await testTypeScriptValidation();
        break;

      case TEST_MODES.RUNTIME:
        results.runtime = await testRuntimeValidation();
        break;

      case TEST_MODES.PACKAGE:
        if (!packageName) {
          logError('Package name required for package mode');
          logInfo('Usage: node test.js package:<name>');
          process.exit(1);
        }
        const fullPackageName = `@ai-encounters/${packageName}`;
        results.package = await testPackageCompilation(fullPackageName);
        break;

      case TEST_MODES.ALL:
      default:
        results = await runAllTests();
        break;
    }

    // Summary
    logSection('TEST SUMMARY');
    
    let totalTests = 0;
    let passedTests = 0;

    for (const [name, result] of Object.entries(results)) {
      if (result && typeof result === 'object') {
        totalTests++;
        if (result.passed) {
          logSuccess(`${name}: PASSED`);
          passedTests++;
        } else {
          logError(`${name}: FAILED`);
        }
      }
    }

    logInfo(`\nTotal: ${passedTests}/${totalTests} test suites passed\n`);

    if (passedTests === totalTests) {
      logSuccess('All tests passed! ✓');
      process.exit(0);
    } else {
      logError(`${totalTests - passedTests} test suite(s) failed`);
      process.exit(1);
    }

  } catch (err) {
    logError('Test suite encountered an error');
    console.error(err);
    process.exit(1);
  }
}

main();
