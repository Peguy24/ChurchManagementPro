import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";
import { Download, QrCode as QrCodeIcon, User, Heart, Users, Church, Camera, Upload, X, Crop } from "lucide-react";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { todayInputValue } from "@/lib/date";
import PhotoCropper from "./PhotoCropper";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { CustomFieldsRenderer } from "@/components/CustomFieldsRenderer";
import { saveCustomFieldValues } from "@/lib/customFieldsUtils";
import { memberFullSchema, validateForm, firstErrorMessage, personNameSchema, optionalPastDateSchema, optionalEmailSchema, optionalPhoneSchema, phoneSchema } from "@/lib/validation";

const liveCheck = (schema: { safeParse: (v: unknown) => any }, value: string): string | null => {
  const result = schema.safeParse(value);
  if (result.success) return null;
  return result.error?.issues?.[0]?.message ?? null;
};
import { FieldError } from "@/components/FieldError";

const localT: Record<Language, Record<string, string>> = {
  fr: {
    editMember: "Modifier le Membre",
    addMember: "Ajouter un Membre",
    personalInfo: "Informations Personnelles",
    spiritualInfo: "Informations Spirituelles",
    familyInfo: "Informations Familiales",
    memberPhoto: "Photo du Membre",
    memberPhotoAlt: "Photo du membre",
    memberAddPhoto: "Ajouter une photo",
    memberChangePhoto: "Changer la photo",
    memberPhotoHint: "JPEG, PNG, WebP ou GIF. Max 5 Mo.",
    photoTooLarge: "Fichier trop volumineux",
    photoTooLargeDesc: "La photo ne doit pas dépasser 5 Mo.",
    photoFormatError: "Format non supporté",
    photoFormatErrorDesc: "Veuillez utiliser un format JPEG, PNG, WebP ou GIF.",
    photoUploadError: "Erreur d'upload",
    photoUploadErrorDesc: "Impossible de télécharger la photo.",
    lastName: "Nom",
    firstName: "Prénom",
    gender: "Genre",
    selectGender: "Sélectionner le genre",
    male: "Masculin",
    female: "Féminin",
    dateOfBirth: "Date de naissance",
    phone: "Téléphone",
    email: "Email",
    emergencyPhone: "Contact d'urgence",
    emergencyContact: "Contact d'urgence",
    address: "Adresse",
    street: "Rue",
    city: "Ville",
    zipCode: "Code postal",
    stateRegion: "État/Région",
    country: "Pays",
    joinDate: "Date d'adhésion",
    selectBranch: "Sélectionner une branche",
    formationSection: "Formation",
    academicFormation: "Formation académique",
    professionalFormation: "Formation professionnelle",
    academicPlaceholder: "Ex: Licence en informatique, Bac+3...",
    professionalPlaceholder: "Ex: Comptable, Ingénieur...",
    baptized: "Baptisé(e)",
    baptismDate: "Date de baptême",
    originChurch: "Église d'origine",
    originChurchPlaceholder: "Nom de l'église précédente",
    ministryRole: "Ministère / Service",
    selectRole: "Sélectionner un rôle",
    conversionDate: "Date de conversion",
    christianExperience: "Expérience Chrétienne/Ministérielle",
    christianExperiencePlaceholder: "Service dans l'église, responsabilités, etc.",
    ministry: "Ministère",
    selectMinistry: "Sélectionner un ministère",
    maritalStatus: "État civil",
    selectMaritalStatus: "Sélectionner l'état civil",
    maritalSingle: "Célibataire",
    maritalMarried: "Marié(e)",
    maritalDivorced: "Divorcé(e)",
    maritalWidowed: "Veuf/Veuve",
    spouseName: "Nom du conjoint(e)",
    spouseNamePlaceholder: "Nom de votre conjoint(e)",
    marriageDate: "Date de mariage",
    numberOfChildren: "Nombre d'enfants",
    childrenNames: "Noms des enfants",
    childrenNamesPlaceholder: "Noms des enfants (séparés par une virgule)",
    roleMember: "Membre",
    roleDeacon: "Diacre",
    roleElder: "Ancien",
    rolePastor: "Pasteur",
    roleSecretary: "Secrétaire",
    roleTreasurer: "Trésorier",
    roleWorship: "Chantre",
    roleTech: "Technique",
    qrCode: "QR Code du Membre",
    qrCodeDescription: "Ce QR code est unique pour ce membre. Scannez-le pour accéder à la fiche.",
    downloadQrCode: "Télécharger le QR Code",
    memberUpdated: "Membre mis à jour",
    memberAdded: "Membre ajouté",
    branch: "Branche",
    select: "Sélectionner",
    active: "Actif",
    inactive: "Inactif",
    transferred: "Transféré",
    deceased: "Décédé",
    archived: "Archivé",
    status: "Statut",
    none: "Aucun",
    yes: "Oui",
    no: "Non",
    cancel: "Annuler",
    save: "Enregistrer",
    loading: "Chargement...",
    error: "Erreur",
  },
  en: {
    editMember: "Edit Member",
    addMember: "Add Member",
    personalInfo: "Personal Information",
    spiritualInfo: "Spiritual Information",
    familyInfo: "Family Information",
    memberPhoto: "Member Photo",
    memberPhotoAlt: "Member photo",
    memberAddPhoto: "Add a photo",
    memberChangePhoto: "Change photo",
    memberPhotoHint: "JPEG, PNG, WebP, or GIF. Max 5 MB.",
    photoTooLarge: "File too large",
    photoTooLargeDesc: "Photo must not exceed 5 MB.",
    photoFormatError: "Unsupported format",
    photoFormatErrorDesc: "Please use JPEG, PNG, WebP, or GIF format.",
    photoUploadError: "Upload error",
    photoUploadErrorDesc: "Unable to upload the photo.",
    lastName: "Last Name",
    firstName: "First Name",
    gender: "Gender",
    selectGender: "Select gender",
    male: "Male",
    female: "Female",
    dateOfBirth: "Date of Birth",
    phone: "Phone",
    email: "Email",
    emergencyPhone: "Emergency Contact",
    emergencyContact: "Emergency Contact",
    address: "Address",
    street: "Street",
    city: "City",
    zipCode: "Zip Code",
    stateRegion: "State/Region",
    country: "Country",
    joinDate: "Church Join Date",
    selectBranch: "Select a branch",
    formationSection: "Education & Training",
    academicFormation: "Academic education",
    professionalFormation: "Professional training",
    academicPlaceholder: "e.g. Bachelor's in Computer Science, MBA...",
    professionalPlaceholder: "e.g. Accountant, Engineer...",
    baptized: "Baptized",
    baptismDate: "Baptism Date",
    originChurch: "Origin Church",
    originChurchPlaceholder: "Previous church name",
    ministryRole: "Ministry / Service",
    selectRole: "Select a role",
    conversionDate: "Conversion Date",
    christianExperience: "Christian/Ministry Experience",
    christianExperiencePlaceholder: "Church service, responsibilities, etc.",
    ministry: "Ministry",
    selectMinistry: "Select a ministry",
    maritalStatus: "Marital Status",
    selectMaritalStatus: "Select marital status",
    maritalSingle: "Single",
    maritalMarried: "Married",
    maritalDivorced: "Divorced",
    maritalWidowed: "Widowed",
    spouseName: "Spouse Name",
    spouseNamePlaceholder: "Your spouse's name",
    marriageDate: "Marriage Date",
    numberOfChildren: "Number of Children",
    childrenNames: "Children's Names",
    childrenNamesPlaceholder: "Children's names (separated by comma)",
    roleMember: "Member",
    roleDeacon: "Deacon",
    roleElder: "Elder",
    rolePastor: "Pastor",
    roleSecretary: "Secretary",
    roleTreasurer: "Treasurer",
    roleWorship: "Worship Leader",
    roleTech: "Tech",
    qrCode: "Member QR Code",
    qrCodeDescription: "This QR code is unique to this member. Scan it to access their profile.",
    downloadQrCode: "Download QR Code",
    memberUpdated: "Member updated",
    memberAdded: "Member added",
    branch: "Branch",
    select: "Select",
    active: "Active",
    inactive: "Inactive",
    transferred: "Transferred",
    deceased: "Deceased",
    archived: "Archived",
    status: "Status",
    none: "None",
    yes: "Yes",
    no: "No",
    cancel: "Cancel",
    save: "Save",
    loading: "Loading...",
    error: "Error",
  },
  ht: {
    editMember: "Modifye Manm",
    addMember: "Ajoute yon Manm",
    personalInfo: "Enfòmasyon Pèsonèl",
    spiritualInfo: "Enfòmasyon Espirityèl",
    familyInfo: "Enfòmasyon Fanmi",
    memberPhoto: "Foto Manm",
    memberPhotoAlt: "Foto manm nan",
    memberAddPhoto: "Ajoute yon foto",
    memberChangePhoto: "Chanje foto",
    memberPhotoHint: "JPEG, PNG, WebP oswa GIF. Maks 5 Mo.",
    photoTooLarge: "Fichye twò gwo",
    photoTooLargeDesc: "Foto a pa dwe depase 5 Mo.",
    photoFormatError: "Fòma pa sipòte",
    photoFormatErrorDesc: "Tanpri itilize fòma JPEG, PNG, WebP, oswa GIF.",
    photoUploadError: "Erè telechajman",
    photoUploadErrorDesc: "Enposib pou telechaje foto a.",
    lastName: "Non",
    firstName: "Prenon",
    gender: "Sèks",
    selectGender: "Chwazi sèks",
    male: "Gason",
    female: "Fi",
    dateOfBirth: "Dat nesans",
    phone: "Telefòn",
    email: "Imèl",
    emergencyPhone: "Kontak ijans",
    emergencyContact: "Kontak ijans",
    address: "Adrès",
    street: "Ri",
    city: "Vil",
    zipCode: "Kòd postal",
    stateRegion: "Eta/Rejyon",
    country: "Peyi",
    joinDate: "Dat antre nan legliz",
    selectBranch: "Chwazi yon branch",
    formationSection: "Fòmasyon",
    academicFormation: "Fòmasyon akademik",
    professionalFormation: "Fòmasyon pwofesyonèl",
    academicPlaceholder: "Egz: Lisans nan enfòmatik, Metriz...",
    professionalPlaceholder: "Egz: Kontab, Enjenyè...",
    baptized: "Batize",
    baptismDate: "Dat batèm",
    originChurch: "Legliz orijin",
    originChurchPlaceholder: "Non legliz anvan",
    ministryRole: "Ministè / Sèvis",
    selectRole: "Chwazi yon wòl",
    conversionDate: "Dat konvèsyon",
    christianExperience: "Eksperyans Kretyen/Ministè",
    christianExperiencePlaceholder: "Sèvis nan legliz, responsablite, elatriye.",
    ministry: "Ministè",
    selectMinistry: "Chwazi yon ministè",
    maritalStatus: "Eta sivil",
    selectMaritalStatus: "Chwazi eta sivil",
    maritalSingle: "Selibatè",
    maritalMarried: "Marye",
    maritalDivorced: "Divòse",
    maritalWidowed: "Vèf/Vèv",
    spouseName: "Non konjwen",
    spouseNamePlaceholder: "Non konjwen ou",
    marriageDate: "Dat maryaj",
    numberOfChildren: "Kantite timoun",
    childrenNames: "Non timoun yo",
    childrenNamesPlaceholder: "Non timoun yo (separe pa vigil)",
    roleMember: "Manm",
    roleDeacon: "Dyak",
    roleElder: "Ansyen",
    rolePastor: "Pastè",
    roleSecretary: "Sekretè",
    roleTreasurer: "Trezorye",
    roleWorship: "Chantè",
    roleTech: "Teknik",
    qrCode: "Kòd QR Manm",
    qrCodeDescription: "Kòd QR sa a inik pou manm sa a. Eskane li pou jwenn pwofil li.",
    downloadQrCode: "Telechaje Kòd QR",
    memberUpdated: "Manm mete ajou",
    memberAdded: "Manm ajoute",
    branch: "Branch",
    select: "Chwazi",
    active: "Aktif",
    inactive: "Inaktif",
    transferred: "Transfère",
    deceased: "Desede",
    archived: "Achive",
    status: "Estati",
    none: "Okenn",
    yes: "Wi",
    no: "Non",
    cancel: "Anile",
    save: "Anrejistre",
    loading: "Ap chaje...",
    error: "Erè",
  },
};

