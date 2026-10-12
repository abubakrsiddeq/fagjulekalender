export type Role = "participant" | "lead" | "admin";
export type CalendarStatus = "draft" | "published" | "archived";
export type DepartmentStatus = "active" | "pending" | "archived";

export interface Organization {
  id: number;
  name: string;
  allowed_email_domains: string | null;
  allow_department_proposals: number;
  brand_color: string | null;
  logo_url: string | null;
}

export interface User {
  id: number;
  org_id: number;
  email: string;
  display_name: string;
  role: Role;
  hide_name: number;
  notify_daily: number;
}

export interface Department {
  id: number;
  org_id: number;
  name: string;
  status: DepartmentStatus;
  proposed_by: number | null;
  merged_into_id: number | null;
  created_at: Date;
}

export interface Calendar {
  id: number;
  org_id: number;
  name: string;
  slug: string;
  year: number;
  start_date: string; // YYYY-MM-DD
  door_count: number;
  timezone: string;
  closes_at: Date;
  points_correct: number;
  same_day_bonus: number;
  late_answers_allowed: number;
  min_answers_to_count: number;
  shuffle_options: number;
  notify_time: string | null;
  status: CalendarStatus;
}

export interface Membership {
  calendar_id: number;
  user_id: number;
  department_id: number;
  joined_at: Date;
}

export interface Question {
  id: number;
  calendar_id: number;
  door_number: number;
  topic: string;
  text: string;
  image_url: string | null;
  explanation: string;
  source_title: string | null;
  source_eqs_id: string | null;
  source_revision_date: string | null;
  approved_by: string | null;
  approved_at: string | null;
  updated_at: Date;
}

export interface QuestionOption {
  id: number;
  question_id: number;
  text: string;
  is_correct: number;
  sort_order: number;
}

export interface QuestionWithOptions extends Question {
  options: QuestionOption[];
}

export interface Answer {
  id: number;
  calendar_id: number;
  question_id: number;
  user_id: number;
  option_id: number;
  is_correct: number;
  on_door_day: number;
  answered_at: Date;
}
