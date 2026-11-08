// Generated from disposable PostgreSQL catalogs by scripts/test-forum-database.py.
// Regenerate with bun run test:db:update-types. Do not edit manually.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      article_refs: {
        Row: {
          id: string;
          created_at: string;
          slug: string | null;
          title: string | null;
          published_at: string | null;
          is_published: boolean;
        };
        Insert: {
          id: string;
          created_at?: string;
          slug?: string | null;
          title?: string | null;
          published_at?: string | null;
          is_published?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          slug?: string | null;
          title?: string | null;
          published_at?: string | null;
          is_published?: boolean;
        };
        Relationships: [];
      };
      discussion_tag: {
        Row: {
          discussion_id: string;
          tag_id: string;
        };
        Insert: {
          discussion_id: string;
          tag_id: string;
        };
        Update: {
          discussion_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "discussion_tag_discussion_id_fkey";
            columns: ["discussion_id"];
            referencedRelation: "discussions";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
          {
            foreignKeyName: "discussion_tag_tag_id_fkey";
            columns: ["tag_id"];
            referencedRelation: "tags";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
        ];
      };
      discussion_user: {
        Row: {
          discussion_id: string;
          user_id: string;
          last_read_post_number: number;
          last_read_at: string;
        };
        Insert: {
          discussion_id: string;
          user_id: string;
          last_read_post_number?: number;
          last_read_at?: string;
        };
        Update: {
          discussion_id?: string;
          user_id?: string;
          last_read_post_number?: number;
          last_read_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "discussion_user_discussion_id_fkey";
            columns: ["discussion_id"];
            referencedRelation: "discussions";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
          {
            foreignKeyName: "discussion_user_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
        ];
      };
      discussions: {
        Row: {
          id: string;
          kind: string;
          article_id: string | null;
          author_id: string | null;
          title: string | null;
          created_at: string;
          updated_at: string;
          is_locked: boolean;
          is_pinned: boolean;
          hidden_at: string | null;
          hidden_by: string | null;
          deleted_at: string | null;
          next_post_number: number;
          post_count: number;
          last_post_id: string | null;
          last_activity_at: string;
        };
        Insert: {
          id?: string;
          kind: string;
          article_id?: string | null;
          author_id?: string | null;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
          is_locked?: boolean;
          is_pinned?: boolean;
          hidden_at?: string | null;
          hidden_by?: string | null;
          deleted_at?: string | null;
          next_post_number?: number;
          post_count?: number;
          last_post_id?: string | null;
          last_activity_at?: string;
        };
        Update: {
          id?: string;
          kind?: string;
          article_id?: string | null;
          author_id?: string | null;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
          is_locked?: boolean;
          is_pinned?: boolean;
          hidden_at?: string | null;
          hidden_by?: string | null;
          deleted_at?: string | null;
          next_post_number?: number;
          post_count?: number;
          last_post_id?: string | null;
          last_activity_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "discussions_article_id_fkey";
            columns: ["article_id"];
            referencedRelation: "article_refs";
            referencedColumns: ["id"];
            isOneToOne: true;
          },
          {
            foreignKeyName: "discussions_author_id_fkey";
            columns: ["author_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
          {
            foreignKeyName: "discussions_hidden_by_fkey";
            columns: ["hidden_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
          {
            foreignKeyName: "discussions_last_post_fkey";
            columns: ["id", "last_post_id"];
            referencedRelation: "posts";
            referencedColumns: ["discussion_id", "id"];
            isOneToOne: true;
          },
        ];
      };
      flags: {
        Row: {
          id: string;
          post_id: string;
          reporter_id: string;
          reason: string;
          details: string | null;
          status: string;
          created_at: string;
          resolved_by: string | null;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          post_id: string;
          reporter_id: string;
          reason: string;
          details?: string | null;
          status?: string;
          created_at?: string;
          resolved_by?: string | null;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          post_id?: string;
          reporter_id?: string;
          reason?: string;
          details?: string | null;
          status?: string;
          created_at?: string;
          resolved_by?: string | null;
          resolved_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "flags_post_id_fkey";
            columns: ["post_id"];
            referencedRelation: "posts";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
          {
            foreignKeyName: "flags_reporter_id_fkey";
            columns: ["reporter_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
          {
            foreignKeyName: "flags_resolved_by_fkey";
            columns: ["resolved_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
        ];
      };
      post_likes: {
        Row: {
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          post_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey";
            columns: ["post_id"];
            referencedRelation: "posts";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
          {
            foreignKeyName: "post_likes_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
        ];
      };
      posts: {
        Row: {
          id: string;
          discussion_id: string;
          number: number;
          author_id: string | null;
          body: string;
          reply_to_post_id: string | null;
          created_at: string;
          updated_at: string;
          hidden_at: string | null;
          hidden_by: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          discussion_id: string;
          number: number;
          author_id?: string | null;
          body: string;
          reply_to_post_id?: string | null;
          created_at?: string;
          updated_at?: string;
          hidden_at?: string | null;
          hidden_by?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          discussion_id?: string;
          number?: number;
          author_id?: string | null;
          body?: string;
          reply_to_post_id?: string | null;
          created_at?: string;
          updated_at?: string;
          hidden_at?: string | null;
          hidden_by?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey";
            columns: ["author_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
          {
            foreignKeyName: "posts_discussion_id_fkey";
            columns: ["discussion_id"];
            referencedRelation: "discussions";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
          {
            foreignKeyName: "posts_discussion_id_reply_to_post_id_fkey";
            columns: ["discussion_id", "reply_to_post_id"];
            referencedRelation: "posts";
            referencedColumns: ["discussion_id", "id"];
            isOneToOne: false;
          },
          {
            foreignKeyName: "posts_hidden_by_fkey";
            columns: ["hidden_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
            isOneToOne: false;
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          position: number;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          position?: number;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          position?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      activate_articles: {
        Args: {
          p_articles: Json;
        };
        Returns: undefined;
      };
      create_discussion: {
        Args: {
          p_title: string;
          p_body: string;
          p_tag_ids?: string[];
        };
        Returns: Database["public"]["Tables"]["discussions"]["Row"];
      };
      delete_discussion: {
        Args: {
          p_discussion_id: string;
        };
        Returns: undefined;
      };
      delete_post: {
        Args: {
          p_post_id: string;
        };
        Returns: undefined;
      };
      edit_discussion: {
        Args: {
          p_discussion_id: string;
          p_title: string;
          p_tag_ids?: string[];
        };
        Returns: undefined;
      };
      edit_post: {
        Args: {
          p_post_id: string;
          p_body: string;
        };
        Returns: undefined;
      };
      flag_post: {
        Args: {
          p_post_id: string;
          p_reason: string;
          p_details?: string;
        };
        Returns: string;
      };
      get_my_access: {
        Args: Record<string, never>;
        Returns: Json;
      };
      mark_discussion_read: {
        Args: {
          p_discussion_id: string;
          p_post_number: number;
        };
        Returns: undefined;
      };
      moderate_discussion: {
        Args: {
          p_discussion_id: string;
          p_action: string;
        };
        Returns: undefined;
      };
      moderate_post: {
        Args: {
          p_post_id: string;
          p_action: string;
        };
        Returns: undefined;
      };
      prepare_articles: {
        Args: {
          p_articles: Json;
        };
        Returns: undefined;
      };
      reply_to_discussion: {
        Args: {
          p_discussion_id: string;
          p_body: string;
          p_reply_to_post_id?: string;
        };
        Returns: Database["public"]["Tables"]["posts"]["Row"];
      };
      resolve_flag: {
        Args: {
          p_flag_id: string;
          p_status: string;
        };
        Returns: undefined;
      };
      save_tag: {
        Args: {
          p_id: string;
          p_slug: string;
          p_name: string;
          p_description?: string;
          p_position?: number;
        };
        Returns: string;
      };
      set_post_like: {
        Args: {
          p_post_id: string;
          p_liked: boolean;
        };
        Returns: undefined;
      };
      set_user_access: {
        Args: {
          p_user_id: string;
          p_role: string;
          p_suspended_until?: string;
        };
        Returns: undefined;
      };
      update_profile: {
        Args: {
          p_display_name: string;
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
