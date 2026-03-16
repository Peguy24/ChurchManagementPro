import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, Calendar, DollarSign, BarChart3, QrCode, Building2, 
  Package, Mail, Shield, Globe, Check, ArrowRight, Star,
  Church, Heart, Clock, Smartphone,
  Sparkles, Zap, ChevronRight, Play, TrendingUp
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ChurchRequestForm } from "@/components/ChurchRequestForm";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import heroImage from "@/assets/hero-abstract.png";

const Commercial = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [requestFormOpen, setRequestFormOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("basic");
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const isYearly = billingInterval === "yearly";


  const features = [
    {
      icon: Users,
      title: t("commercial.feat_members"),
      description: t("commercial.feat_membersDesc"),
      color: "from-blue-500 to-indigo-600"
    },
    {
      icon: QrCode,
      title: t("commercial.feat_attendance"),
      description: t("commercial.feat_attendanceDesc"),
      color: "from-violet-500 to-purple-600"
    },
    {
      icon: DollarSign,
      title: t("commercial.feat_finance"),
      description: t("commercial.feat_financeDesc"),
      color: "from-emerald-500 to-teal-600"
    },
    {
      icon: Calendar,
      title: t("commercial.feat_events"),
      description: t("commercial.feat_eventsDesc"),
      color: "from-orange-500 to-red-500"
    },
    {
      icon: Building2,
      title: t("commercial.feat_branches"),
      description: t("commercial.feat_branchesDesc"),
      color: "from-cyan-500 to-blue-600"
    },
    {
      icon: BarChart3,
      title: t("commercial.feat_reports"),
      description: t("commercial.feat_reportsDesc"),
      color: "from-pink-500 to-rose-600"
    }
  ];

  const pricingPlans = [
    {
      name: t("commercial.plan_essential"),
      price: "49",
      period: t("commercial.perMonth"),
      description: t("commercial.plan_essentialDesc"),
      planKey: "basic",
      features: [
        t("commercial.feat_200members"),
        t("commercial.feat_1branch"),
        t("commercial.feat_attendanceMgmt"),
        t("commercial.feat_basicDonations"),
        t("commercial.feat_emailSupport"),
      ],
      popular: false
    },
    {
      name: t("commercial.plan_professional"),
      price: "99",
      period: t("commercial.perMonth"),
      description: t("commercial.plan_professionalDesc"),
      planKey: "standard",
      features: [
        t("commercial.feat_1000members"),
        t("commercial.feat_3branches"),
        t("commercial.feat_allFeatures"),
        t("commercial.feat_advancedReports"),
        t("commercial.feat_autoEmails"),
        t("commercial.feat_prioritySupport"),
      ],
      popular: true
    },
    {
      name: t("commercial.plan_enterprise"),
      price: "199",
      period: t("commercial.perMonth"),
      description: t("commercial.plan_enterpriseDesc"),
      planKey: "premium",
      features: [
        t("commercial.feat_unlimitedMembers"),
        t("commercial.feat_unlimitedBranches"),
        t("commercial.feat_prioritySupport"),
        t("commercial.feat_trainingIncluded"),
        t("commercial.feat_support247"),
        t("commercial.feat_whiteLabel"),
      ],
      popular: false
    }
  ];

  const handlePlanSelect = async (planKey: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
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

        if (data?.free_access) {
          toast({ title: "✅ " + (data.message || "Free access activated") });
          return;
        }

        if (data?.updated) {
          toast({ title: data.message || "Subscription updated" });
          return;
        }

        if (data?.url) {
          window.open(data.url, '_blank');
        }
      } catch (error) {
        console.error('Checkout error:', error);
        toast({
          title: t("common.error"),
          description: t("commercial.checkoutError"),
          variant: "destructive"
        });
      }
    } else {
      setSelectedPlan(planKey);
      setRequestFormOpen(true);
    }
  };

  const testimonials = [
    {
      name: t("commercial.testimonial1Name"),
      church: t("commercial.testimonial1Church"),
      text: t("commercial.testimonial1Text"),
      rating: 5,
      avatar: "JP"
    },
    {
      name: t("commercial.testimonial2Name"),
      church: t("commercial.testimonial2Church"),
      text: t("commercial.testimonial2Text"),
      rating: 5,
      avatar: "SM"
    },
    {
      name: t("commercial.testimonial3Name"),
      church: t("commercial.testimonial3Church"),
      text: t("commercial.testimonial3Text"),
      rating: 5,
      avatar: "PT"
    }
  ];

  const stats = [
    { value: "500+", label: t("commercial.stat_churches") },
    { value: "50K+", label: t("commercial.stat_members") },
    { value: "99.9%", label: t("commercial.stat_uptime") },
    { value: "24/7", label: t("commercial.stat_support") }
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/images/church-management-pro-logo.png" alt="Church Manager Pro" className="h-10 object-contain" />
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">{t("commercial.nav_features")}</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">{t("commercial.nav_pricing")}</a>
            <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">{t("commercial.nav_testimonials")}</a>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="hidden sm:flex">
              <Shield className="w-4 h-4 mr-2" />
              {t("commercial.admin")}
            </Button>
            <Button size="sm" onClick={() => setRequestFormOpen(true)} className="bg-gradient-to-r from-primary to-primary-dark hover:opacity-90 transition-opacity">
              {t("commercial.getStarted")}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary/5 to-secondary/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left animate-fade-in">
              <Badge className="mb-6 px-4 py-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                <Sparkles className="w-3 h-3 mr-2" />
                {t("commercial.heroBadge")}
              </Badge>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                  {t("commercial.heroTitle1")}
                </span>
                <br />
                <span className="bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
                  {t("commercial.heroTitle2")}
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
                {t("commercial.heroSubtitle")}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <Button 
                  size="lg" 
                  onClick={() => setRequestFormOpen(true)} 
                  className="bg-gradient-to-r from-primary to-primary-dark hover:opacity-90 transition-all shadow-lg shadow-primary/25 group"
                >
                  {t("commercial.trialButton")}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="group border-2"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <Play className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  {t("commercial.demoButton")}
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-border/50">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center lg:text-left">
                    <div className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-primary/10">
                <img 
                  src={heroImage} 
                  alt="ChurchManager Platform" 
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
              </div>
              
              <div className="absolute -bottom-6 -left-6 bg-card p-4 rounded-xl shadow-xl border animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t("commercial.floatingMembers")}</p>
                    <p className="text-xs text-muted-foreground">{t("commercial.floatingMembersDesc")}</p>
                  </div>
                </div>
              </div>
              
              <div className="absolute -top-4 -right-4 bg-card p-4 rounded-xl shadow-xl border animate-fade-in" style={{ animationDelay: '0.6s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t("commercial.floatingAttendance")}</p>
                    <p className="text-xs text-muted-foreground">{t("commercial.floatingAttendanceDesc")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 px-4 py-2 bg-secondary/10 text-secondary border-secondary/20">
              <Zap className="w-3 h-3 mr-2" />
              {t("commercial.featuresBadge")}
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              {t("commercial.featuresTitle")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("commercial.featuresSubtitle")}
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
              {t("commercial.pricingBadge")}
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              {t("commercial.pricingTitle")}
            </h2>
            <p className="text-xl text-muted-foreground">
              {t("commercial.pricingSubtitle")}
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
                    {t("commercial.mostPopular")}
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
                    {t("commercial.choosePlan")}
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
              {t("commercial.testimonialsBadge")}
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              {t("commercial.testimonialsTitle")}
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
              {t("commercial.ctaTitle")}
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              {t("commercial.ctaSubtitle")}
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              onClick={() => setRequestFormOpen(true)}
              className="text-lg px-8 py-6 h-auto shadow-xl hover:scale-105 transition-transform"
            >
              {t("commercial.ctaButton")}
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
              <img src="/images/church-management-pro-logo.png" alt="Church Manager Pro" className="h-10 object-contain" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t("commercial.footer")}
            </p>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/auth")}>
              <Shield className="w-4 h-4" />
              {t("commercial.superAdmin")}
            </Button>
          </div>
        </div>
      </footer>

      <ChurchRequestForm 
        open={requestFormOpen} 
        onOpenChange={setRequestFormOpen}
        selectedPlan={selectedPlan}
      />
    </div>
  );
};

export default Commercial;
