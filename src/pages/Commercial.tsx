import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, Calendar, DollarSign, BarChart3, QrCode, Building2, 
  Package, Mail, Shield, Globe, Check, ArrowRight, Star,
  Church, Heart, Clock, Smartphone,
  Sparkles, Zap, ChevronRight, Play, TrendingUp, HelpCircle
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useNavigate, Link } from "react-router-dom";
import { ChurchRequestForm } from "@/components/ChurchRequestForm";
import { ContactForm } from "@/components/ContactForm";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import heroImage from "@/assets/hero-abstract.webp";

const Commercial = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [requestFormOpen, setRequestFormOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("basic");
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const isYearly = billingInterval === "yearly";

  // Reset to default platform colors on Commercial page (override tenant branding)
  // Capture referral code from URL (?ref=CODE) and persist for signup flow
  useEffect(() => {
    const refCode = new URLSearchParams(window.location.search).get("ref");
    if (refCode) {
      sessionStorage.setItem("referral_code", refCode.trim().toUpperCase());
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const defaults = {
      '--primary': '221 83% 40%',
      '--primary-light': '221 83% 70%',
      '--primary-dark': '221 83% 30%',
      '--ring': '221 83% 40%',
    };
    // Save current values to restore on unmount
    const saved: Record<string, string> = {};
    for (const key of Object.keys(defaults)) {
      saved[key] = root.style.getPropertyValue(key);
      root.style.setProperty(key, defaults[key as keyof typeof defaults]);
    }
    return () => {
      for (const [key, val] of Object.entries(saved)) {
        if (val) root.style.setProperty(key, val);
        else root.style.removeProperty(key);
      }
    };
  }, []);

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

  const yearlyPrices: Record<string, string> = {
    basic: "305",
    standard: "612",
    premium: "1,020",
  };

  const pricingPlans = [
    {
      name: t("commercial.plan_essential"),
      price: "29.99",
      yearlyPrice: yearlyPrices.basic,
      period: isYearly ? t("sub.perYear") : t("commercial.perMonth"),
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
      price: "59.99",
      yearlyPrice: yearlyPrices.standard,
      period: isYearly ? t("sub.perYear") : t("commercial.perMonth"),
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
      price: "99.99",
      yearlyPrice: yearlyPrices.premium,
      period: isYearly ? t("sub.perYear") : t("commercial.perMonth"),
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
        
        const interval = billingInterval;
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: { plan: planMap[planKey] || planKey, interval },
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
    { value: "100%", label: t("commercial.stat_support") }
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/40 shadow-sm shadow-primary/5">
        <div className="container mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary blur-md opacity-40 rounded-full" />
              <img src="/images/church-management-pro-logo.webp" alt="Church Manager Pro" className="h-9 sm:h-10 object-contain relative" width={40} height={40} />
            </div>
            <span className="hidden md:inline-block font-bold text-lg tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent truncate">
              Church Manager Pro
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors text-sm">{t("commercial.nav_features")}</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors text-sm">{t("commercial.nav_pricing")}</a>
            <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors text-sm">{t("commercial.nav_testimonials")}</a>
            <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors text-sm">FAQ</a>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <LanguageSelector />
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="hidden lg:flex">
              <Shield className="w-4 h-4 mr-2" />
              {t("commercial.admin")}
            </Button>
            <Button size="sm" onClick={() => setRequestFormOpen(true)} className="bg-gradient-to-r from-primary to-primary-dark hover:opacity-90 transition-opacity text-xs sm:text-sm px-3 sm:px-4">
              {t("commercial.getStarted")}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 sm:pt-28 sm:pb-20 md:pt-40 md:pb-32">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,hsl(var(--foreground))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground))_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]" />
          <div className="absolute top-20 left-0 sm:left-10 w-56 sm:w-72 h-56 sm:h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-0 sm:right-10 w-72 sm:w-96 h-72 sm:h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] sm:w-[800px] h-[500px] sm:h-[800px] bg-gradient-to-r from-primary/5 to-secondary/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
            <div className="text-center lg:text-left animate-fade-in">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-5 sm:mb-6 leading-tight">
                <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                  {t("commercial.heroTitle1")}
                </span>
                <br />
                <span className="bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
                  {t("commercial.heroTitle2")}
                </span>
              </h1>
              
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-7 sm:mb-8 max-w-xl mx-auto lg:mx-0">
                {t("commercial.heroSubtitle")}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start mb-8">
                <Button 
                  size="lg" 
                  onClick={() => setRequestFormOpen(true)} 
                  className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary-dark hover:opacity-90 transition-all shadow-lg shadow-primary/25 group"
                >
                  {t("commercial.trialButton")}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="w-full sm:w-auto group border-2"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <Play className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  {t("commercial.demoButton")}
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 sm:pt-8 border-t border-border/50">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center lg:text-left group">
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent group-hover:scale-105 transition-transform inline-block">{stat.value}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative animate-fade-in mt-4 lg:mt-0 px-4 sm:px-6 lg:px-0" style={{ animationDelay: '0.2s' }}>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-primary/10">
                <img 
                  src={heroImage} 
                  alt="ChurchManager Platform" 
                  className="w-full h-auto object-cover"
                  width={1920}
                  height={1088}
                  fetchPriority="high"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
              </div>
              
              <div className="absolute -bottom-4 sm:-bottom-6 left-0 sm:-left-6 bg-card p-3 sm:p-4 rounded-xl shadow-xl border animate-fade-in max-w-[200px] sm:max-w-none" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs sm:text-sm truncate">{t("commercial.floatingMembers")}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t("commercial.floatingMembersDesc")}</p>
                  </div>
                </div>
              </div>
              
              <div className="absolute -top-3 sm:-top-4 right-0 sm:-right-4 bg-card p-3 sm:p-4 rounded-xl shadow-xl border animate-fade-in max-w-[200px] sm:max-w-none" style={{ animationDelay: '0.6s' }}>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs sm:text-sm truncate">{t("commercial.floatingAttendance")}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t("commercial.floatingAttendanceDesc")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Pricing Section */}
      <section id="pricing" className="py-16 sm:py-20 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-background to-background" />
        <div className="absolute inset-0 opacity-[0.03] [background-image:radial-gradient(hsl(var(--foreground))_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <Badge className="mb-4 px-3 py-1.5 sm:px-4 sm:py-2 bg-primary/10 text-primary border-primary/20 text-xs sm:text-sm">
              <DollarSign className="w-3 h-3 mr-2" />
              {t("commercial.pricingBadge")}
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              {t("commercial.pricingTitle")}
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground px-2">
              {t("commercial.pricingSubtitle")}
            </p>
            {/* Billing toggle */}
            <div className="inline-flex items-center justify-center gap-1 mt-6 sm:mt-8 p-1 sm:p-1.5 rounded-2xl bg-muted/60 border border-border/60 backdrop-blur-sm">
              <button
                onClick={() => setBillingInterval("monthly")}
                className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  !isYearly ? "bg-background text-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("sub.monthly")}
              </button>
              <button
                onClick={() => setBillingInterval("yearly")}
                className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 sm:gap-2 ${
                  isYearly ? "bg-background text-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("sub.yearly")}
                <Badge className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0 sm:py-0.5 bg-green-500/15 text-green-600 border-green-500/30 hover:bg-green-500/20">
                  {t("sub.save15")}
                </Badge>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 lg:gap-8 max-w-5xl mx-auto pt-2">
            {pricingPlans.map((plan, index) => (
              <div key={index} className="relative">
                {plan.popular && (
                  <div className="absolute -inset-[2px] bg-gradient-to-br from-primary via-secondary to-primary rounded-2xl opacity-75 blur-sm" />
                )}
                <Card 
                  className={`relative h-full overflow-hidden transition-all duration-300 hover:-translate-y-2 bg-card ${
                    plan.popular 
                      ? 'border-0 shadow-2xl shadow-primary/20 lg:scale-105' 
                      : 'border-2 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-primary to-secondary text-white text-center py-2 text-xs sm:text-sm font-semibold tracking-wide">
                      <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1.5 fill-white" />
                      {t("commercial.mostPopular")}
                    </div>
                  )}
                  <CardHeader className={`text-center ${plan.popular ? 'pt-12' : 'pt-8'} px-5 sm:px-6`}>
                    <CardTitle className="text-xl sm:text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="text-sm sm:text-base min-h-[2.5rem] sm:min-h-[3rem]">{plan.description}</CardDescription>
                    <div className="mt-5 sm:mt-6">
                      {isYearly ? (
                        <div className="flex flex-col items-center">
                          <span className="text-xs sm:text-sm line-through text-muted-foreground">${parseInt(plan.price) * 12}{t("commercial.perMonth")}</span>
                          <div className="flex items-baseline gap-1 flex-wrap justify-center">
                            <span className="text-4xl sm:text-5xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">${plan.yearlyPrice}</span>
                            <span className="text-muted-foreground text-sm sm:text-base">{plan.period}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-baseline justify-center gap-1 flex-wrap">
                          <span className="text-4xl sm:text-5xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">${plan.price}</span>
                          <span className="text-muted-foreground text-base sm:text-lg">{plan.period}</span>
                        </div>
                      )}
                    </div>
                    {isYearly && (
                      <p className="text-xs text-muted-foreground mt-2">{t("sub.billedAnnually")}</p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-2 px-5 sm:px-6 pb-6">
                    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-5 sm:mb-6" />
                    <ul className="space-y-3 sm:space-y-3.5">
                      {plan.features.map((feature, fIndex) => (
                        <li key={fIndex} className="flex items-start gap-3">
                          <div className={`w-5 h-5 mt-0.5 rounded-full flex items-center justify-center flex-shrink-0 ${plan.popular ? 'bg-gradient-to-br from-primary to-secondary' : 'bg-primary/10'}`}>
                            <Check className={`w-3 h-3 ${plan.popular ? 'text-white' : 'text-primary'}`} strokeWidth={3} />
                          </div>
                          <span className="text-sm leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className={`w-full mt-6 sm:mt-8 group ${
                        plan.popular 
                          ? 'bg-gradient-to-r from-primary to-primary-dark hover:opacity-90 shadow-lg shadow-primary/25' 
                          : ''
                      }`}
                      variant={plan.popular ? "default" : "outline"}
                      size="lg"
                      onClick={() => handlePlanSelect(plan.planKey)}
                    >
                      {t("commercial.choosePlan")}
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TestimonialsSection />

      {/* FAQ Section */}
      <section id="faq" className="py-16 sm:py-20 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <Badge className="mb-4 px-3 py-1.5 sm:px-4 sm:py-2 bg-primary/10 text-primary border-primary/20 text-xs sm:text-sm">
              <HelpCircle className="w-3 h-3 mr-2" />
              {t("commercial.faqBadge")}
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              {t("commercial.faqTitle")}
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
              {t("commercial.faqSubtitle")}
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-3 sm:space-y-4">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <AccordionItem
                  key={n}
                  value={`item-${n}`}
                  className="border border-border/60 bg-card/60 backdrop-blur-sm rounded-xl px-4 sm:px-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all data-[state=open]:border-primary/40 data-[state=open]:shadow-lg data-[state=open]:shadow-primary/5"
                >
                  <AccordionTrigger className="text-left text-sm sm:text-base font-semibold hover:no-underline py-4 sm:py-5 [&[data-state=open]>svg]:text-primary">
                    <span className="flex items-start gap-3 pr-2">
                      <span className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-primary to-secondary text-white text-xs sm:text-sm font-bold flex items-center justify-center mt-0.5">
                        {n}
                      </span>
                      <span className="min-w-0">{t(`commercial.faq${n}Q`)}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm sm:text-base text-muted-foreground leading-relaxed pl-9 sm:pl-10 pb-5">
                    {t(`commercial.faq${n}A`)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <div className="mt-10 sm:mt-12 text-center">
              <p className="text-sm sm:text-base text-muted-foreground mb-4">
                {t("commercial.faqMoreQuestions")}
              </p>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setRequestFormOpen(true)}
                className="border-2 group"
              >
                <Mail className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                {t("commercial.faqContactUs")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-dark to-primary" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:40px_40px]" />
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-10 left-0 sm:left-10 w-56 sm:w-72 h-56 sm:h-72 bg-white rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-0 sm:right-10 w-72 sm:w-96 h-72 sm:h-96 bg-secondary rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        </div>
        <div className="container mx-auto px-4 sm:px-6 relative text-center">
          <div className="max-w-3xl mx-auto">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-2xl">
              <Heart className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-5 sm:mb-6 text-white leading-tight">
              {t("commercial.ctaTitle")}
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-white/80 mb-8 sm:mb-10 max-w-2xl mx-auto px-2">
              {t("commercial.ctaSubtitle")}
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              onClick={() => setRequestFormOpen(true)}
              className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 h-auto shadow-xl hover:scale-105 transition-transform"
            >
              {t("commercial.ctaButton")}
              <Sparkles className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact" className="py-12 sm:py-16 border-t bg-background">
        <div className="container mx-auto px-4 sm:px-6 max-w-2xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">
              {language === "fr" ? "Contactez notre équipe" : language === "ht" ? "Kontakte ekip nou an" : "Contact our team"}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              {language === "fr"
                ? "Une question ? Envoyez-nous un message, nous répondons rapidement."
                : language === "ht"
                ? "Yon kesyon ? Voye yon mesaj ban nou, n ap reponn vit."
                : "Have a question? Send us a message — we reply quickly."}
            </p>
          </div>
          <ContactForm language={language} />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 sm:py-12 border-t bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-5 md:gap-6">
            <div className="flex items-center gap-3">
              <img src="/images/church-management-pro-logo.webp" alt="Church Manager Pro" className="h-9 sm:h-10 object-contain" width={40} height={40} />
            </div>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 text-xs sm:text-sm">
              <a href="mailto:support@churchmanagementpro.com" className="text-muted-foreground hover:text-foreground transition-colors">
                support@churchmanagementpro.com
              </a>
              <a href="tel:+19084944977" className="text-muted-foreground hover:text-foreground transition-colors">
                +1 (908) 494-4977
              </a>
            </div>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 text-xs sm:text-sm">
              <Link to="/legal/terms_of_use" className="text-muted-foreground hover:text-foreground transition-colors">
                {language === "fr" ? "Conditions d'utilisation" : language === "ht" ? "Kondisyon itilizasyon" : "Terms of Use"}
              </Link>
              <Link to="/legal/privacy_policy" className="text-muted-foreground hover:text-foreground transition-colors">
                {language === "fr" ? "Politique de confidentialité" : language === "ht" ? "Politik konfidansyalite" : "Privacy Policy"}
              </Link>
              <Link to="/legal/payment_terms" className="text-muted-foreground hover:text-foreground transition-colors">
                {language === "fr" ? "Conditions de paiement" : language === "ht" ? "Kondisyon peman" : "Payment Terms"}
              </Link>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground text-center">
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
