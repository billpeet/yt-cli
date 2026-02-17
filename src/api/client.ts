import axios, { AxiosInstance, AxiosError } from 'axios';
import { Config } from '../config/store';
import {
  YouTrackIssue,
  YouTrackComment,
  YouTrackProject,
  YouTrackUser,
  YouTrackIssueSearchOptions,
  YouTrackGetIssueOptions,
  YouTrackListProjectsOptions,
  YouTrackGetCommentsOptions,
  YouTrackGetCurrentUserOptions,
  YouTrackCustomFieldUpdate,
} from './types';

const DEFAULT_ISSUE_FIELDS =
  'id,idReadable,summary,description,created,updated,resolved,' +
  'project(id,shortName,name),' +
  'reporter(login,name),' +
  'assignee(login,name),' +
  'customFields(name,value(name,id))';

const DEFAULT_COMMENT_FIELDS = 'id,text,author(login,name),created,updated';
const DEFAULT_PROJECT_FIELDS = 'id,shortName,name';
const DEFAULT_USER_FIELDS = 'id,login,name,email';

export interface YouTrackClient {
  searchIssues(query: string, options?: YouTrackIssueSearchOptions): Promise<YouTrackIssue[]>;
  getIssue(id: string, options?: YouTrackGetIssueOptions): Promise<YouTrackIssue>;
  createIssue(project: string, summary: string, description?: string): Promise<YouTrackIssue>;
  updateIssue(
    id: string,
    fields: { summary?: string; description?: string; customFields?: YouTrackCustomFieldUpdate[] }
  ): Promise<YouTrackIssue>;
  getComments(issueId: string, options?: YouTrackGetCommentsOptions): Promise<YouTrackComment[]>;
  addComment(issueId: string, text: string): Promise<YouTrackComment>;
  listProjects(options?: YouTrackListProjectsOptions): Promise<YouTrackProject[]>;
  getCurrentUser(options?: YouTrackGetCurrentUserOptions): Promise<YouTrackUser>;
}

function normalizeBaseUrl(baseUrl: string): string {
  // Strip trailing slash
  return baseUrl.replace(/\/+$/, '');
}

function handleAxiosError(err: unknown): never {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<{ error?: string; error_description?: string; message?: string }>;
    const status = axiosErr.response?.status;
    const data = axiosErr.response?.data;
    const message =
      data?.error_description ?? data?.error ?? data?.message ?? axiosErr.message;
    throw new Error(`YouTrack API error ${status ?? 'unknown'}: ${message}`);
  }
  throw err;
}

export function createClient(config: Config): YouTrackClient {
  const base = normalizeBaseUrl(config.baseUrl);

  const http: AxiosInstance = axios.create({
    baseURL: `${base}/api/`,
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  return {
    async searchIssues(query, options = {}) {
      try {
        const { data } = await http.get<YouTrackIssue[]>('issues', {
          params: {
            query,
            fields: options.fields ?? DEFAULT_ISSUE_FIELDS,
            $top: options.top ?? 50,
            $skip: options.skip ?? 0,
          },
        });
        return data;
      } catch (err) {
        handleAxiosError(err);
      }
    },

    async getIssue(id, options = {}) {
      try {
        const { data } = await http.get<YouTrackIssue>(`issues/${encodeURIComponent(id)}`, {
          params: { fields: options.fields ?? DEFAULT_ISSUE_FIELDS },
        });
        return data;
      } catch (err) {
        handleAxiosError(err);
      }
    },

    async createIssue(project, summary, description) {
      try {
        const body: Record<string, unknown> = {
          project: { id: project },
          summary,
        };
        if (description !== undefined) {
          body.description = description;
        }
        const { data } = await http.post<YouTrackIssue>('issues', body, {
          params: { fields: DEFAULT_ISSUE_FIELDS },
        });
        return data;
      } catch (err) {
        handleAxiosError(err);
      }
    },

    async updateIssue(id, fields) {
      try {
        const body: Record<string, unknown> = {};
        if (fields.summary !== undefined) body.summary = fields.summary;
        if (fields.description !== undefined) body.description = fields.description;
        if (fields.customFields && fields.customFields.length > 0) {
          body.customFields = fields.customFields.map((cf) => ({
            name: cf.name,
            value: typeof cf.value === 'string' ? { name: cf.value } : cf.value,
            $type: 'SingleEnumIssueCustomField',
          }));
        }
        const { data } = await http.post<YouTrackIssue>(
          `issues/${encodeURIComponent(id)}`,
          body,
          { params: { fields: DEFAULT_ISSUE_FIELDS } }
        );
        return data;
      } catch (err) {
        handleAxiosError(err);
      }
    },

    async getComments(issueId, options = {}) {
      try {
        const { data } = await http.get<YouTrackComment[]>(
          `issues/${encodeURIComponent(issueId)}/comments`,
          { params: { fields: options.fields ?? DEFAULT_COMMENT_FIELDS } }
        );
        return data;
      } catch (err) {
        handleAxiosError(err);
      }
    },

    async addComment(issueId, text) {
      try {
        const { data } = await http.post<YouTrackComment>(
          `issues/${encodeURIComponent(issueId)}/comments`,
          { text },
          { params: { fields: DEFAULT_COMMENT_FIELDS } }
        );
        return data;
      } catch (err) {
        handleAxiosError(err);
      }
    },

    async listProjects(options = {}) {
      try {
        const { data } = await http.get<YouTrackProject[]>('admin/projects', {
          params: { fields: options.fields ?? DEFAULT_PROJECT_FIELDS },
        });
        return data;
      } catch (err) {
        handleAxiosError(err);
      }
    },

    async getCurrentUser(options = {}) {
      try {
        const { data } = await http.get<YouTrackUser>('users/me', {
          params: { fields: options.fields ?? DEFAULT_USER_FIELDS },
        });
        return data;
      } catch (err) {
        handleAxiosError(err);
      }
    },
  };
}
