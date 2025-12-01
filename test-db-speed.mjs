// Quick test to measure actual database query performance
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  idle_timeout: 0,
});

console.log('Testing database query performance...\n');

async function testQuery(name, query) {
  const start = Date.now();
  try {
    await query();
    const duration = Date.now() - start;
    console.log(`✅ ${name}: ${duration}ms`);
    return duration;
  } catch (error) {
    const duration = Date.now() - start;
    console.log(`❌ ${name}: ${duration}ms - ${error.message}`);
    return duration;
  }
}

async function runTests() {
  const durations = [];

  // Test 1: Simple ping
  durations.push(await testQuery('SELECT 1 (ping)', () => sql`SELECT 1`));

  // Test 2: Count user_profiles
  durations.push(await testQuery('COUNT user_profiles', () => sql`SELECT COUNT(*) FROM user_profiles`));

  // Test 3: Get one user profile
  durations.push(await testQuery('SELECT one user_profile', () =>
    sql`SELECT * FROM user_profiles LIMIT 1`
  ));

  // Test 4: Check if indexes exist
  durations.push(await testQuery('Check indexes', () =>
    sql`SELECT indexname FROM pg_indexes WHERE tablename IN ('user_profiles', 'coach_notes', 'progress_photos', 'skincare_routines', 'routine_templates') ORDER BY indexname`
  ));

  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  console.log(`\n📊 Average query time: ${avg.toFixed(0)}ms`);

  if (avg > 200) {
    console.log('⚠️  This is VERY slow - likely network latency or database region issue');
  } else if (avg > 50) {
    console.log('⚠️  Slightly slow - could be network latency');
  } else {
    console.log('✅ Performance looks good!');
  }

  await sql.end();
}

runTests().catch(console.error);
