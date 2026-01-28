import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Church, Search, Building2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  address: string | null;
}

export default function SelectTenant() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, slug, logo_url, primary_color, address')
        .order('name');
      
      if (error) throw error;
      setTenants(data || []);
    } catch (err) {
      console.error('Error fetching tenants:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(search.toLowerCase()) ||
    tenant.slug.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectTenant = (tenant: Tenant) => {
    navigate(`/t/${tenant.slug}/auth`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Church className="mx-auto h-12 w-12 animate-pulse text-primary" />
          <p className="mt-4 text-muted-foreground">{t('tenant.loadingChurches')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center pt-8">
          <Church className="mx-auto h-16 w-16 text-primary mb-4" />
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('tenant.selectTenantTitle')}
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            {t('tenant.selectTenantSubtitle')}
          </p>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('tenant.searchChurch')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredTenants.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('tenant.noChurchFound')}</h3>
              <p className="text-muted-foreground">
                {search 
                  ? t('tenant.noSearchMatch')
                  : t('tenant.noChurchRegistered')
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTenants.map((tenant) => (
              <Card 
                key={tenant.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow group"
                onClick={() => handleSelectTenant(tenant)}
              >
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  {tenant.logo_url ? (
                    <img 
                      src={tenant.logo_url} 
                      alt={tenant.name}
                      className="h-12 w-12 rounded-lg object-contain"
                    />
                  ) : (
                    <div 
                      className="h-12 w-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: tenant.primary_color || '#6366f1' }}
                    >
                      <Church className="h-6 w-6 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{tenant.name}</CardTitle>
                    <CardDescription className="text-xs truncate">
                      {tenant.slug}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  {tenant.address && (
                    <p className="text-xs text-muted-foreground truncate mb-3">
                      {tenant.address}
                    </p>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  >
                    {t('tenant.access')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            {t('tenant.systemAdmin')}
          </p>
          <Button variant="outline" onClick={() => navigate('/auth')}>
            {t('tenant.adminAccess')}
          </Button>
        </div>
      </div>
    </div>
  );
}