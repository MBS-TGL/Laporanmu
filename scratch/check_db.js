import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // Let's try to query the REST API's OpenAPI schema description of the database tables
  // This is open to anonymous users and lists all tables and their columns.
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
    const schema = await res.json();
    
    console.log('--- TABLES IN SCHEMA ---');
    const tables = Object.keys(schema.definitions || {});
    console.log(tables);

    if (schema.definitions && schema.definitions.student_monthly_reports) {
      console.log('\n--- COLUMNS IN student_monthly_reports ---');
      console.log(Object.keys(schema.definitions.student_monthly_reports.properties || {}));
    } else {
      console.log('\nstudent_monthly_reports definition not found in OpenAPI schema');
    }
  } catch (err) {
    console.error('Error fetching OpenAPI schema:', err);
  }
}

check();
