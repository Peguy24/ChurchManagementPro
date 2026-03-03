import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Church, Send, Loader2, CheckCircle, User, Heart, Users, GraduationCap } from "lucide-react";

export default function JoinChurch() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [churchName, setChurchName] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    gender: "",
    dateOfBirth: "",
    phone: "",
    email: "",
    emergencyPhone: "",
    street: "",
    number: "",
    apartment: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    academicFormation: "",
    professionalFormation: "",
    baptismStatus: "",
    baptismDate: "",
    originChurch: "",
    conversionDate: "",
    christianExperience: "",
    maritalStatus: "",
    spouseName: "",
    marriageDate: "",
    numberOfChildren: "",
    childrenNames: "",
    message: "",
  });

  useEffect(() => {
    if (tenantId) {
      supabase
        .from("tenants")
        .select("name")
        .eq("id", tenantId)
        .single()
        .then(({ data }) => {
          if (data) setChurchName(data.name);
        });
    }
  }, [tenantId]);

  const updateField = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName) {
      toast.error("Veuillez remplir le nom et le prénom.");
      return;
    }
    if (!tenantId) {
      toast.error("Lien invalide.");
      return;
    }

    setIsSubmitting(true);
    try {
      const address = {
        street: formData.street,
        number: formData.number,
        apartment: formData.apartment,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country,
      };

      const { error } = await supabase.from("member_requests").insert({
        tenant_id: tenantId,
        first_name: formData.firstName,
        last_name: formData.lastName,
        gender: formData.gender || null,
        date_of_birth: formData.dateOfBirth || null,
        phone: formData.phone || null,
        email: formData.email || null,
        emergency_phone: formData.emergencyPhone || null,
        address,
        academic_formation: formData.academicFormation || null,
        professional_formation: formData.professionalFormation || null,
        baptism_status: formData.baptismStatus || null,
        baptism_date: formData.baptismDate || null,
        origin_church: formData.originChurch || null,
        conversion_date: formData.conversionDate || null,
        christian_experience: formData.christianExperience || null,
        marital_status: formData.maritalStatus || null,
        spouse_name: formData.spouseName || null,
        marriage_date: formData.marriageDate || null,
        number_of_children: formData.numberOfChildren ? parseInt(formData.numberOfChildren) : 0,
        children_names: formData.childrenNames || null,
        message: formData.message || null,
      });

      if (error) throw error;
      setSubmitted(true);
      toast.success("Demande envoyée avec succès!");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Erreur: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Demande envoyée!</h2>
            <p className="text-muted-foreground">
              Votre demande d'adhésion à <strong>{churchName}</strong> a été envoyée avec succès.
              L'administration de l'église examinera votre demande et vous contactera bientôt.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Church className="h-12 w-12 text-primary mx-auto mb-3" />
          <h1 className="text-3xl font-bold">Demande d'adhésion</h1>
          {churchName && (
            <p className="text-lg text-muted-foreground mt-1">{churchName}</p>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            Remplissez ce formulaire pour devenir membre de notre église
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit}>
              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="personal" className="text-xs sm:text-sm">
                    <User className="h-4 w-4 mr-1 hidden sm:inline" />
                    Personnel
                  </TabsTrigger>
                  <TabsTrigger value="formation" className="text-xs sm:text-sm">
                    <GraduationCap className="h-4 w-4 mr-1 hidden sm:inline" />
                    Formation
                  </TabsTrigger>
                  <TabsTrigger value="spiritual" className="text-xs sm:text-sm">
                    <Heart className="h-4 w-4 mr-1 hidden sm:inline" />
                    Spirituel
                  </TabsTrigger>
                  <TabsTrigger value="family" className="text-xs sm:text-sm">
                    <Users className="h-4 w-4 mr-1 hidden sm:inline" />
                    Famille
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Prénom *</Label>
                      <Input value={formData.firstName} onChange={(e) => updateField("firstName", e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Nom *</Label>
                      <Input value={formData.lastName} onChange={(e) => updateField("lastName", e.target.value)} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Genre</Label>
                      <Select value={formData.gender} onValueChange={(v) => updateField("gender", v)}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Masculin</SelectItem>
                          <SelectItem value="F">Féminin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date de naissance</Label>
                      <Input type="date" value={formData.dateOfBirth} onChange={(e) => updateField("dateOfBirth", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Téléphone</Label>
                      <Input value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Téléphone d'urgence</Label>
                    <Input value={formData.emergencyPhone} onChange={(e) => updateField("emergencyPhone", e.target.value)} />
                  </div>
                  <h4 className="font-semibold text-sm pt-2">Adresse</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label>Rue</Label>
                      <Input value={formData.street} onChange={(e) => updateField("street", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Numéro</Label>
                      <Input value={formData.number} onChange={(e) => updateField("number", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Apt</Label>
                      <Input value={formData.apartment} onChange={(e) => updateField("apartment", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Ville</Label>
                      <Input value={formData.city} onChange={(e) => updateField("city", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Province/État</Label>
                      <Input value={formData.state} onChange={(e) => updateField("state", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Code postal</Label>
                      <Input value={formData.zipCode} onChange={(e) => updateField("zipCode", e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Pays</Label>
                    <Input value={formData.country} onChange={(e) => updateField("country", e.target.value)} />
                  </div>
                </TabsContent>

                <TabsContent value="formation" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Formation académique</Label>
                    <Textarea value={formData.academicFormation} onChange={(e) => updateField("academicFormation", e.target.value)} placeholder="Vos études et diplômes..." rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>Formation professionnelle</Label>
                    <Textarea value={formData.professionalFormation} onChange={(e) => updateField("professionalFormation", e.target.value)} placeholder="Votre expérience professionnelle..." rows={3} />
                  </div>
                </TabsContent>

                <TabsContent value="spiritual" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Statut de baptême</Label>
                      <Select value={formData.baptismStatus} onValueChange={(v) => updateField("baptismStatus", v)}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baptized">Baptisé(e)</SelectItem>
                          <SelectItem value="not_baptized">Non baptisé(e)</SelectItem>
                          <SelectItem value="in_preparation">En préparation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date de baptême</Label>
                      <Input type="date" value={formData.baptismDate} onChange={(e) => updateField("baptismDate", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Église d'origine</Label>
                      <Input value={formData.originChurch} onChange={(e) => updateField("originChurch", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Date de conversion</Label>
                      <Input type="date" value={formData.conversionDate} onChange={(e) => updateField("conversionDate", e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Expérience chrétienne</Label>
                    <Textarea value={formData.christianExperience} onChange={(e) => updateField("christianExperience", e.target.value)} placeholder="Décrivez votre parcours spirituel..." rows={3} />
                  </div>
                </TabsContent>

                <TabsContent value="family" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Statut matrimonial</Label>
                      <Select value={formData.maritalStatus} onValueChange={(v) => updateField("maritalStatus", v)}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Célibataire</SelectItem>
                          <SelectItem value="married">Marié(e)</SelectItem>
                          <SelectItem value="divorced">Divorcé(e)</SelectItem>
                          <SelectItem value="widowed">Veuf/Veuve</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Nom du conjoint</Label>
                      <Input value={formData.spouseName} onChange={(e) => updateField("spouseName", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date de mariage</Label>
                      <Input type="date" value={formData.marriageDate} onChange={(e) => updateField("marriageDate", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Nombre d'enfants</Label>
                      <Input type="number" min="0" value={formData.numberOfChildren} onChange={(e) => updateField("numberOfChildren", e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Noms des enfants</Label>
                    <Textarea value={formData.childrenNames} onChange={(e) => updateField("childrenNames", e.target.value)} placeholder="Noms et âges des enfants..." rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>Message (optionnel)</Label>
                    <Textarea value={formData.message} onChange={(e) => updateField("message", e.target.value)} placeholder="Un message pour l'administration..." rows={2} />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="mt-6">
                <Button type="submit" className="w-full" disabled={isSubmitting} size="lg">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Envoyer ma demande d'adhésion
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