interface MemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: any;
  onSuccess?: () => void;
}

export default function MemberDialog({
  open,
  onOpenChange,
  member,
  onSuccess,
}: MemberDialogProps) {
  const { language, t } = useLanguage();
  const lt = localT[language];
  const { toast } = useToast();
  const { tenantId } = useCurrentTenant();
  const [loading, setLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [tempPhotoFile, setTempPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedMinistryId, setSelectedMinistryId] = useState("");
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: "",
    lastName: "",
    gender: "",
    dateOfBirth: "",
    phone: "",
    email: "",
    emergencyPhone: "",
    addressNumber: "",
    street: "",
    apartment: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    joinDate: "",
    status: "active",
    branchId: "",
    photoUrl: "",
    // Formation
    academicFormation: "",
    professionalFormation: "",
    // Spiritual Information
    baptismStatus: "",
    baptismDate: "",
    originChurch: "",
    role: "",
    conversionDate: "",
    christianExperience: "",
    // Family Information
    maritalStatus: "",
    spouseName: "",
    marriageDate: "",
    numberOfChildren: "",
    childrenNames: "",
  });

  const { data: branches } = useQuery({
    queryKey: ["branches-active", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("branches")
        .select("id, name")
        .eq("status", "active")
        .eq("tenant_id", tenantId)
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: ministries } = useQuery({
    queryKey: ["ministries-active", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("ministries")
        .select("id, name")
        .eq("status", "active")
        .eq("tenant_id", tenantId)
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Load current ministry for existing member
  const { data: currentMinistryMember } = useQuery({
    queryKey: ["member-ministry", member?.id, tenantId],
    queryFn: async () => {
      if (!member?.id) return null;
      const { data, error } = await supabase
        .from("ministry_members")
        .select("ministry_id")
        .eq("member_id", member.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!member?.id,
  });

  useEffect(() => {
    if (currentMinistryMember) {
      setSelectedMinistryId(currentMinistryMember.ministry_id || "");
    }
  }, [currentMinistryMember]);

  useEffect(() => {
    if (member) {
      let address: Record<string, string> = {};
      
      // Safe JSON parsing for address field
      if (member.address) {
        if (typeof member.address === 'object') {
          address = member.address;
        } else if (typeof member.address === 'string') {
          try {
            address = JSON.parse(member.address);
          } catch (e) {
            // If parsing fails, treat address as a simple string
            console.warn('Could not parse address as JSON, using as plain text');
            address = { street: member.address };
          }
        }
      }
      
      setFormData({
        firstName: member.first_name || "",
        lastName: member.last_name || "",
        gender: member.gender || "",
        email: member.email || "",
        phone: member.phone || "",
        dateOfBirth: member.date_of_birth || "",
        emergencyPhone: member.emergency_phone || "",
        status: member.status || "active",
        role: member.role || "",
        branchId: member.branch_id || "",
        joinDate: member.join_date || "",
        photoUrl: member.photo_url || "",
        addressNumber: address.number || "",
        street: address.street || "",
        apartment: address.apartment || "",
        city: address.city || "",
        state: address.state || "",
        zipCode: address.zipCode || "",
        country: address.country || "",
        academicFormation: member.academic_formation || "",
        professionalFormation: member.professional_formation || "",
        maritalStatus: member.marital_status || "",
        conversionDate: member.conversion_date || "",
        baptismDate: member.baptism_date || "",
        baptismStatus: member.baptism_status || "",
        originChurch: member.origin_church || "",
        christianExperience: member.christian_experience || "",
        marriageDate: member.marriage_date || "",
        spouseName: member.spouse_name || "",
        numberOfChildren: member.number_of_children?.toString() || "",
        childrenNames: member.children_names || "",
      });

      // Set photo preview if exists
      if (member.photo_url) {
        setPhotoPreview(member.photo_url);
      } else {
        setPhotoPreview("");
      }

      // Generate QR code for existing member
      if (member.qr_code) {
        generateQRCode(member.qr_code);
      }
    } else {
      setFormData({
        firstName: "",
        lastName: "",
        gender: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        emergencyPhone: "",
        status: "active",
        role: "",
        branchId: "",
        joinDate: "",
        photoUrl: "",
        addressNumber: "",
        street: "",
        apartment: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
        academicFormation: "",
        professionalFormation: "",
        maritalStatus: "",
        conversionDate: "",
        baptismDate: "",
        baptismStatus: "",
        originChurch: "",
        christianExperience: "",
        marriageDate: "",
        spouseName: "",
        numberOfChildren: "",
        childrenNames: "",
      });
      setSelectedMinistryId("");
      setCustomFieldValues({});
      setPhotoPreview("");
      setPhotoFile(null);
    }
  }, [member]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: lt.photoTooLarge,
          description: lt.photoTooLargeDesc,
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        toast({
          title: lt.photoFormatError,
          description: lt.photoFormatErrorDesc,
          variant: "destructive",
        });
        return;
      }

      // Open cropper dialog with the selected file
      setTempPhotoFile(file);
      setCropperOpen(true);
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    // Determine file extension based on blob type (PNG for transparent, JPEG otherwise)
    const isPng = croppedBlob.type === "image/png";
    const extension = isPng ? "png" : "jpg";
    const croppedFile = new File([croppedBlob], `cropped-photo.${extension}`, {
      type: croppedBlob.type,
    });
    setPhotoFile(croppedFile);
    const previewUrl = URL.createObjectURL(croppedBlob);
    setPhotoPreview(previewUrl);
    setTempPhotoFile(null);
  };

  const uploadPhoto = async (memberId: string): Promise<string | null> => {
    if (!photoFile) return formData.photoUrl || null;

    setUploadingPhoto(true);
    try {
      // Get extension from file type
      const isPng = photoFile.type === "image/png";
      const fileExt = isPng ? "png" : "jpg";
      const fileName = `${memberId}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('member-photos')
        .upload(filePath, photoFile, { upsert: true });

      if (uploadError) throw uploadError;

      // Store the file path (signed URLs will be generated on display)
      return filePath;
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast({
        title: lt.photoUploadError,
        description: error.message || lt.photoUploadErrorDesc,
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview("");
    setFormData({ ...formData, photoUrl: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const generateQRCode = async (qrCodeData: string) => {
    try {
      const url = await QRCode.toDataURL(qrCodeData, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  };

  const downloadQRCode = () => {
    if (qrCodeUrl) {
      const link = document.createElement("a");
      link.download = `QR-${formData.firstName}-${formData.lastName}.png`;
      link.href = qrCodeUrl;
      link.click();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateForm(memberFullSchema, {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      emergencyPhone: formData.emergencyPhone,
      dateOfBirth: formData.dateOfBirth,
      joinDate: formData.joinDate,
    });
    if (!validation.success) {
      setErrors(validation.fieldErrors);
      toast({
        title: lt.error,
        description: firstErrorMessage(validation.fieldErrors, (k) => k),
        variant: "destructive",
      });
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      let savedMemberId: string | null = member?.id || null;
      const addressData = {
        number: formData.addressNumber,
        street: formData.street,
        apartment: formData.apartment,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country,
      };

      let photoUrl = formData.photoUrl;

      if (member?.id) {
        // Upload photo if new file selected
        if (photoFile) {
          const uploadedUrl = await uploadPhoto(member.id);
          if (uploadedUrl) photoUrl = uploadedUrl;
        }

        const memberData = {
          first_name: formData.firstName,
          last_name: formData.lastName,
          gender: formData.gender || null,
          email: formData.email || null,
          phone: formData.phone || null,
          date_of_birth: formData.dateOfBirth || null,
          emergency_phone: formData.emergencyPhone || null,
          status: formData.status,
          role: formData.role || null,
          branch_id: formData.branchId || null,
          join_date: formData.joinDate || null,
          address: JSON.stringify(addressData),
          photo_url: photoUrl || null,
          academic_formation: formData.academicFormation || null,
          professional_formation: formData.professionalFormation || null,
          marital_status: formData.maritalStatus || null,
          conversion_date: formData.conversionDate || null,
          baptism_date: formData.baptismDate || null,
          baptism_status: formData.baptismStatus || null,
          origin_church: formData.originChurch || null,
          christian_experience: formData.christianExperience || null,
          marriage_date: formData.marriageDate || null,
          spouse_name: formData.spouseName || null,
          number_of_children: formData.numberOfChildren ? parseInt(formData.numberOfChildren) : null,
          children_names: formData.childrenNames || null,
        };

        const { error } = await supabase
          .from("members")
          .update(memberData)
          .eq("id", member.id);

        if (error) throw error;
      } else {
        // For new members, insert first to get the ID
        const memberDataWithoutPhoto = {
          first_name: formData.firstName,
          last_name: formData.lastName,
          gender: formData.gender || null,
          email: formData.email || null,
          phone: formData.phone || null,
          date_of_birth: formData.dateOfBirth || null,
          emergency_phone: formData.emergencyPhone || null,
          status: formData.status,
          role: formData.role || null,
          branch_id: formData.branchId || null,
          join_date: formData.joinDate || null,
          address: JSON.stringify(addressData),
          academic_formation: formData.academicFormation || null,
          professional_formation: formData.professionalFormation || null,
          marital_status: formData.maritalStatus || null,
          conversion_date: formData.conversionDate || null,
          baptism_date: formData.baptismDate || null,
          baptism_status: formData.baptismStatus || null,
          origin_church: formData.originChurch || null,
          christian_experience: formData.christianExperience || null,
          marriage_date: formData.marriageDate || null,
          spouse_name: formData.spouseName || null,
          number_of_children: formData.numberOfChildren ? parseInt(formData.numberOfChildren) : null,
          children_names: formData.childrenNames || null,
          tenant_id: tenantId,
        };

        const { data, error } = await supabase
          .from("members")
          .insert([memberDataWithoutPhoto])
          .select()
          .single();

        if (error) throw error;

        // Upload photo and update member with photo_url and qr_code
        if (data) {
          savedMemberId = data.id;
          const qrCodeData = `MEMBER-${data.id}`;
          
          // Upload photo if selected
          if (photoFile) {
            const uploadedUrl = await uploadPhoto(data.id);
            if (uploadedUrl) photoUrl = uploadedUrl;
          }

          const { error: updateError } = await supabase
            .from("members")
            .update({ 
              qr_code: qrCodeData,
              photo_url: photoUrl || null
            })
            .eq("id", data.id);

          if (updateError) throw updateError;

          // Generate QR code image for display
          await generateQRCode(qrCodeData);

          // Send welcome email to new member
          if (formData.email) {
            try {
              await supabase.functions.invoke("send-welcome-email", {
                body: {
                  memberId: data.id,
                  firstName: formData.firstName,
                  lastName: formData.lastName,
                  email: formData.email,
                },
              });
              console.log("Welcome email sent successfully");
            } catch (emailError) {
              console.error("Error sending welcome email:", emailError);
            }
          }
          // Handle ministry for new member
          if (selectedMinistryId) {
            await supabase.from("ministry_members").insert({
              ministry_id: selectedMinistryId,
              member_id: data.id,
              role: "member",
              joined_date: new Date().toISOString().split("T")[0],
            });
          }
        }
      }

      // Handle ministry assignment for existing members
      if (member?.id && selectedMinistryId !== undefined) {
        // Remove existing ministry assignments
        await supabase
          .from("ministry_members")
          .delete()
          .eq("member_id", member.id);

        // Add new ministry assignment if selected
        if (selectedMinistryId) {
          await supabase.from("ministry_members").insert({
            ministry_id: selectedMinistryId,
            member_id: member.id,
            role: "member",
            joined_date: new Date().toISOString().split("T")[0],
          });
        }
      }

      // Save custom field values
      if (savedMemberId) {
        await saveCustomFieldValues(savedMemberId, customFieldValues, "member", tenantId);
      }

      toast({
        title: member ? lt.memberUpdated : lt.memberAdded,
        description: `${formData.firstName} ${formData.lastName}`,
      });
      
      setPhotoFile(null);
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: lt.error,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {member ? lt.editMember : lt.addMember}
          </DialogTitle>
          <DialogDescription>
            {member?.member_number && (
              <span className="font-mono text-primary font-semibold">
                N° {member.member_number}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personal" className="flex items-center gap-1 text-xs sm:text-sm px-1 sm:px-3">
                <User className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{lt.personalInfo}</span>
                <span className="sm:hidden">Info</span>
              </TabsTrigger>
              <TabsTrigger value="spiritual" className="flex items-center gap-1 text-xs sm:text-sm px-1 sm:px-3">
                <Church className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{lt.spiritualInfo}</span>
                <span className="sm:hidden">Spiritual</span>
              </TabsTrigger>
              <TabsTrigger value="family" className="flex items-center gap-1 text-xs sm:text-sm px-1 sm:px-3">
                <Users className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{lt.familyInfo}</span>
                <span className="sm:hidden">Family</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Personal Information Tab */}
            <TabsContent value="personal" className="space-y-4 mt-4">
              {/* Photo Upload Section */}
              <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
                <Label className="text-base font-semibold">{lt.memberPhoto}</Label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Photo Preview */}
                  <div className="relative h-24 w-24 rounded-lg overflow-hidden bg-muted border-2 border-dashed border-primary/30 flex items-center justify-center">
                    {photoPreview ? (
                      <>
                        <img
                          src={photoPreview}
                          alt={lt.memberPhotoAlt}
                          className="h-full w-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={removePhoto}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <Camera className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  
                  {/* Upload Controls */}
                  <div className="flex-1 space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handlePhotoSelect}
                      className="hidden"
                      id="photo-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {photoPreview ? lt.memberChangePhoto : lt.memberAddPhoto}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      {lt.memberPhotoHint}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="lastName">{lt.lastName} *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData({ ...formData, lastName: v });
                      const err = v.trim().length === 0 ? "" : (liveCheck(personNameSchema, v) ?? "");
                      setErrors((p) => ({ ...p, lastName: err }));
                    }}
                    placeholder="Smith"
                    required
                    aria-invalid={!!errors.lastName}
                    className={errors.lastName ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  <FieldError name="lastName" errors={errors} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="firstName">{lt.firstName} *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData({ ...formData, firstName: v });
                      const err = v.trim().length === 0 ? "" : (liveCheck(personNameSchema, v) ?? "");
                      setErrors((p) => ({ ...p, firstName: err }));
                    }}
                    placeholder="John"
                    required
                    aria-invalid={!!errors.firstName}
                    className={errors.firstName ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  <FieldError name="firstName" errors={errors} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="gender">{lt.gender}</Label>
                  <Select
                    value={formData.gender || "none"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, gender: value === "none" ? "" : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={lt.selectGender} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{lt.select}</SelectItem>
                      <SelectItem value="M">{lt.male}</SelectItem>
                      <SelectItem value="F">{lt.female}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dateOfBirth">{lt.dateOfBirth}</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    max={todayInputValue()}
                    value={formData.dateOfBirth}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData({ ...formData, dateOfBirth: v });
                      const err = !v ? "" : (liveCheck(optionalPastDateSchema, v) ?? "");
                      setErrors((p) => ({ ...p, dateOfBirth: err }));
                    }}
                    aria-invalid={!!errors.dateOfBirth}
                    className={errors.dateOfBirth ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  <FieldError name="dateOfBirth" errors={errors} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="phone">{lt.phone} *</Label>
                  <Input
                    id="phone"
                    inputMode="tel"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData({ ...formData, phone: v });
                      const err = v.trim().length === 0 ? "" : (liveCheck(phoneSchema, v) ?? "");
                      setErrors((p) => ({ ...p, phone: err }));
                    }}
                    placeholder="+1 (555) 123-4567"
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? undefined : "phone-hint"}
                    className={errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}
                    required
                  />
                  {errors.phone ? (
                    <FieldError name="phone" errors={errors} />
                  ) : (
                    <p id="phone-hint" className="text-xs text-muted-foreground">{t("phoneHint")}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">{lt.email}</Label>
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData({ ...formData, email: v });
                      const err = v.trim().length === 0 ? "" : (liveCheck(optionalEmailSchema, v) ?? "");
                      setErrors((p) => ({ ...p, email: err }));
                    }}
                    placeholder="john@example.com"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? undefined : "email-hint"}
                    className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.email ? (
                    <FieldError name="email" errors={errors} />
                  ) : (
                    <p id="email-hint" className="text-xs text-muted-foreground">{t("emailHint")}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="emergencyPhone">{lt.emergencyPhone}</Label>
                <Input
                  id="emergencyPhone"
                  inputMode="tel"
                  value={formData.emergencyPhone}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormData({ ...formData, emergencyPhone: v });
                    const err = v.trim().length === 0 ? "" : (liveCheck(optionalPhoneSchema, v) ?? "");
                    setErrors((p) => ({ ...p, emergencyPhone: err }));
                  }}
                  placeholder="+1 (555) 987-6543"
                  aria-invalid={!!errors.emergencyPhone}
                  aria-describedby={errors.emergencyPhone ? undefined : "emergencyPhone-hint"}
                  className={errors.emergencyPhone ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.emergencyPhone ? (
                  <FieldError name="emergencyPhone" errors={errors} />
                ) : (
                  <p id="emergencyPhone-hint" className="text-xs text-muted-foreground">{t("phoneHint")}</p>
                )}
              </div>


              {/* Address Section */}
              <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
                <Label className="text-base font-semibold">{lt.address}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="addressNumber">#</Label>
                    <Input
                      id="addressNumber"
                      value={formData.addressNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, addressNumber: e.target.value })
                      }
                      placeholder="1234"
                    />
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="street">{lt.street}</Label>
                    <Input
                      id="street"
                      value={formData.street}
                      onChange={(e) =>
                        setFormData({ ...formData, street: e.target.value })
                      }
                      placeholder="Main Street"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="apartment">Apt</Label>
                    <Input
                      id="apartment"
                      value={formData.apartment}
                      onChange={(e) =>
                        setFormData({ ...formData, apartment: e.target.value })
                      }
                      placeholder="4B"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="city">{lt.city}</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      placeholder="New York"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="zipCode">{lt.zipCode}</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) =>
                        setFormData({ ...formData, zipCode: e.target.value })
                      }
                      placeholder="10001"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="state">{lt.stateRegion}</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                      placeholder="NY"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="country">{lt.country}</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) =>
                        setFormData({ ...formData, country: e.target.value })
                      }
                      placeholder="United States"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="joinDate">{lt.joinDate}</Label>
                  <Input
                    id="joinDate"
                    type="date"
                    max={todayInputValue()}
                    value={formData.joinDate}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData({ ...formData, joinDate: v });
                      const err = !v ? "" : (liveCheck(optionalPastDateSchema, v) ?? "");
                      setErrors((p) => ({ ...p, joinDate: err }));
                    }}
                    aria-invalid={!!errors.joinDate}
                    className={errors.joinDate ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  <FieldError name="joinDate" errors={errors} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">{lt.status}</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{lt.active}</SelectItem>
                      <SelectItem value="inactive">{lt.inactive}</SelectItem>
                      <SelectItem value="transferred">{lt.transferred}</SelectItem>
                      <SelectItem value="deceased">{lt.deceased}</SelectItem>
                      <SelectItem value="archived">{lt.archived}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="branch">{lt.branch}</Label>
                <Select
                  value={formData.branchId || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, branchId: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={lt.selectBranch} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{lt.none}</SelectItem>
                    {branches?.map((branch: any) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Formation Section */}
              <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
                <Label className="text-base font-semibold">
                  {lt.formationSection}
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="academicFormation">{lt.academicFormation}</Label>
                    <Input
                      id="academicFormation"
                      value={formData.academicFormation}
                      onChange={(e) =>
                        setFormData({ ...formData, academicFormation: e.target.value })
                      }
                      placeholder={lt.academicPlaceholder}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="professionalFormation">{lt.professionalFormation}</Label>
                    <Input
                      id="professionalFormation"
                      value={formData.professionalFormation}
                      onChange={(e) =>
                        setFormData({ ...formData, professionalFormation: e.target.value })
                      }
                      placeholder={lt.professionalPlaceholder}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Spiritual Information Tab */}
            <TabsContent value="spiritual" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="baptismStatus">{lt.baptized}</Label>
                  <Select
                    value={formData.baptismStatus || "none"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, baptismStatus: value === "none" ? "" : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={lt.select} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{lt.select}</SelectItem>
                      <SelectItem value="Oui">{lt.yes}</SelectItem>
                      <SelectItem value="Non">{lt.no}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="baptismDate">{lt.baptismDate}</Label>
                  <Input
                    id="baptismDate"
                    type="date"
                    max={todayInputValue()}
                    value={formData.baptismDate}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData({ ...formData, baptismDate: v });
                      const err = !v ? "" : (liveCheck(optionalPastDateSchema, v) ?? "");
                      setErrors((p) => ({ ...p, baptismDate: err }));
                    }}
                    aria-invalid={!!errors.baptismDate}
                    className={errors.baptismDate ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  <FieldError name="baptismDate" errors={errors} />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="originChurch">{lt.originChurch}</Label>
                <Input
                  id="originChurch"
                  value={formData.originChurch}
                  onChange={(e) =>
                    setFormData({ ...formData, originChurch: e.target.value })
                  }
                  placeholder={lt.originChurchPlaceholder}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="role">{lt.ministryRole}</Label>
                <Select
                  value={formData.role || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={lt.selectRole} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{lt.select}</SelectItem>
                    <SelectItem value="Membre">{lt.roleMember}</SelectItem>
                    <SelectItem value="Diacre">{lt.roleDeacon}</SelectItem>
                    <SelectItem value="Ancien">{lt.roleElder}</SelectItem>
                    <SelectItem value="Pasteur">{lt.rolePastor}</SelectItem>
                    <SelectItem value="Secrétaire">{lt.roleSecretary}</SelectItem>
                    <SelectItem value="Trésorier">{lt.roleTreasurer}</SelectItem>
                    <SelectItem value="Chantre">{lt.roleWorship}</SelectItem>
                    <SelectItem value="Technique">{lt.roleTech}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="conversionDate">{lt.conversionDate}</Label>
                <Input
                  id="conversionDate"
                  type="date"
                  value={formData.conversionDate}
                  onChange={(e) =>
                    setFormData({ ...formData, conversionDate: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="christianExperience">{lt.christianExperience}</Label>
                <Textarea
                  id="christianExperience"
                  value={formData.christianExperience}
                  onChange={(e) =>
                    setFormData({ ...formData, christianExperience: e.target.value })
                  }
                  placeholder={lt.christianExperiencePlaceholder}
                  rows={4}
                />
              </div>

              {/* Ministry Selection */}
              <div className="grid gap-2">
                <Label htmlFor="ministry">{lt.ministry}</Label>
                <Select
                  value={selectedMinistryId || "none"}
                  onValueChange={(value) =>
                    setSelectedMinistryId(value === "none" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={lt.selectMinistry} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{lt.none}</SelectItem>
                    {ministries?.map((ministry) => (
                      <SelectItem key={ministry.id} value={ministry.id}>
                        {ministry.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Family Information Tab */}
            <TabsContent value="family" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="maritalStatus">{lt.maritalStatus}</Label>
                <Select
                  value={formData.maritalStatus || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, maritalStatus: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={lt.selectMaritalStatus} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{lt.select}</SelectItem>
                    <SelectItem value="Célibataire">{lt.maritalSingle}</SelectItem>
                    <SelectItem value="Marié(e)">{lt.maritalMarried}</SelectItem>
                    <SelectItem value="Divorcé(e)">{lt.maritalDivorced}</SelectItem>
                    <SelectItem value="Veuf/Veuve">{lt.maritalWidowed}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="spouseName">{lt.spouseName}</Label>
                  <Input
                    id="spouseName"
                    value={formData.spouseName}
                    onChange={(e) =>
                      setFormData({ ...formData, spouseName: e.target.value })
                    }
                    placeholder={lt.spouseNamePlaceholder}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="marriageDate">{lt.marriageDate}</Label>
                  <Input
                    id="marriageDate"
                    type="date"
                    value={formData.marriageDate}
                    onChange={(e) =>
                      setFormData({ ...formData, marriageDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="numberOfChildren">{lt.numberOfChildren}</Label>
                  <Input
                    id="numberOfChildren"
                    type="number"
                    value={formData.numberOfChildren}
                    onChange={(e) =>
                      setFormData({ ...formData, numberOfChildren: e.target.value })
                    }
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="emergencyPhone">{lt.emergencyContact}</Label>
                  <Input
                    id="familyEmergency"
                    value={formData.emergencyPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, emergencyPhone: e.target.value })
                    }
                    placeholder="+1 (555) 987-6543"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="childrenNames">{lt.childrenNames}</Label>
                <Textarea
                  id="childrenNames"
                  value={formData.childrenNames}
                  onChange={(e) =>
                    setFormData({ ...formData, childrenNames: e.target.value })
                  }
                  placeholder={lt.childrenNamesPlaceholder}
                  rows={3}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* QR Code Section - Only show for existing members with QR code */}
          {member && qrCodeUrl && (
            <div className="space-y-4 rounded-lg border p-4 bg-muted/50 mt-6">
              <div className="flex items-center gap-2">
                <QrCodeIcon className="h-5 w-5" />
                <Label className="text-base font-semibold">{lt.qrCode}</Label>
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-lg border-2 border-primary/20 p-4 bg-background">
                  <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {lt.qrCodeDescription}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadQRCode}
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {lt.downloadQrCode}
                </Button>
              </div>
            </div>
          )}
          
          {/* Custom Fields */}
          <CustomFieldsRenderer
            entityType="member"
            entityId={member?.id}
            values={customFieldValues}
            onChange={(fieldName, value) =>
              setCustomFieldValues((prev) => ({ ...prev, [fieldName]: value }))
            }
          />

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {lt.cancel}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? lt.loading : lt.save}
            </Button>
          </DialogFooter>
        </form>

        {/* Photo Cropper Dialog */}
        {tempPhotoFile && (
          <PhotoCropper
            open={cropperOpen}
            onOpenChange={(open) => {
              setCropperOpen(open);
              if (!open) setTempPhotoFile(null);
            }}
            imageFile={tempPhotoFile}
            onCropComplete={handleCropComplete}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
