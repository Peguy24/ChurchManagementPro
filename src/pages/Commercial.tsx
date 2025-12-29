import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, Calendar, DollarSign, BarChart3, QrCode, Building2, 
  Package, Mail, Shield, Globe, Check, ArrowRight, Star,
  Church, Heart, Clock, Smartphone, Phone, MapPin,
  TrendingUp, TrendingDown, Wallet, PiggyBank
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const Commercial = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Users,
      title: "Gestion des Membres",
      description: "Fichiers complets avec photos, QR codes, documents et champs personnalisables"
    },
    {
      icon: QrCode,
      title: "Suivi de Présence",
      description: "Scanner QR/code-barres avec alertes d'absence automatiques"
    },
    {
      icon: DollarSign,
      title: "Gestion Financière",
      description: "Donations, dépenses, budgets, caisses et comptes bancaires"
    },
    {
      icon: Calendar,
      title: "Événements",
      description: "Planification et suivi des événements avec rappels automatiques"
    },
    {
      icon: Building2,
      title: "Multi-Succursales",
      description: "Gérez plusieurs sites depuis une seule interface"
    },
    {
      icon: Package,
      title: "Inventaire",
      description: "Suivi du matériel avec codes-barres et maintenance"
    },
    {
      icon: Mail,
      title: "Emails Automatiques",
      description: "Templates personnalisables pour anniversaires et rappels"
    },
    {
      icon: Shield,
      title: "Rôles & Permissions",
      description: "Contrôle d'accès granulaire par utilisateur"
    },
    {
      icon: BarChart3,
      title: "Rapports Détaillés",
      description: "Statistiques complètes et exports PDF/Excel"
    },
    {
      icon: Globe,
      title: "Multi-Langue",
      description: "Interface disponible en plusieurs langues"
    },
    {
      icon: Smartphone,
      title: "Responsive",
      description: "Fonctionne parfaitement sur mobile et tablette"
    },
    {
      icon: Clock,
      title: "Temps Réel",
      description: "Synchronisation instantanée des données"
    }
  ];

  const pricingPlans = [
    {
      name: "Essentiel",
      price: "49",
      period: "/mois",
      description: "Pour les petites églises",
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

  const testimonials = [
    {
      name: "Pasteur Jean-Pierre",
      church: "Église de la Grâce",
      text: "Ce système a révolutionné notre gestion. Nous économisons des heures chaque semaine.",
      rating: 5
    },
    {
      name: "Secrétaire Marie",
      church: "Communauté Évangélique",
      text: "Le suivi des présences par QR code est incroyable. Les membres adorent!",
      rating: 5
    },
    {
      name: "Trésorier Paul",
      church: "Temple de Louange",
      text: "Les rapports financiers nous ont permis de mieux gérer notre budget.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-4">
              <Church className="w-3 h-3 mr-1" />
              Système de Gestion d'Église
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Gérez Votre Église avec Excellence
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Une solution complète et moderne pour gérer vos membres, finances, événements et bien plus encore.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/auth")} className="gap-2">
                Commencer Gratuitement
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>
                Voir les Tarifs
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Concrete Results Section */}
      <section className="py-20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              <TrendingUp className="w-3 h-3 mr-1" />
              Résultats Concrets
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Impact Financier Réel
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Voici les résultats moyens obtenus par les églises utilisant notre système
            </p>
          </div>

          {/* Main Financial Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -mr-10 -mt-10" />
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-2">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <CardDescription>Revenus Moyens</CardDescription>
                <CardTitle className="text-3xl text-green-600">+35%</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Augmentation des donations grâce au suivi optimisé et aux rappels automatiques
                </p>
                <div className="flex items-center gap-1 mt-2 text-green-600">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">+$12,500/an en moyenne</span>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full -mr-10 -mt-10" />
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center mb-2">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
                <CardDescription>Dépenses Réduites</CardDescription>
                <CardTitle className="text-3xl text-red-600">-25%</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Réduction des coûts grâce à l'automatisation et la gestion centralisée
                </p>
                <div className="flex items-center gap-1 mt-2 text-red-600">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-sm font-medium">-$5,000/an économisés</span>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -mr-10 -mt-10" />
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center mb-2">
                  <Wallet className="w-6 h-6 text-orange-600" />
                </div>
                <CardDescription>Charges Administratives</CardDescription>
                <CardTitle className="text-3xl text-orange-600">-40%</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Moins de temps passé sur la paperasse grâce aux rapports automatisés
                </p>
                <div className="flex items-center gap-1 mt-2 text-orange-600">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">15h/semaine économisées</span>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-primary/50">
              <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full -mr-10 -mt-10" />
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <PiggyBank className="w-6 h-6 text-primary" />
                </div>
                <CardDescription>Bénéfice Net</CardDescription>
                <CardTitle className="text-3xl text-primary">+$17,500</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Bénéfice annuel moyen après adoption du système
                </p>
                <div className="flex items-center gap-1 mt-2 text-primary">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">ROI de 1200%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Breakdown */}
          <Card className="max-w-4xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Exemple Concret: Église de 500 Membres</CardTitle>
              <CardDescription>Comparaison avant/après utilisation du système sur 1 an</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Before */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-center pb-2 border-b">Avant</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Revenus (dons)</span>
                      <span>$85,000</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Dépenses opérationnelles</span>
                      <span className="text-red-600">-$45,000</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Charges admin</span>
                      <span className="text-red-600">-$20,000</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Logiciels divers</span>
                      <span className="text-red-600">-$3,500</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-2 border-t">
                      <span>Bénéfice net</span>
                      <span className="text-orange-600">$16,500</span>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center">
                  <div className="hidden md:flex flex-col items-center gap-2">
                    <ArrowRight className="w-12 h-12 text-primary" />
                    <span className="text-sm font-medium text-primary">Avec notre système</span>
                  </div>
                  <div className="md:hidden flex items-center gap-2 py-4">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-sm font-medium text-primary px-2">Avec notre système</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                </div>

                {/* After */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-center pb-2 border-b text-primary">Après</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Revenus (dons)</span>
                      <span className="text-green-600">$114,750 (+35%)</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Dépenses opérationnelles</span>
                      <span className="text-red-600">-$33,750 (-25%)</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Charges admin</span>
                      <span className="text-red-600">-$12,000 (-40%)</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Notre système</span>
                      <span className="text-red-600">-$1,188</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-2 border-t">
                      <span>Bénéfice net</span>
                      <span className="text-green-600">$67,812</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 bg-primary/5 rounded-lg text-center">
                <p className="text-lg font-semibold text-primary">
                  Gain annuel: +$51,312
                </p>
                <p className="text-sm text-muted-foreground">
                  soit plus de 4x le coût du système
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Une plateforme complète conçue spécifiquement pour les besoins des églises modernes
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tarifs Simples et Transparents
            </h2>
            <p className="text-muted-foreground text-lg">
              Choisissez le plan qui correspond à la taille de votre église
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Plus Populaire
                  </Badge>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full mt-6" 
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => navigate("/auth")}
                  >
                    Choisir ce Plan
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ce que disent nos clients
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="text-center">
                <CardContent className="pt-6">
                  <div className="flex justify-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 italic">"{testimonial.text}"</p>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.church}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Info Section */}
      <section id="contact" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Contactez-Nous
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Vous avez des questions? Notre équipe est là pour vous aider.
            </p>
          </div>
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CardTitle>Nos Coordonnées</CardTitle>
                <CardDescription>
                  N'hésitez pas à nous contacter pour toute question ou demande de démonstration.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-muted-foreground">contact@churchmanager.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Téléphone</p>
                    <p className="text-muted-foreground">+1 (555) 123-4567</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Adresse</p>
                    <p className="text-muted-foreground">123 Rue de l'Église, Montréal, QC</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <Heart className="w-12 h-12 mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Prêt à transformer votre église?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Rejoignez des centaines d'églises qui font confiance à notre système pour gérer leur communauté.
          </p>
          <Button 
            size="lg" 
            variant="secondary" 
            onClick={() => navigate("/auth")}
            className="gap-2"
          >
            Démarrer l'Essai Gratuit
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Church className="w-6 h-6 text-primary" />
              <span className="font-semibold">ChurchManager Pro</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 ChurchManager Pro. Tous droits réservés.
            </p>
            <div className="flex gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
                Connexion
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Commercial;
