import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Users, Calendar, DollarSign, BarChart3, QrCode, Building2, 
  Package, Mail, Shield, Globe, Check, ArrowRight, Star,
  Church, Heart, Clock, Smartphone, Send, Phone, MapPin
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    churchName: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success("Message envoyé avec succès! Nous vous contacterons bientôt.");
    setFormData({ name: "", email: "", phone: "", churchName: "", message: "" });
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nom complet *</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Jean Dupont"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="jean@example.com"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+1 (555) 000-0000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="churchName">Nom de l'église</Label>
          <Input
            id="churchName"
            name="churchName"
            value={formData.churchName}
            onChange={handleChange}
            placeholder="Église de la Grâce"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message *</Label>
        <Textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          placeholder="Décrivez vos besoins ou posez vos questions..."
          rows={4}
          required
        />
      </div>
      <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
        {isSubmitting ? (
          "Envoi en cours..."
        ) : (
          <>
            <Send className="w-4 h-4" />
            Envoyer le Message
          </>
        )}
      </Button>
    </form>
  );
};

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

      {/* Contact Form Section */}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Contact Info */}
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-semibold mb-6">Parlons de votre projet</h3>
                <p className="text-muted-foreground mb-8">
                  Que vous ayez besoin d'une démonstration personnalisée ou de renseignements sur nos tarifs, 
                  nous sommes là pour répondre à toutes vos questions.
                </p>
              </div>
              <div className="space-y-4">
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
              </div>
            </div>

            {/* Contact Form */}
            <Card>
              <CardHeader>
                <CardTitle>Envoyez-nous un message</CardTitle>
                <CardDescription>
                  Remplissez le formulaire ci-dessous et nous vous répondrons dans les plus brefs délais.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContactForm />
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
