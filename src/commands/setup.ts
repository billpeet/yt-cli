import { Command } from 'commander';
import chalk from 'chalk';
import { saveConfig, getConfigFilePath } from '../config/store';
import { createClient } from '../api/client';

export function registerSetup(program: Command): void {
  program
    .command('setup')
    .description('Configure YouTrack connection (URL and API token)')
    .requiredOption('--url <url>', 'YouTrack base URL (e.g. https://yourcompany.youtrack.cloud)')
    .requiredOption('--token <token>', 'YouTrack permanent API token')
    .option('--format <format>', 'Output format: text or json', 'text')
    .action(async (opts) => {
      const config = { baseUrl: opts.url, token: opts.token };

      // Validate by calling the API
      const client = createClient(config);
      let user;
      try {
        user = await client.getCurrentUser();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(
          JSON.stringify({ error: 'Connection failed', details: message }) + '\n'
        );
        process.exit(1);
      }

      saveConfig(config);

      if (opts.format === 'text') {
        console.log(chalk.green('✓ Configuration saved to ' + getConfigFilePath()));
        console.log(chalk.green(`✓ Connected as ${user.name} (${user.login})`));
      } else {
        console.log(
          JSON.stringify({ ok: true, configFile: getConfigFilePath(), user }, null, 2)
        );
      }
    });
}
