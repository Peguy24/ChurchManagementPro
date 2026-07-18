import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";

interface Stats {
  score: number;
  total_responses: number;
  promoters_pct: number;
}

export function PublicNpsBadge() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_public_nps_stats");
      if (data && data.length > 0) setStats(data[0] as Stats);
    })();
  }, []);

  if (!stats) return null;

  const color =
    stats.score >= 50 ? "text-green-600 bg-green-50 border-green-200"
    : stats.score >= 0 ? "text-yellow-600 bg-yellow-50 border-yellow-200"
    : "text-red-600 bg-red-50 border-red-200";

  return (
    <div className="flex justify-center my-8">
      <div className={`inline-flex items-center gap-4 px-6 py-4 rounded-2xl border ${color} shadow-sm`}>
        <Star className="h-8 w-8 fill-current" />
        <div className="text-left">
          <div className="text-3xl font-bold leading-none">NPS +{stats.score}</div>
          <p className="text-xs mt-1 opacity-80">
            {stats.promoters_pct}% promoters · Based on {stats.total_responses} verified church responses
          </p>
        </div>
      </div>
    </div>
  );
}
