type Profile = {id: string; display_name: string};
type Comment = {id: string; article_id: string; author_id: string; body: string; created_at: string; updated_at: string; hidden: boolean};
export type Database = {public: {
  Tables: {
    profiles: {Row: Profile; Insert: Profile; Update: {display_name?: string}; Relationships: []};
    article_refs: {Row: {id: string; created_at: string}; Insert: {id: string}; Update: never; Relationships: []};
    comments: {Row: Comment; Insert: {article_id: string; author_id: string; body: string}; Update: {body?: string}; Relationships: [{foreignKeyName: 'comments_author_id_fkey'; columns: ['author_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id']}]};
  };
  Views: Record<string, never>;
  Functions: Record<string, never>;
  Enums: Record<string, never>;
  CompositeTypes: Record<string, never>;
}};
