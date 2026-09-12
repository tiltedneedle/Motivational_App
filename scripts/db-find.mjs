/**
 * Which pooler a Supabase project is behind.
 *
 * The direct host (`db.<ref>.supabase.co`) is IPv6-only, and this machine has
 * no IPv6 route; the session pooler is IPv4 but lives at a regional host the
 * dashboard shows and nothing else does. So: try each region with the
 * project's credentials until one answers. Wrong region: "Tenant or user not
 * found". Right region, wrong password: an auth error. Right region: a row.
 *
 *   SUPABASE_REF=… PGPASSWORD=… node scripts/db-find.mjs
 */
import pg from 'pg';

const ref = process.env.SUPABASE_REF;
const password = process.env.PGPASSWORD;
if (!ref || !password) {
  console.error('SUPABASE_REF and PGPASSWORD are required');
  process.exit(2);
}
const REGIONS = [
  'ap-south-1',
  'ap-southeast-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-southeast-2',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-north-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ca-central-1',
  'sa-east-1',
];
for (const region of REGIONS) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const client = new pg.Client({
    host,
    port: 5432,
    user: `postgres.${ref}`,
    password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    await client.connect();
    const r = await client.query('select current_user, version()');
    console.log(`FOUND ${host}`);
    console.log(r.rows[0]);
    await client.end();
    process.exit(0);
  } catch (err) {
    const msg = String(err.message ?? err);
    console.log(`${region.padEnd(16)} ${msg.slice(0, 80)}`);
    await client.end().catch(() => undefined);
    if (/password/i.test(msg)) process.exit(1);
  }
}
console.log('no pooler answered');
process.exit(1);
