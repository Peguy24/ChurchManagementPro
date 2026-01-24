import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Users, Calendar, DollarSign, BarChart3, QrCode, Building2, 
  Package, Mail, Shield, Globe, Check, ArrowRight, Star,
  Church, Heart, Clock, Smartphone, Search, LogIn, Copy, ExternalLink,
  Sparkles, Zap, ChevronRight, Play, TrendingUp
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ChurchRequestForm } from "@/components/ChurchRequestForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import heroImage from "@/assets/hero-abstract.png";

const Commercial = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requestFormOpen, setRequestFormOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("basic");
  const [churchSearch, setChurchSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const handleChurchSearch = async (searchTerm: string) => {
    setChurchSearch(searchTerm);
    
    if (searchTerm.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .ilike('name', `%${searchTerm}%`)
        .limit(5);

      if (error) throw error;
      
      setSearchResults(data || []);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error searching churches:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleChurchSelect = (slug: string) => {
    navigate(`/t/${slug}/auth`);
  };

  const handleDirectSlugAccess = () => {
    if (churchSearch.trim()) {
      navigate(`/t/${churchSearch.toLowerCase().replace(/\s+/g, '-')}/auth`);
    } else {
      toast({
        title: "Entrez le nom de votre église",
        description: "Veuillez saisir le nom ou l'identifiant de votre église.",
        variant: "destructive"
      });
    }
  };

  const features = [
    {
      icon: Users,
      title: "Gestion des Membres",
      description: "Fichiers complets avec photos, QR codes et champs personnalisables",
      color: "from-blue-500 to-indigo-600"
    },
    {
      icon: QrCode,
      title: "Suivi de Présence",
      description: "Scanner QR/code-barres avec alertes automatiques",
      color: "from-violet-500 to-purple-600"
    },
    {
      icon: DollarSign,
      title: "Gestion Financière",
      description: "Donations, dépenses, budgets et rapports détaillés",
      color: "from-emerald-500 to-teal-600"
    },
    {
      icon: Calendar,
      title: "Événements",
      description: "Planification avec rappels automatiques",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: Building2,
      title: "Multi-Succursales",
      description: "Gérez plusieurs sites facilement",
      color: "from-cyan-500 to-blue-600"
    },
    {
      icon: BarChart3,
      title: "Rapports Avancés",
      description: "Statistiques complètes et exports",
      color: "from-pink-500 to-rose-600"
    }
  ];

  const pricingPlans = [
    {
      name: "Essentiel",
      price: "49",
      period: "/mois",
      description: "Pour les petites églises",
      planKey: "basic",
      features: [
        "Jusqu'à 200 membres",
        "1 succursale",
        "Gestion des présences",
        "Donations de base",
        "Support email"
      ],
      popular: false
    },
    {
      name: "Professionnel",
      price: "99",
      period: "/mois",
      description: "Pour les églises en croissance",
      planKey: "standard",
      features: [
        "Jusqu'à 1000 membres",
        "3 succursales",
        "Toutes les fonctionnalités",
        "Rapports avancés",
        "Emails automatiques",
        "Support prioritaire"
      ],
      popular: true
    },
    {
      name: "Entreprise",
      price: "199",
      period: "/mois",
      description: "Pour les grandes organisations",
      planKey: "premium",
      features: [
        "Membres illimités",
        "Succursales illimitées",
        "API personnalisée",
        "Formation incluse",
        "Support 24/7",
        "White-label disponible"
      ],
      popular: false
    }
  ];

  const handlePlanSelect = async (planKey: string) => {
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // User is logged in, redirect to checkout
      try {
        const planMap: Record<string, string> = {
          'basic': 'essentiel',
          'standard': 'professionnel', 
          'premium': 'entreprise'
        };
        
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: { plan: planMap[planKey] || planKey },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) throw error;

        if (data?.url) {
          window.open(data.url, '_blank');
        }
      } catch (error) {
        console.error('Checkout error:', error);
        toast({
          title: "Erreur",
          description: "Impossible de créer la session de paiement.",
          variant: "destructive"
        });
      }
    } else {
      // User not logged in, show request form
      setSelectedPlan(planKey);
      setRequestFormOpen(true);
    }
  };

  const testimonials = [
    {
      name: "Pasteur Jean-Pierre",
      church: "Église de la Grâce",
      text: "Ce système a révolutionné notre gestion. Nous économisons des heures chaque semaine.",
      rating: 5,
      avatar: "JP"
    },
    {
      name: "Secrétaire Marie",
      church: "Communauté Évangélique",
      text: "Le suivi des présences par QR code est incroyable. Les membres adorent!",
      rating: 5,
      avatar: "SM"
    },
    {
      name: "Trésorier Paul",
      church: "Temple de Louange",
      text: "Les rapports financiers nous ont permis de mieux gérer notre budget.",
      rating: 5,
      avatar: "TP"
    }
  ];

  const stats = [
    { value: "500+", label: "Églises actives" },
    { value: "50K+", label: "Membres gérés" },
    { value: "99.9%", label: "Disponibilité" },
    { value: "24/7", label: "Support" }
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Church className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              ChurchManager
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Fonctionnalités</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Tarifs</a>
            <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">Témoignages</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="hidden sm:flex">
              <Shield className="w-4 h-4 mr-2" />
              Admin
            </Button>
            <Button size="sm" onClick={() => setRequestFormOpen(true)} className="bg-gradient-to-r from-primary to-primary-dark hover:opacity-90 transition-opacity">
              Commencer
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary/5 to-secondary/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left animate-fade-in">
              <Badge className="mb-6 px-4 py-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                <Sparkles className="w-3 h-3 mr-2" />
                Nouveau: Intelligence Artificielle intégrée
              </Badge>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                  Gérez votre église
                </span>
                <br />
                <span className="bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
                  avec excellence
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
                La plateforme tout-en-un pour gérer vos membres, finances, événements et bien plus. 
                Simple, puissant, et conçu pour les églises modernes.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <Button 
                  size="lg" 
                  onClick={() => setRequestFormOpen(true)} 
                  className="bg-gradient-to-r from-primary to-primary-dark hover:opacity-90 transition-all shadow-lg shadow-primary/25 group"
                >
                  Essai Gratuit de 14 Jours
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="group border-2"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <Play className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  Voir la démo
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-border/50">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center lg:text-left">
                    <div className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Content - Hero Image */}
            <div className="relative animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-primary/10">
                <img 
                  src={heroImage} 
                  alt="ChurchManager Platform" 
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
              </div>
              
              {/* Floating Cards */}
              <div className="absolute -bottom-6 -left-6 bg-card p-4 rounded-xl shadow-xl border animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">+127 membres</p>
                    <p className="text-xs text-muted-foreground">ce mois-ci</p>
                  </div>
                </div>
              </div>
              
              <div className="absolute -top-4 -right-4 bg-card p-4 rounded-xl shadow-xl border animate-fade-in" style={{ animationDelay: '0.6s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">+23% présence</p>
                    <p className="text-xs text-muted-foreground">vs mois dernier</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Church Finder Section */}
      <section className="py-16 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-secondary/5 to-transparent" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-2xl mx-auto">
            <Card className="border-2 border-primary/20 shadow-xl shadow-primary/5 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 border-b">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <LogIn className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-center">Déjà membre d'une église?</h2>
                <p className="text-muted-foreground text-center mt-2">
                  Trouvez votre église et accédez à votre espace
                </p>
              </div>
              <CardContent className="p-6">
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher votre église..."
                        value={churchSearch}
                        onChange={(e) => handleChurchSearch(e.target.value)}
                        onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                        className="pl-11 h-12 text-lg border-2 focus:border-primary"
                      />
                      {/* Search Results Dropdown */}
                      {showSearchResults && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-card border-2 rounded-xl shadow-2xl z-50 overflow-hidden">
                          {searchResults.map((church) => {
                            const churchUrl = `${window.location.origin}/t/${church.slug}/auth`;
                            return (
                              <div
                                key={church.id}
                                className="p-4 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                                      <Church className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-semibold truncate">{church.name}</p>
                                      <p className="text-xs text-muted-foreground truncate">{churchUrl}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-9 w-9 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(churchUrl);
                                        toast({
                                          title: "Lien copié!",
                                          description: `Le lien de ${church.name} a été copié.`,
                                        });
                                      }}
                                    >
                                      <Copy className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleChurchSelect(church.slug)}
                                      className="bg-gradient-to-r from-primary to-primary-dark"
                                    >
                                      <ExternalLink className="w-4 h-4 mr-1" />
                                      Ouvrir
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {showSearchResults && searchResults.length === 0 && churchSearch.length >= 2 && !isSearching && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-card border-2 rounded-xl shadow-2xl z-50 p-6 text-center">
                          <Church className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                          <p className="text-muted-foreground">Aucune église trouvée</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Vérifiez l'orthographe ou contactez votre administrateur
                          </p>
                        </div>
                      )}
                    </div>
                    <Button 
                      onClick={handleDirectSlugAccess} 
                      size="lg"
                      className="h-12 bg-gradient-to-r from-primary to-primary-dark hover:opacity-90"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 px-4 py-2 bg-secondary/10 text-secondary border-secondary/20">
              <Zap className="w-3 h-3 mr-2" />
              Fonctionnalités puissantes
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Une plateforme complète conçue spécifiquement pour les besoins des églises modernes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${feature.color} opacity-10 rounded-bl-full transition-all duration-300 group-hover:w-40 group-hover:h-40`} />
                <CardHeader>
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-background" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-16">
            <Badge className="mb-4 px-4 py-2 bg-primary/10 text-primary border-primary/20">
              <DollarSign className="w-3 h-3 mr-2" />
              Tarifs transparents
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Choisissez votre plan
            </h2>
            <p className="text-xl text-muted-foreground">
              Des tarifs adaptés à la taille de votre église
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative overflow-hidden transition-all duration-300 hover:-translate-y-2 ${
                  plan.popular 
                    ? 'border-2 border-primary shadow-2xl shadow-primary/20 scale-105' 
                    : 'border-2 hover:border-primary/50'
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-primary to-secondary text-white text-center py-2 text-sm font-medium">
                    <Star className="w-4 h-4 inline mr-1" />
                    Plus Populaire
                  </div>
                )}
                <CardHeader className={`text-center ${plan.popular ? 'pt-12' : 'pt-6'}`}>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="text-base">{plan.description}</CardDescription>
                  <div className="mt-6">
                    <span className="text-5xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground text-lg">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <ul className="space-y-4">
                    {plan.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full mt-8 ${
                      plan.popular 
                        ? 'bg-gradient-to-r from-primary to-primary-dark hover:opacity-90' 
                        : ''
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                    size="lg"
                    onClick={() => handlePlanSelect(plan.planKey)}
                  >
                    Choisir ce Plan
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 px-4 py-2 bg-secondary/10 text-secondary border-secondary/20">
              <Heart className="w-3 h-3 mr-2" />
              Témoignages
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Ce que disent nos clients
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="relative overflow-hidden border-2 hover:border-primary/30 transition-all duration-300 hover:shadow-xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary" />
                <CardContent className="pt-8">
                  <div className="flex justify-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 italic text-center">
                    "{testimonial.text}"
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.church}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-dark to-primary" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-60 h-60 bg-secondary rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 relative text-center">
          <div className="max-w-3xl mx-auto">
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-8">
              <Heart className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-white">
              Prêt à transformer votre église?
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              Rejoignez des centaines d'églises qui font confiance à ChurchManager pour gérer leur communauté.
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              onClick={() => setRequestFormOpen(true)}
              className="text-lg px-8 py-6 h-auto shadow-xl hover:scale-105 transition-transform"
            >
              Démarrer l'Essai Gratuit
              <Sparkles className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Church className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl">ChurchManager Pro</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 ChurchManager Pro. Tous droits réservés.
            </p>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/auth")}>
              <Shield className="w-4 h-4" />
              Super Admin
            </Button>
          </div>
        </div>
      </footer>

      {/* Church Request Form Dialog */}
      <ChurchRequestForm 
        open={requestFormOpen} 
        onOpenChange={setRequestFormOpen}
        selectedPlan={selectedPlan}
      />
    </div>
  );
};

export default Commercial;
