export interface HRAccount {
  id: number;
  name: string;
  last_name: string;
  email: string;
  password: string;
  created_at?: string;
}

export interface CreateHRAccountInput {
  name: string;
  last_name: string;
  email: string;
  password: string;
}

export interface UpdateHRAccountInput {
  id: number;
  name: string;
  last_name: string;
  email: string;
  password?: string;
}

export interface User {
  id: number;
  name: string;
  last_name: string;
  email: string;
  password: string;
  company_position?: string;
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

