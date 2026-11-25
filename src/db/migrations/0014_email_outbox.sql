CREATE TABLE public.notification_email_jobs(notification_id uuid PRIMARY KEY REFERENCES public.notifications(id) ON DELETE CASCADE,attempts integer NOT NULL DEFAULT 0,next_attempt_at timestamptz NOT NULL DEFAULT now(),lease_id uuid,leased_until timestamptz,sent_at timestamptz,last_error text);
ALTER TABLE public.notification_email_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_email_jobs FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.enqueue_notification_email() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN INSERT INTO public.notification_email_jobs(notification_id) VALUES(NEW.id); RETURN NEW; END;$$;
REVOKE ALL ON FUNCTION public.enqueue_notification_email() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER enqueue_email AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.enqueue_notification_email();
