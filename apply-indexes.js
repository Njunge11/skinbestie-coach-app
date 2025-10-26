import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

const indexes = [
  'CREATE INDEX IF NOT EXISTS routine_templates_name_idx ON routine_templates USING btree (name)',
  'CREATE INDEX IF NOT EXISTS skincare_routine_products_time_order_idx ON skincare_routine_products USING btree (time_of_day, "order")',
  'CREATE INDEX IF NOT EXISTS skincare_routines_status_idx ON skincare_routines USING btree (status)',
  'CREATE INDEX IF NOT EXISTS user_profiles_name_idx ON user_profiles USING btree (first_name, last_name)',
];

try {
  for (const index of indexes) {
    console.log(`Applying: ${index.substring(0, 80)}...`);
    await sql.unsafe(index);
    console.log('✓ Done');
  }

  console.log('\n✅ All indexes created successfully');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  await sql.end();
}
