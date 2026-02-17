import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface Config {
  baseUrl: string;
  token: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.config', 'yt-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export function getConfig(): Config {
  const baseUrl = process.env.YOUTRACK_BASE_URL;
  const token = process.env.YOUTRACK_TOKEN;

  if (baseUrl && token) {
    return { baseUrl, token };
  }

  let fileConfig: Partial<Config> = {};
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    } catch {
      // ignore parse errors, will fail below
    }
  }

  const resolvedUrl = baseUrl ?? fileConfig.baseUrl;
  const resolvedToken = token ?? fileConfig.token;

  if (!resolvedUrl || !resolvedToken) {
    const missing: string[] = [];
    if (!resolvedUrl) missing.push('baseUrl (YOUTRACK_BASE_URL)');
    if (!resolvedToken) missing.push('token (YOUTRACK_TOKEN)');
    throw new Error(
      `Missing configuration: ${missing.join(', ')}. Run 'yt setup' first or set YOUTRACK_BASE_URL and YOUTRACK_TOKEN.`
    );
  }

  return { baseUrl: resolvedUrl, token: resolvedToken };
}

export function saveConfig(config: Config): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export function getConfigFilePath(): string {
  return CONFIG_FILE;
}
