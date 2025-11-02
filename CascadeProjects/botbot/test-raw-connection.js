const { Client } = require('pg');

async function testRawConnection() {
  // Test the pooled connection
  const client = new Client({
    connectionString: 'postgresql://postgres:oZ46fTo1FsoRsSPc@db.ayvnpdcdvjngybzwkcor.supabase.com:5432/postgres'
  });

  try {
    console.log('Testing raw PostgreSQL connection...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    const result = await client.query('SELECT version()');
    console.log('✅ Database version:', result.rows[0].version);
    
    // Test if pgvector extension exists
    const vectorTest = await client.query("SELECT * FROM pg_extension WHERE extname = 'vector'");
    if (vectorTest.rows.length > 0) {
      console.log('✅ pgvector extension is installed');
    } else {
      console.log('⚠️  pgvector extension not found - need to install it');
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await client.end();
  }
}

testRawConnection();