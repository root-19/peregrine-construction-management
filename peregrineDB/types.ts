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

export interface Subfolder {
  id: number;
  project_folder_id: number;
  project_id: number;
  name: string;
  button_name: string;
  created_at?: string;
}

export interface DocumentFolder {
  id: number;
  project_id: number;
  project_name: string;
  user_id: number;
  account: 'user' | 'hr' | 'manager_coo';
  folder_name: string;
  category: 'Procurement' | 'Community';
  created_at?: string;
  updated_at?: string;
}

export interface Procurement {
  id: number;
  project_id: number;
  folder_id: number;
  name: string;
  description?: string;
  created_at?: string;
}

export interface ManagerCOOAccount {
  id: number;
  name: string;
  last_name: string;
  email: string;
  password: string;
  company_name?: string;
  position?: string;
  created_at?: string;
}

export interface CreateManagerCOOAccountInput {
  name: string;
  last_name: string;
  email: string;
  password: string;
  company_name?: string;
  position?: string;
}

export interface Position {
  id: number;
  position: string;
  created_at?: string;
}

export interface CreatePositionInput {
  position: string;
}

export interface IncidentReport {
  id: number;
  reported_by_id: number;
  reported_by_name: string;
  reported_by_position: string;
  date_of_report: string;
  location: string;
  date_of_incident: string;
  time_of_incident: string;
  time_period: 'AM' | 'PM';
  description_of_accident: string;
  is_someone_injured: boolean;
  injury_description?: string;
  people_involved?: PersonInvolved[];
  status: 'pending' | 'reviewed' | 'resolved';
  resolution?: string;
  reviewed_by_id?: number;
  reviewed_by_type?: 'hr' | 'manager_coo';
  reviewed_at?: string;
  resolved_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface PersonInvolved {
  name: string;
  phone_number: string;
  position: string;
}

// Material Request Types
export interface MaterialItem {
  item_name: string;
  quantity: number;
  unit: string;
  specifications?: string;
}

export interface MaterialRequest {
  id: number;
  requested_by_id: number;
  requested_by_name: string;
  requested_by_position: string;
  department?: string;
  date_of_request: string;
  date_needed: string;
  project_name?: string;
  project_location?: string;
  purpose: string;
  materials: MaterialItem[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed';
  remarks?: string;
  rejection_reason?: string;
  approved_by_id?: number;
  approved_by_type?: 'hr' | 'manager_coo';
  approved_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at?: string;
}

