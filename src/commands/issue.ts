import { Command } from 'commander';
import { getConfig } from '../config/store';
import { createClient } from '../api/client';
import { YouTrackCustomFieldUpdate, YouTrackIssue, YouTrackComment } from '../api/types';

// ---------------------------------------------------------------------------
// Text formatting helpers
// ---------------------------------------------------------------------------

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value || '—';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    const names = value.map((v) =>
      typeof v === 'object' && v !== null
        ? String((v as Record<string, unknown>)['name'] ?? '?')
        : String(v)
    );
    return names.filter(Boolean).join(', ') || '—';
  }
  if (typeof value === 'object') {
    const name = (value as Record<string, unknown>)['name'];
    return name != null ? String(name) : '—';
  }
  return '—';
}

function getCustomField(issue: Record<string, unknown>, fieldName: string): string {
  const cfs = issue['customFields'];
  if (!Array.isArray(cfs)) return '—';
  const cf = cfs.find((f) => (f as Record<string, unknown>)['name'] === fieldName);
  if (!cf) return '—';
  return formatFieldValue((cf as Record<string, unknown>)['value']);
}

function formatDate(ts: unknown): string {
  if (!ts || typeof ts !== 'number') return '—';
  return new Date(ts).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

function printIssue(issue: YouTrackIssue): void {
  const id = issue.idReadable ?? issue.id ?? '?';
  console.log(`## ${id}: ${issue.summary ?? '(no summary)'}`);
  console.log();

  const proj = issue.project;
  if (proj) console.log(`Project:   ${proj.shortName} — ${proj.name}`);

  const rep = issue.reporter;
  console.log(`Reporter:  ${rep ? `${rep.name} (${rep.login})` : '—'}`);

  const asgn = issue.assignee;
  console.log(`Assignee:  ${asgn ? `${asgn.name} (${asgn.login})` : '—'}`);

  console.log(`Created:   ${formatDate(issue.created)}`);
  console.log(`Updated:   ${formatDate(issue.updated)}`);
  console.log(`Resolved:  ${issue.resolved ? formatDate(issue.resolved) : '—'}`);

  const cfs = issue.customFields;
  if (cfs && cfs.length > 0) {
    const meaningful = cfs.filter((cf) => formatFieldValue(cf.value) !== '—');
    if (meaningful.length > 0) {
      console.log();
      console.log('### Custom Fields');
      for (const cf of meaningful) {
        console.log(`${cf.name.padEnd(18)} ${formatFieldValue(cf.value)}`);
      }
    }
  }

  if (issue.description && issue.description.trim()) {
    console.log();
    console.log('### Description');
    console.log(issue.description);
  }
}

function printIssueList(issues: YouTrackIssue[]): void {
  if (issues.length === 0) {
    console.log('No issues found.');
    return;
  }

  const rows = issues.map((iss) => ({
    id: iss.idReadable ?? iss.id ?? '?',
    state: getCustomField(iss as unknown as Record<string, unknown>, 'State'),
    priority: getCustomField(iss as unknown as Record<string, unknown>, 'Priority'),
    assignee: iss.assignee ? String(iss.assignee.name) : '—',
    summary: iss.summary ?? '',
  }));

  const wId = Math.max(2, ...rows.map((r) => r.id.length));
  const wState = Math.max(5, ...rows.map((r) => r.state.length));
  const wPriority = Math.max(8, ...rows.map((r) => r.priority.length));
  const wAssignee = Math.max(8, ...rows.map((r) => r.assignee.length));

  const pad = (s: string, n: number) => s.padEnd(n);
  const sep = (n: number) => '-'.repeat(n);

  console.log(
    `| ${pad('ID', wId)} | ${pad('State', wState)} | ${pad('Priority', wPriority)} | ${pad('Assignee', wAssignee)} | Summary |`
  );
  console.log(
    `|${sep(wId + 2)}|${sep(wState + 2)}|${sep(wPriority + 2)}|${sep(wAssignee + 2)}|---------|`
  );
  for (const r of rows) {
    console.log(
      `| ${pad(r.id, wId)} | ${pad(r.state, wState)} | ${pad(r.priority, wPriority)} | ${pad(r.assignee, wAssignee)} | ${r.summary} |`
    );
  }
  console.log();
  console.log(`${rows.length} issue(s) returned.`);
}

function printComment(comment: YouTrackComment): void {
  const author = comment.author ? `${comment.author.name} (${comment.author.login})` : 'Unknown';
  console.log(`Comment ID: ${comment.id}`);
  console.log(`Author:     ${author}`);
  console.log(`Created:    ${formatDate(comment.created)}`);
  if (comment.updated && comment.updated !== comment.created) {
    console.log(`Updated:    ${formatDate(comment.updated)}`);
  }
  console.log();
  console.log(comment.text);
}

function printCommentList(comments: YouTrackComment[]): void {
  if (comments.length === 0) {
    console.log('No comments.');
    return;
  }
  comments.forEach((c, i) => {
    if (i > 0) console.log();
    console.log('---');
    printComment(c);
  });
}

// ---------------------------------------------------------------------------
// Error helper
// ---------------------------------------------------------------------------

function die(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(JSON.stringify({ error: message }) + '\n');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Command registration
// ---------------------------------------------------------------------------

export function registerIssue(program: Command): void {
  const issue = program
    .command('issue')
    .description('Manage YouTrack issues');

  // yt issue search <query>
  issue
    .command('search <query>')
    .description('Search issues using YouTrack query syntax')
    .option('--top <n>', 'Maximum results to return', '50')
    .option('--skip <n>', 'Number of results to skip', '0')
    .option('--fields <fields>', 'Comma-separated list of fields to return')
    .option('--format <format>', 'Output format: text or json', 'text')
    .option('--pretty', 'Pretty-print JSON output (only with --format json)')
    .action(async (query, opts) => {
      let config;
      try { config = getConfig(); } catch (err) { die(err); }
      const client = createClient(config);
      try {
        const issues = await client.searchIssues(query, {
          top: parseInt(opts.top, 10),
          skip: parseInt(opts.skip, 10),
          fields: opts.fields,
        });
        if (opts.format === 'json') {
          console.log(opts.pretty ? JSON.stringify(issues, null, 2) : JSON.stringify(issues));
        } else {
          printIssueList(issues);
        }
      } catch (err) { die(err); }
    });

  // yt issue get <id>
  issue
    .command('get <id>')
    .description('Get a specific issue by ID')
    .option('--fields <fields>', 'Comma-separated list of fields to return')
    .option('--format <format>', 'Output format: text or json', 'text')
    .option('--pretty', 'Pretty-print JSON output (only with --format json)')
    .action(async (id, opts) => {
      let config;
      try { config = getConfig(); } catch (err) { die(err); }
      const client = createClient(config);
      try {
        const iss = await client.getIssue(id, { fields: opts.fields });
        if (opts.format === 'json') {
          console.log(opts.pretty ? JSON.stringify(iss, null, 2) : JSON.stringify(iss));
        } else {
          printIssue(iss);
        }
      } catch (err) { die(err); }
    });

  // yt issue create
  issue
    .command('create')
    .description('Create a new issue')
    .requiredOption('--project <project>', 'Project short name or ID')
    .requiredOption('--summary <summary>', 'Issue summary/title')
    .option('--description <description>', 'Issue description')
    .option('--format <format>', 'Output format: text or json', 'text')
    .option('--pretty', 'Pretty-print JSON output (only with --format json)')
    .action(async (opts) => {
      let config;
      try { config = getConfig(); } catch (err) { die(err); }
      const client = createClient(config);
      try {
        const iss = await client.createIssue(opts.project, opts.summary, opts.description);
        if (opts.format === 'json') {
          console.log(opts.pretty ? JSON.stringify(iss, null, 2) : JSON.stringify(iss));
        } else {
          console.log(`Created ${iss.idReadable}`);
          console.log();
          printIssue(iss);
        }
      } catch (err) { die(err); }
    });

  // yt issue update <id>
  issue
    .command('update <id>')
    .description('Update an existing issue')
    .option('--summary <summary>', 'New summary/title')
    .option('--description <description>', 'New description')
    .option('--field <field>', 'Custom field in "Name=Value" format (repeatable)', collect, [])
    .option('--format <format>', 'Output format: text or json', 'text')
    .option('--pretty', 'Pretty-print JSON output (only with --format json)')
    .action(async (id, opts) => {
      let config;
      try { config = getConfig(); } catch (err) { die(err); }
      const client = createClient(config);

      const customFields: YouTrackCustomFieldUpdate[] = (opts.field as string[]).map((f) => {
        const eqIdx = f.indexOf('=');
        if (eqIdx === -1) {
          process.stderr.write(
            JSON.stringify({ error: `Invalid --field format: "${f}". Expected "Name=Value".` }) + '\n'
          );
          process.exit(1);
        }
        return { name: f.substring(0, eqIdx), value: f.substring(eqIdx + 1) };
      });

      try {
        const iss = await client.updateIssue(id, {
          summary: opts.summary,
          description: opts.description,
          customFields: customFields.length > 0 ? customFields : undefined,
        });
        if (opts.format === 'json') {
          console.log(opts.pretty ? JSON.stringify(iss, null, 2) : JSON.stringify(iss));
        } else {
          console.log(`Updated ${iss.idReadable}`);
          console.log();
          printIssue(iss);
        }
      } catch (err) { die(err); }
    });

  // yt issue comments <id>
  issue
    .command('comments <id>')
    .description('List comments on an issue')
    .option('--fields <fields>', 'Comma-separated list of fields to return')
    .option('--format <format>', 'Output format: text or json', 'text')
    .option('--pretty', 'Pretty-print JSON output (only with --format json)')
    .action(async (id, opts) => {
      let config;
      try { config = getConfig(); } catch (err) { die(err); }
      const client = createClient(config);
      try {
        const comments = await client.getComments(id, { fields: opts.fields });
        if (opts.format === 'json') {
          console.log(opts.pretty ? JSON.stringify(comments, null, 2) : JSON.stringify(comments));
        } else {
          printCommentList(comments);
        }
      } catch (err) { die(err); }
    });

  // yt issue comment <id>
  issue
    .command('comment <id>')
    .description('Add a comment to an issue')
    .requiredOption('--text <text>', 'Comment text')
    .option('--format <format>', 'Output format: text or json', 'text')
    .option('--pretty', 'Pretty-print JSON output (only with --format json)')
    .action(async (id, opts) => {
      let config;
      try { config = getConfig(); } catch (err) { die(err); }
      const client = createClient(config);
      try {
        const comment = await client.addComment(id, opts.text);
        if (opts.format === 'json') {
          console.log(opts.pretty ? JSON.stringify(comment, null, 2) : JSON.stringify(comment));
        } else {
          console.log(`Comment added to ${id}`);
          console.log();
          printComment(comment);
        }
      } catch (err) { die(err); }
    });
}

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}
