// Auto-generated TypeScript types for the Project News database schema.
// These will be regenerated after applying migrations in Step 2.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      sources: {
        Row: {
          id: string;
          name: string;
          type: "official" | "aggregator" | "individual";
          url: string;
          rss_url: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["sources"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["sources"]["Insert"]>;
      };
      raw_items: {
        Row: {
          id: string;
          source_id: string;
          title: string;
          body_raw: string | null;
          url: string;
          published_at: string | null;
          ingested_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["raw_items"]["Row"], "id" | "ingested_at"> & { id?: string; ingested_at?: string };
        Update: Partial<Database["public"]["Tables"]["raw_items"]["Insert"]>;
      };
      weekly_issues: {
        Row: {
          id: string;
          week_start_date: string;
          status: "draft" | "preview" | "published";
          web_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["weekly_issues"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["weekly_issues"]["Insert"]>;
      };
      topic_groups: {
        Row: {
          id: string;
          week_id: string;
          representative_title: string;
          relevance_score: number | null;
          status: "pending" | "selected" | "rejected";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["topic_groups"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["topic_groups"]["Insert"]>;
      };
      topic_group_items: {
        Row: {
          topic_group_id: string;
          raw_item_id: string;
        };
        Insert: Database["public"]["Tables"]["topic_group_items"]["Row"];
        Update: Partial<Database["public"]["Tables"]["topic_group_items"]["Row"]>;
      };
      issue_items: {
        Row: {
          id: string;
          weekly_issue_id: string;
          topic_group_id: string;
          headline: string;
          implication_summary: string;
          category: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["issue_items"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["issue_items"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
