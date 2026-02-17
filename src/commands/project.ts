import { Command } from 'commander';
import { getConfig } from '../config/store';
import { createClient } from '../api/client';
import { YouTrackProject } from '../api/types';

function printProjectList(projects: YouTrackProject[]): void {
  if (projects.length === 0) {
    console.log('No projects found.');
    return;
  }

  const wShort = Math.max(10, ...projects.map((p) => p.shortName.length));
  const wName = Math.max(4, ...projects.map((p) => p.name.length));

  const pad = (s: string, n: number) => s.padEnd(n);
  const sep = (n: number) => '-'.repeat(n);

  console.log(`| ${pad('Short Name', wShort)} | ${pad('Name', wName)} | ID |`);
  console.log(`|${sep(wShort + 2)}|${sep(wName + 2)}|----|`);
  for (const p of projects) {
    console.log(`| ${pad(p.shortName, wShort)} | ${pad(p.name, wName)} | ${p.id} |`);
  }
  console.log();
  console.log(`${projects.length} project(s).`);
}

export function registerProject(program: Command): void {
  const project = program
    .command('project')
    .description('Manage YouTrack projects');

  project
    .command('list')
    .description('List all accessible projects')
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
        const projects = await client.listProjects({ fields: opts.fields });
        if (opts.format === 'json') {
          console.log(opts.pretty ? JSON.stringify(projects, null, 2) : JSON.stringify(projects));
        } else {
          printProjectList(projects);
        }
      } catch (err: unknown) {
        process.stderr.write(JSON.stringify({ error: (err as Error).message }) + '\n');
        process.exit(1);
      }
    });
}
