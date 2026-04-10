export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "super_admin" | "university_admin" | "student";
  is_active: boolean;
  university_id: string | null;
  created_at: string;
}

export interface University {
  id: string;
  name: string;
  slug: string;
  website_url: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Document {
  id: string;
  university_id: string;
  title: string;
  source_url: string;
  doc_type: string;
  status: "pending" | "processing" | "indexed" | "failed";
  chunk_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ScrapeJob {
  id: string;
  university_id: string;
  celery_task_id: string | null;
  status: "queued" | "running" | "completed" | "failed";
  pages_scraped: number;
  pages_indexed: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ChatSource {
  title: string;
  url: string;
  score: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
}
