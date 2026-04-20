import { Command } from 'commander';
import { createClient } from '../api/client';
import { YouTrackAgile } from '../api/types';
import { getConfig } from '../config/store';

function printAgileList(agiles: YouTrackAgile[]): void {
  if (agiles.length === 0) {
    console.log('No agile boards found.');
    return;
  }

  const wName = Math.max(4, ...agiles.map((a) => a.name.length));
  const pad = (s: string, n: number) => s.padEnd(n);
  const sep = (n: number) => '-'.repeat(n);

  console.log(`| ${pad('Name', wName)} | ID |`);
  console.log(`|${sep(wName + 2)}|----|`);
  for (const agile of agiles) {
    console.log(`| ${pad(agile.name, wName)} | ${agile.id} |`);
  }
  console.log();
  console.log(`${agiles.length} agile board(s).`);
}

function die(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(JSON.stringify({ error: message }) + '\n');
  process.exit(1);
}

export function registerAgile(program: Command): void {
  const agile = program
    .command('agile')
    .description('Manage YouTrack agile boards');

  agile
    .command('list')
    .description('List accessible agile boards')
    .option('--fields <fields>', 'Comma-separated list of fields to return')
    .option('--format <format>', 'Output format: text or json', 'text')
    .option('--pretty', 'Pretty-print JSON output (only with --format json)')
    .action(async (opts) => {
      let config;
      try {
        config = getConfig();
      } catch (err) {
        die(err);
      }

      const client = createClient(config);
      try {
        const agiles = await client.listAgiles({ fields: opts.fields });
        if (opts.format === 'json') {
          console.log(opts.pretty ? JSON.stringify(agiles, null, 2) : JSON.stringify(agiles));
        } else {
          printAgileList(agiles);
        }
      } catch (err) {
        die(err);
      }
    });
}
