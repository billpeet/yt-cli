export interface YouTrackProject {
  id: string;
  shortName: string;
  name: string;
}

export interface YouTrackUser {
  id: string;
  login: string;
  name: string;
  email?: string;
}

export interface YouTrackCustomFieldValue {
  id?: string;
  name?: string;
}

export interface YouTrackCustomField {
  name: string;
  value: YouTrackCustomFieldValue | YouTrackCustomFieldValue[] | string | number | null;
}

export interface YouTrackIssue {
  id: string;
  idReadable: string;
  summary: string;
  description?: string;
  created?: number;
  updated?: number;
  resolved?: number | null;
  project?: YouTrackProject;
  reporter?: YouTrackUser;
  assignee?: YouTrackUser;
  customFields?: YouTrackCustomField[];
}

export interface YouTrackComment {
  id: string;
  text: string;
  author?: YouTrackUser;
  created?: number;
  updated?: number;
}

export interface YouTrackIssueSearchOptions {
  fields?: string;
  top?: number;
  skip?: number;
}

export interface YouTrackGetIssueOptions {
  fields?: string;
}

export interface YouTrackListProjectsOptions {
  fields?: string;
}

export interface YouTrackGetCommentsOptions {
  fields?: string;
}

export interface YouTrackGetCurrentUserOptions {
  fields?: string;
}

export interface YouTrackCustomFieldUpdate {
  name: string;
  value: { name: string } | string | number;
}
