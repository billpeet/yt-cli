import { Command } from 'commander';
import { getConfig } from '../config/store';
import { createClient } from '../api/client';
import { YouTrackUser } from '../api/types';

function printUser(user: YouTrackUser): void {
  console.log(`## Current User`);
  console.log();
  console.log(`Login:  ${user.login}`);
  console.log(`Name:   ${user.name}`);
  if (user.email) console.log(`Email:  ${user.email}`);
  console.log(`ID:     ${user.id}`);
}

export function registerUser(program: Command): void {
  const user = program
    .command('user')
    .description('Manage YouTrack users');

  user
    .command('me')
    .description('Get the currently authenticated user')
    .option('--fields <fields>', 'Comma-separated list of fields to return')
    .option('--format <format>', 'Output format: text or json', 'text')
    .option('--pretty', 'Pretty-print JSON output (only with --format json)')
    .action(async (opts) => {
      let config;
      try {
        config = getConfig();
      } catch (err: unknown) {
        process.stderr.write(JSON.stringify({ error: (err as Error).message }) + '\n');
        process.exit(1);
      }
      const client = createClient(config);
      try {
        const me = await client.getCurrentUser({ fields: opts.fields });
        if (opts.format === 'json') {
          console.log(opts.pretty ? JSON.stringify(me, null, 2) : JSON.stringify(me));
        } else {
          printUser(me);
        }
      } catch (err: unknown) {
        process.stderr.write(JSON.stringify({ error: (err as Error).message }) + '\n');
        process.exit(1);
      }
    });
}
