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
import { useLanguage } from "@/contexts/LanguageContext";
import PhotoCropper from "./PhotoCropper";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";

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
  const { t } = useLanguage();
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
          title: t("members.photoTooLarge"),
          description: t("members.photoTooLargeDesc"),
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        toast({
          title: t("members.photoFormatError"),
          description: t("members.photoFormatErrorDesc"),
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
        title: t("members.photoUploadError"),
        description: error.message || t("members.photoUploadErrorDesc"),
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
    setLoading(true);

    try {
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
        }
      }

      // Handle ministry assignment
      const finalMemberId = member?.id || (member ? undefined : undefined);
      // For new members, get the ID from the insert result
      const targetMemberId = member?.id;
      
      if (targetMemberId) {
        // Remove existing ministry assignments
        await supabase
          .from("ministry_members")
          .delete()
          .eq("member_id", targetMemberId);

        // Add new ministry assignment if selected
        if (selectedMinistryId) {
          await supabase.from("ministry_members").insert({
            ministry_id: selectedMinistryId,
            member_id: targetMemberId,
            role: "member",
            joined_date: new Date().toISOString().split("T")[0],
          });
        }
      }

      toast({
        title: member ? t("members.memberUpdated") : t("members.memberAdded"),
        description: `${formData.firstName} ${formData.lastName}`,
      });
      
      setPhotoFile(null);
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: t("common.error"),
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
            {member ? t("members.editMember") : t("members.addMember")}
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
                <span className="hidden sm:inline">{t("members.personalInfo")}</span>
                <span className="sm:hidden">Info</span>
              </TabsTrigger>
              <TabsTrigger value="spiritual" className="flex items-center gap-1 text-xs sm:text-sm px-1 sm:px-3">
                <Church className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{t("members.spiritualInfo")}</span>
                <span className="sm:hidden">Spiritual</span>
              </TabsTrigger>
              <TabsTrigger value="family" className="flex items-center gap-1 text-xs sm:text-sm px-1 sm:px-3">
                <Users className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{t("members.familyInfo")}</span>
                <span className="sm:hidden">Family</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Personal Information Tab */}
            <TabsContent value="personal" className="space-y-4 mt-4">
              {/* Photo Upload Section */}
              <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
                <Label className="text-base font-semibold">Photo du Membre</Label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Photo Preview */}
                  <div className="relative h-24 w-24 rounded-lg overflow-hidden bg-muted border-2 border-dashed border-primary/30 flex items-center justify-center">
                    {photoPreview ? (
                      <>
                        <img
                          src={photoPreview}
                          alt="Photo du membre"
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
                      {photoPreview ? "Changer la photo" : "Ajouter une photo"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      JPEG, PNG, WebP ou GIF. Max 5 Mo.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="lastName">{t("members.lastName")} *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    placeholder="Pierre"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="firstName">{t("members.firstName")} *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    placeholder="Jean"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="gender">{t("members.gender")}</Label>
                  <Select
                    value={formData.gender || "none"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, gender: value === "none" ? "" : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("members.selectGender")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("common.select")}</SelectItem>
                      <SelectItem value="M">{t("members.male")}</SelectItem>
                      <SelectItem value="F">{t("members.female")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dateOfBirth">{t("members.dateOfBirth")}</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      setFormData({ ...formData, dateOfBirth: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="phone">{t("common.phone")} *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+33 1 23 45 67 89"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">{t("common.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="jean@example.com"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="emergencyPhone">{t("members.emergencyPhone")}</Label>
                <Input
                  id="emergencyPhone"
                  value={formData.emergencyPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, emergencyPhone: e.target.value })
                  }
                  placeholder="+33 1 98 76 54 32"
                />
              </div>

              {/* Address Section */}
              <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
                <Label className="text-base font-semibold">{t("members.address")}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="addressNumber">N°</Label>
                    <Input
                      id="addressNumber"
                      value={formData.addressNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, addressNumber: e.target.value })
                      }
                      placeholder="123"
                    />
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="street">{t("members.street")}</Label>
                    <Input
                      id="street"
                      value={formData.street}
                      onChange={(e) =>
                        setFormData({ ...formData, street: e.target.value })
                      }
                      placeholder="Rue Principale"
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
                      placeholder="A-12"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="city">{t("members.city")}</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      placeholder="Paris"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="zipCode">{t("members.zipCode")}</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) =>
                        setFormData({ ...formData, zipCode: e.target.value })
                      }
                      placeholder="75001"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="state">{t("members.stateRegion")}</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                      placeholder="Île-de-France"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="country">{t("members.country")}</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) =>
                        setFormData({ ...formData, country: e.target.value })
                      }
                      placeholder="France"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="joinDate">{t("members.joinDate")}</Label>
                  <Input
                    id="joinDate"
                    type="date"
                    value={formData.joinDate}
                    onChange={(e) =>
                      setFormData({ ...formData, joinDate: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">{t("common.status")}</Label>
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
                      <SelectItem value="active">{t("common.active")}</SelectItem>
                      <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
                      <SelectItem value="transferred">{t("common.transferred")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="branch">{t("members.branch")}</Label>
                <Select
                  value={formData.branchId || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, branchId: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("members.selectBranch")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("common.none")}</SelectItem>
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
                  {t("members.formationSection")}
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="academicFormation">{t("members.academicFormation")}</Label>
                    <Input
                      id="academicFormation"
                      value={formData.academicFormation}
                      onChange={(e) =>
                        setFormData({ ...formData, academicFormation: e.target.value })
                      }
                      placeholder={t("members.academicPlaceholder")}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="professionalFormation">{t("members.professionalFormation")}</Label>
                    <Input
                      id="professionalFormation"
                      value={formData.professionalFormation}
                      onChange={(e) =>
                        setFormData({ ...formData, professionalFormation: e.target.value })
                      }
                      placeholder={t("members.professionalPlaceholder")}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Spiritual Information Tab */}
            <TabsContent value="spiritual" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="baptismStatus">{t("members.baptized")}</Label>
                  <Select
                    value={formData.baptismStatus || "none"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, baptismStatus: value === "none" ? "" : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("common.select")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("common.select")}</SelectItem>
                      <SelectItem value="Oui">{t("common.yes")}</SelectItem>
                      <SelectItem value="Non">{t("common.no")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="baptismDate">{t("members.baptismDate")}</Label>
                  <Input
                    id="baptismDate"
                    type="date"
                    value={formData.baptismDate}
                    onChange={(e) =>
                      setFormData({ ...formData, baptismDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="originChurch">{t("members.originChurch")}</Label>
                <Input
                  id="originChurch"
                  value={formData.originChurch}
                  onChange={(e) =>
                    setFormData({ ...formData, originChurch: e.target.value })
                  }
                  placeholder={t("members.originChurchPlaceholder")}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="role">{t("members.ministryRole")}</Label>
                <Select
                  value={formData.role || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("members.selectRole")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("common.select")}</SelectItem>
                    <SelectItem value="Membre">{t("members.roles.member")}</SelectItem>
                    <SelectItem value="Diacre">{t("members.roles.deacon")}</SelectItem>
                    <SelectItem value="Ancien">{t("members.roles.elder")}</SelectItem>
                    <SelectItem value="Pasteur">{t("members.roles.pastor")}</SelectItem>
                    <SelectItem value="Secrétaire">{t("members.roles.secretary")}</SelectItem>
                    <SelectItem value="Trésorier">{t("members.roles.treasurer")}</SelectItem>
                    <SelectItem value="Chantre">{t("members.roles.worship")}</SelectItem>
                    <SelectItem value="Technique">{t("members.roles.tech")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="conversionDate">{t("members.conversionDate")}</Label>
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
                <Label htmlFor="christianExperience">{t("members.christianExperience")}</Label>
                <Textarea
                  id="christianExperience"
                  value={formData.christianExperience}
                  onChange={(e) =>
                    setFormData({ ...formData, christianExperience: e.target.value })
                  }
                  placeholder={t("members.christianExperiencePlaceholder")}
                  rows={4}
                />
              </div>

              {/* Ministries info (readonly for display) */}
              {ministries && ministries.length > 0 && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <Label className="text-sm font-semibold text-muted-foreground">
                    {t("members.availableMinistries")}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("members.ministriesNote")}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Family Information Tab */}
            <TabsContent value="family" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="maritalStatus">{t("members.maritalStatus")}</Label>
                <Select
                  value={formData.maritalStatus || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, maritalStatus: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("members.selectMaritalStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("common.select")}</SelectItem>
                    <SelectItem value="Célibataire">{t("members.marital.single")}</SelectItem>
                    <SelectItem value="Marié(e)">{t("members.marital.married")}</SelectItem>
                    <SelectItem value="Divorcé(e)">{t("members.marital.divorced")}</SelectItem>
                    <SelectItem value="Veuf/Veuve">{t("members.marital.widowed")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="spouseName">{t("members.spouseName")}</Label>
                  <Input
                    id="spouseName"
                    value={formData.spouseName}
                    onChange={(e) =>
                      setFormData({ ...formData, spouseName: e.target.value })
                    }
                    placeholder={t("members.spouseNamePlaceholder")}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="marriageDate">{t("members.marriageDate")}</Label>
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
                  <Label htmlFor="numberOfChildren">{t("members.numberOfChildren")}</Label>
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
                  <Label htmlFor="emergencyPhone">{t("members.emergencyContact")}</Label>
                  <Input
                    id="familyEmergency"
                    value={formData.emergencyPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, emergencyPhone: e.target.value })
                    }
                    placeholder="+33 1 98 76 54 32"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="childrenNames">{t("members.childrenNames")}</Label>
                <Textarea
                  id="childrenNames"
                  value={formData.childrenNames}
                  onChange={(e) =>
                    setFormData({ ...formData, childrenNames: e.target.value })
                  }
                  placeholder={t("members.childrenNamesPlaceholder")}
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
                <Label className="text-base font-semibold">{t("members.qrCode")}</Label>
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-lg border-2 border-primary/20 p-4 bg-background">
                  <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {t("members.qrCodeDescription")}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadQRCode}
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t("members.downloadQrCode")}
                </Button>
              </div>
            </div>
          )}
          
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("common.loading") : t("common.save")}
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
