CREATE TABLE IF NOT EXISTS public.task_meeting_summary_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id uuid NOT NULL,
  meeting_id uuid,
  user_id uuid NOT NULL,
  first_viewed_at timestamptz NOT NULL DEFAULT now(),
  last_viewed_at timestamptz NOT NULL DEFAULT now(),
  view_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (demanda_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_meeting_summary_views TO authenticated;
GRANT ALL ON public.task_meeting_summary_views TO service_role;

ALTER TABLE public.task_meeting_summary_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_tmsv"
ON public.task_meeting_summary_views FOR SELECT TO authenticated USING (true);

CREATE POLICY "users_insert_own_tmsv"
ON public.task_meeting_summary_views FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_tmsv"
ON public.task_meeting_summary_views FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_delete_tmsv"
ON public.task_meeting_summary_views FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_tmsv_demanda ON public.task_meeting_summary_views(demanda_id);
CREATE INDEX IF NOT EXISTS idx_tmsv_meeting ON public.task_meeting_summary_views(meeting_id);
CREATE INDEX IF NOT EXISTS idx_tmsv_user ON public.task_meeting_summary_views(user_id);

CREATE TRIGGER trg_tmsv_updated_at
BEFORE UPDATE ON public.task_meeting_summary_views
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();