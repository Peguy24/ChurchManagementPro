import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Church, ArrowRight, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';

const localTranslations: Record<string, Record<string, string>> = {
  en: {
    title: 'Choose Your Church',
    subtitle: 'You have access to multiple churches. Select the one you want to manage.',
    loading: 'Loading...',
    access: 'Access',
    admin: 'Admin',
    pastor: 'Pastor',
    treasurer: 'Treasurer',
    secretary: 'Secretary',
    volunteer: 'Volunteer',
    user: 'Member',
    noChurches: 'No churches found',
    noChurchesDesc: 'You do not have access to any church yet.',
    goToLogin: 'Go to login',
  },
  fr: {
    title: 'Choisissez votre église',
    subtitle: 'Vous avez accès à plusieurs églises. Sélectionnez celle que vous souhaitez gérer.',
    loading: 'Chargement...',
    access: 'Accéder',
    admin: 'Administrateur',
    pastor: 'Pasteur',
    treasurer: 'Trésorier',
    secretary: 'Secrétaire',
    volunteer: 'Bénévole',
    user: 'Membre',
    noChurches: 'Aucune église trouvée',
    noChurchesDesc: "Vous n'avez accès à aucune église pour le moment.",
    goToLogin: 'Aller à la connexion',
  },
  ht: {
    title: 'Chwazi legliz ou',
    subtitle: 'Ou gen aksè nan plizyè legliz. Chwazi sa ou vle jere.',
    loading: 'Chajman...',
    access: 'Aksede',
    admin: 'Administratè',
    pastor: 'Pastè',
    treasurer: 'Trezorye',
    secretary: 'Sekretè',
    volunteer: 'Volontè',
    user: 'Manm',
    noChurches: 'Pa gen legliz jwenn',
    noChurchesDesc: 'Ou pa gen aksè nan okenn legliz pou kounye a.',
    goToLogin: 'Ale nan koneksyon',
  },
};

interface TenantWithRole {
  tenant_id: string;
  role: string;
  tenant_name: string;
  tenant_slug: string;
  tenant_logo_url: string | null;
  tenant_primary_color: string | null;
}

export default function SelectChurch() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const [churches, setChurches] = useState<TenantWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  const lt = (key: string) => localTranslations[language]?.[key] || localTranslations['en'][key] || key;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      fetchUserChurches();
    }
  }, [user, authLoading]);

  async function fetchUserChurches() {
    try {
      const { data, error } = await supabase
        .from('tenant_user_roles')
        .select('tenant_id, role, tenants(name, slug, logo_url, primary_color)')
        .eq('user_id', user!.id)
        .eq('is_approved', true);

      if (error) throw error;

      const mapped: TenantWithRole[] = (data || []).map((row: any) => ({
        tenant_id: row.tenant_id,
        role: row.role,
        tenant_name: row.tenants?.name || '',
        tenant_slug: row.tenants?.slug || '',
        tenant_logo_url: row.tenants?.logo_url || null,
        tenant_primary_color: row.tenants?.primary_color || null,
      }));

      setChurches(mapped);
    } catch (err) {
      console.error('Error fetching user churches:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(church: TenantWithRole) {
    try {
      await supabase
        .from('profiles')
        .update({ tenant_id: church.tenant_id })
        .eq('id', user!.id);

      navigate('/');
    } catch (err) {
      console.error('Error selecting church:', err);
    }
  }

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Church className="mx-auto h-12 w-12 animate-pulse text-primary" />
          <p className="mt-4 text-muted-foreground">{lt('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center pt-8">
          <Church className="mx-auto h-16 w-16 text-primary mb-4" />
          <h1 className="text-3xl font-bold text-foreground mb-2">{lt('title')}</h1>
          <p className="text-muted-foreground max-w-md mx-auto">{lt('subtitle')}</p>
        </div>

        {churches.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{lt('noChurches')}</h3>
              <p className="text-muted-foreground mb-4">{lt('noChurchesDesc')}</p>
              <Button variant="outline" onClick={() => navigate('/auth')}>
                {lt('goToLogin')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {churches.map((church) => (
              <Card
                key={church.tenant_id}
                className="cursor-pointer hover:shadow-lg transition-shadow group"
                onClick={() => handleSelect(church)}
              >
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  {church.tenant_logo_url ? (
                    <img
                      src={church.tenant_logo_url}
                      alt={church.tenant_name}
                      className="h-12 w-12 rounded-lg object-contain"
                    />
                  ) : (
                    <div
                      className="h-12 w-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: church.tenant_primary_color || 'hsl(var(--primary))' }}
                    >
                      <Church className="h-6 w-6 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{church.tenant_name}</CardTitle>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {lt(church.role)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  >
                    {lt('access')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
