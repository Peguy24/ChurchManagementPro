import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, TrendingDown, Minus, Calendar, FileText, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { generateFiscalReceiptPDF, downloadFiscalReceiptPDF, FiscalReceiptData } from "@/lib/fiscalReceiptPDF";
import { useCurrency } from "@/hooks/useCurrency";
import { formatDateInputValue } from "@/lib/date";


interface MemberDonationStatsProps {
  memberId: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--info))'];

export default function MemberDonationStats({ memberId }: MemberDonationStatsProps) {
  const { t } = useLanguage();
  const { currencyCode } = useCurrency();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [generatingReceipt, setGeneratingReceipt] = useState(false);

  const { data: donations, isLoading } = useQuery({
    queryKey: ["member-donations", memberId],
    queryFn: async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .eq("member_id", memberId)
        .gte("donation_date", formatDateInputValue(sixMonthsAgo))
        .order("donation_date", { ascending: false });


      if (error) throw error;
      return data || [];
    },
  });

  const { data: allTimeDonations } = useQuery({
    queryKey: ["member-donations-alltime", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select("amount, donation_type")
        .eq("member_id", memberId);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch donations for selected year (for fiscal receipt)
  const { data: yearDonations } = useQuery({
    queryKey: ["member-donations-year", memberId, selectedYear],
    queryFn: async () => {
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;
      
      const { data, error } = await supabase
        .from("donations")
        .select("id, amount, donation_type, donation_date, payment_method, description")
        .eq("member_id", memberId)
        .gte("donation_date", startDate)
        .lte("donation_date", endDate)
        .order("donation_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch member info for receipt
  const { data: memberInfo } = useQuery({
    queryKey: ["member-info-receipt", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("first_name, last_name, address, email, phone")
        .eq("id", memberId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Fetch church settings for fiscal receipt
  const { data: churchSettings } = useQuery({
    queryKey: ["church-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("church_settings")
        .select("setting_key, setting_value");
      
      if (error) throw error;
      
      const settingsMap: Record<string, string> = {};
      data?.forEach((s) => {
        settingsMap[s.setting_key] = s.setting_value || "";
      });
      
      return settingsMap;
    },
  });

  // Generate available years
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Handle fiscal receipt generation
  const handleGenerateFiscalReceipt = async () => {
    if (!memberInfo || !yearDonations || yearDonations.length === 0) {
      toast.error(t("memberDetails.fiscalReceiptNoDonations"));
      return;
    }

    setGeneratingReceipt(true);
    try {
      const receiptData: FiscalReceiptData = {
        member: {
          first_name: memberInfo.first_name,
          last_name: memberInfo.last_name,
          address: memberInfo.address,
          email: memberInfo.email,
          phone: memberInfo.phone,
        },
        churchInfo: {
          name: churchSettings?.church_name || "Église",
          address: churchSettings?.church_address || "",
          phone: churchSettings?.church_phone || "",
          email: churchSettings?.church_email || "",
          taxId: churchSettings?.church_tax_id || "",
        },
        year: selectedYear,
        currencyCode,
        donations: yearDonations.map((d) => ({
          date: d.donation_date,
          type: d.donation_type,
          description: d.description,
          amount: Number(d.amount),
          payment_method: d.payment_method,
        })),
      };

      const blob = await generateFiscalReceiptPDF(receiptData);
      downloadFiscalReceiptPDF(blob, `${memberInfo.first_name}_${memberInfo.last_name}`, selectedYear);
      toast.success(t("memberDetails.fiscalReceiptSuccess"));
    } catch (error) {
      console.error("Error generating fiscal receipt:", error);
      toast.error(t("memberDetails.fiscalReceiptError"));
    } finally {
      setGeneratingReceipt(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {t("donations.donationHistory")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate stats
  const totalAmount = allTimeDonations?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
  const last6MonthsTotal = donations?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
  const donationCount = donations?.length || 0;

  // Monthly data for chart
  const monthlyData: Record<string, number> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
    monthlyData[key] = 0;
  }

  donations?.forEach((donation) => {
    const date = new Date(donation.donation_date);
    const key = date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
    if (monthlyData[key] !== undefined) {
      monthlyData[key] += Number(donation.amount);
    }
  });

  const chartData = Object.entries(monthlyData).map(([month, amount]) => ({
    month,
    amount,
  }));

  // Trend calculation
  const monthlyValues = Object.values(monthlyData);
  const currentMonth = monthlyValues[monthlyValues.length - 1] || 0;
  const previousMonth = monthlyValues[monthlyValues.length - 2] || 0;
  const trend = previousMonth > 0 ? ((currentMonth - previousMonth) / previousMonth) * 100 : 0;

  // Category distribution
  const categoryData: Record<string, number> = {};
  donations?.forEach((donation) => {
    const type = donation.donation_type || "other";
    categoryData[type] = (categoryData[type] || 0) + Number(donation.amount);
  });

  const pieData = Object.entries(categoryData).map(([name, value]) => ({
    name: t(name) || name,
    value,
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Calculate year total for display
  const yearTotal = yearDonations?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
  const yearTitheTotal = yearDonations?.filter(d => d.donation_type === "tithe").reduce((sum, d) => sum + Number(d.amount), 0) || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t("donations.donationHistory")}
            </CardTitle>
            <CardDescription>
              {t("attendance.last6Months")}
            </CardDescription>
          </div>
          
          {/* Fiscal Receipt Section */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-[100px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                size="sm" 
                onClick={handleGenerateFiscalReceipt}
                disabled={generatingReceipt || !yearDonations?.length}
              >
                {generatingReceipt ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Génération...
                  </>
                ) : (
                  "Relevé Fiscal"
                )}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Year summary info */}
        {yearDonations && yearDonations.length > 0 && (
          <div className="mt-3 p-2 bg-primary/10 rounded-md text-sm">
            <span className="font-medium">{selectedYear}:</span>{" "}
            {yearDonations.length} contributions | Total: {formatCurrency(yearTotal)} | Dîmes: {formatCurrency(yearTitheTotal)}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">{t("donations.totalAllTime")}</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">{t("donations.last6MonthsTotal")}</p>
            <p className="text-2xl font-bold">{formatCurrency(last6MonthsTotal)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">{t("donations.numberOfDonations")}</p>
            <p className="text-2xl font-bold">{donationCount}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">{t("attendance.monthlyTrend")}</p>
            <div className="flex items-center gap-2">
              {trend > 0 ? (
                <TrendingUp className="h-5 w-5 text-success" />
              ) : trend < 0 ? (
                <TrendingDown className="h-5 w-5 text-destructive" />
              ) : (
                <Minus className="h-5 w-5 text-muted-foreground" />
              )}
              <span className={`text-2xl font-bold ${trend > 0 ? "text-success" : trend < 0 ? "text-destructive" : ""}`}>
                {trend > 0 ? "+" : ""}{trend.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Charts */}
        {donationCount > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Monthly Evolution */}
            <div>
              <h4 className="font-medium mb-4">{t("donations.monthlyEvolution")}</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), t("donations.amount")]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category Distribution */}
            {pieData.length > 0 && (
              <div>
                <h4 className="font-medium mb-4">{t("donations.distributionByType")}</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), ""]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{t("donations.noDonationsRecorded")}</p>
          </div>
        )}

        {/* Recent Donations List */}
        {donations && donations.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">{t("donations.recentDonations")}</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {donations.slice(0, 10).map((donation) => (
                <div
                  key={donation.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{formatCurrency(Number(donation.amount))}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(donation.donation_date).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {t(`donations.${donation.donation_type}`) || donation.donation_type}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
