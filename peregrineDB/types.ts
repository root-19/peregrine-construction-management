export interface HRAccount {
  id: number;
  name: string;
  last_name: string;
  email: string;
  password: string;
  company_name?: string;
  position?: string;
  created_at?: string;
}

export interface CreateHRAccountInput {
  name: string;
  last_name: string;
  email: string;
  password: string;
  company_name?: string;
  position?: string;
}

export interface UpdateHRAccountInput {
  id: number;
  name: string;
  last_name: string;
  email: string;
  password?: string;
  company_name?: string;
  position?: string;
}

export interface User {
  id: number;
  name: string;
  last_name: string;
  email: string;
  password: string;
  company_position?: string;
  position?: string;
  company_name?: string;
  created_at?: string;
}

export interface CreateUserInput {
  name: string;
  last_name: string;
  email: string;
  password: string;
  company_position?: string;
}

export interface UpdateUserInput {
  id: number;
  name: string;
  last_name: string;
  email: string;
  password?: string;
  company_position?: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  created_by: number;
  created_at?: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  created_by: number;
}

export interface ProjectFolder {
  id: number;
  project_id: number;
  name: string;
  parent_folder_id?: number;
  created_at?: string;
}

