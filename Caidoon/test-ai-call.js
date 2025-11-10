/**
 * Simple test script to verify OpenAI integration works
 */

const crypto = require('crypto');

// Configuration
const LLM_PROXY_URL = 'http://localhost:8787';
const HMAC_SECRET = 'test-secret-key-for-development';

// Generate HMAC signature
function generateHmacSignature(body, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
}

// Test encounter generation
async function testEncounterGeneration() {
  console.log('🧪 Testing AI Encounter Generation...\n');

  const requestBody = {
    difficulty: 'easy',
    theme: 'forest adventure',
    playerContext: {
      playerId: 'test-player-123',
      level: 5,
      preferences: ['exploration', 'combat']
    }
  };

  const bodyString = JSON.stringify(requestBody);
  const signature = generateHmacSignature(bodyString, HMAC_SECRET);

  console.log('📤 Sending request to:', `${LLM_PROXY_URL}/gen/encounter`);
  console.log('📝 Request body:', JSON.stringify(requestBody, null, 2));
  console.log('🔐 HMAC Signature:', signature.substring(0, 20) + '...\n');

  try {
    const response = await fetch(`${LLM_PROXY_URL}/gen/encounter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-HMAC-Signature': signature,
      },
      body: bodyString,
    });

    console.log('📥 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Error response:', JSON.stringify(errorData, null, 2));
      return false;
    }

    const encounter = await response.json();
    console.log('\n✅ Success! Generated encounter:');
    console.log('   ID:', encounter.id);
    console.log('   Title:', encounter.title);
    console.log('   Difficulty:', encounter.difficulty);
    console.log('   Objectives:', encounter.objectives?.length || 0);
    console.log('   NPCs:', encounter.npcs?.length || 0);
    console.log('\n📄 Full encounter data:');
    console.log(JSON.stringify(encounter, null, 2));
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.cause) {
      console.error('   Cause:', error.cause);
    }
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 AI Encounters Engine - Test Script\n');
  console.log('=' .repeat(50));
  console.log('\n');

  // Check if server is running
  try {
    console.log('🔍 Checking if LLM Proxy is running...');
    const healthResponse = await fetch(`${LLM_PROXY_URL}/health`);
    if (healthResponse.ok) {
      console.log('✅ LLM Proxy is running!\n');
    } else {
      console.log('⚠️  LLM Proxy responded but health check failed\n');
    }
  } catch (error) {
    console.error('❌ Cannot connect to LLM Proxy at', LLM_PROXY_URL);
    console.error('   Make sure the server is running with: npm run dev\n');
    process.exit(1);
  }

  // Run the test
  const success = await testEncounterGeneration();

  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('✅ All tests passed!');
  } else {
    console.log('❌ Tests failed');
    process.exit(1);
  }
}

main();
