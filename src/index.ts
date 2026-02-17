import { Command } from 'commander';
import { registerSetup } from './commands/setup';
import { registerIssue } from './commands/issue';
import { registerProject } from './commands/project';
import { registerUser } from './commands/user';

const program = new Command();

program
  .name('yt')
  .description('YouTrack CLI — AI-friendly issue tracker interface')
  .version('0.1.0');

registerSetup(program);
registerIssue(program);
registerProject(program);
registerUser(program);

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(JSON.stringify({ error: message }) + '\n');
  process.exit(1);
});
