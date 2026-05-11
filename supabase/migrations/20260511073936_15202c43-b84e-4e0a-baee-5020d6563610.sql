ALTER TABLE public.platform_notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_notifications;