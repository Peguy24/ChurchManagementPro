import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Sparkles, Wrench, ShieldCheck, Megaphone, Zap } from 'lucide-react';

const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
  feature: { label: 'New', icon: Sparkles, color: 'bg-primary text-primary-foreground' },
  improvement: { label: 'Improved', icon: Zap, color: 'bg-blue-500 text-white' },
  fix: { label: 'Fixed', icon: Wrench, color: 'bg-yellow-500 text-white' },
  security: { label: 'Security', icon: ShieldCheck, color: 'bg-red-500 text-white' },
  announcement: { label: 'Announcement', icon: Megaphone, color: 'bg-purple-500 text-white' },
};

export default function PublicChangelog() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "What's New | Church Management Pro";
    (async () => {
      const { data } = await supabase
        .from('changelog_entries')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(100);
      setEntries(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Activity className="h-5 w-5 text-primary" />
            Church Management Pro
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/status" className="text-muted-foreground hover:text-foreground">Status</Link>
            <Link to="/commercial" className="text-muted-foreground hover:text-foreground">Home</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-2">What's New</h1>
          <p className="text-muted-foreground">
            Product updates, improvements, and announcements from the Church Management Pro team.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : entries.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            No published updates yet. Check back soon!
          </CardContent></Card>
        ) : (
          <div className="space-y-6">
            {entries.map((e) => {
              const meta = CATEGORY_META[e.category] || CATEGORY_META.improvement;
              const Icon = meta.icon;
              return (
                <Card key={e.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={meta.color}><Icon className="h-3 w-3 mr-1" />{meta.label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {e.published_at ? new Date(e.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold mb-2">{e.title}</h2>
                    <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                      {e.body}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
