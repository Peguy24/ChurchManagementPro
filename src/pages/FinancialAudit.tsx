import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { useUserRole } from "@/hooks/useUserRole";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { History, Search, FileText, Eye } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const FinancialAudit = () => {
  const { t, language } = useLanguage();

  const { tenantId } = useCurrentTenant();
  const { isSuperAdmin } = useUserRole();
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ["financial-audit-logs", entityFilter, actionFilter, tenantId, isSuperAdmin],
    queryFn: async () => {
      let query = supabase
        .from("financial_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      // Tenant admins only see their own tenant's audit logs
      if (!isSuperAdmin && tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      if (entityFilter !== "all") {
        query = query.eq("entity_type", entityFilter);
      }
      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filteredLogs = auditLogs?.filter((log) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.user_email?.toLowerCase().includes(search) ||
      log.entity_type?.toLowerCase().includes(search) ||
      JSON.stringify(log.new_values)?.toLowerCase().includes(search) ||
      JSON.stringify(log.old_values)?.toLowerCase().includes(search)
    );
  });

  const getActionBadge = (action: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      create: "default",
      update: "secondary",
      delete: "destructive",
      approve: "default",
      reject: "destructive",
    };
    return <Badge variant={variants[action] || "outline"}>{t(`financialAudit.action_${action}`)}</Badge>;
  };

  const getEntityLabel = (entity: string) => {
    return t(`financialAudit.entity_${entity}`);
  };

  const dateLocale = language === "fr" ? fr : undefined;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="h-8 w-8" />
            {t("finance.auditTrail")}
          </h1>
          <p className="text-muted-foreground">{t("financialAudit.subtitle")}</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("common.search") + "..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t("financialAudit.entityType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("financialAudit.allEntities")}</SelectItem>
                  <SelectItem value="donations">{t("financialAudit.entity_donations")}</SelectItem>
                  <SelectItem value="expenses">{t("financialAudit.entity_expenses")}</SelectItem>
                  <SelectItem value="special_funds">{t("financialAudit.entity_special_funds")}</SelectItem>
                  <SelectItem value="fund_transactions">{t("financialAudit.entity_fund_transactions")}</SelectItem>
                  <SelectItem value="cash_transactions">{t("financialAudit.entity_cash_transactions")}</SelectItem>
                  <SelectItem value="budgets">{t("financialAudit.entity_budgets")}</SelectItem>
                  <SelectItem value="bank_transactions">{t("financialAudit.entity_bank_transactions")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={t("financialAudit.actionLabel")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("financialAudit.allActions")}</SelectItem>
                  <SelectItem value="create">{t("financialAudit.action_create")}</SelectItem>
                  <SelectItem value="update">{t("financialAudit.action_update")}</SelectItem>
                  <SelectItem value="delete">{t("financialAudit.action_delete")}</SelectItem>
                  <SelectItem value="approve">{t("financialAudit.action_approve")}</SelectItem>
                  <SelectItem value="reject">{t("financialAudit.action_reject")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Audit Log Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("financialAudit.auditLog")} ({filteredLogs?.length || 0} {t("financialAudit.entries")})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">{t("common.loading")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("financialAudit.dateTime")}</TableHead>
                    <TableHead>{t("financialAudit.userLabel")}</TableHead>
                    <TableHead>{t("financialAudit.entityType")}</TableHead>
                    <TableHead>{t("financialAudit.actionLabel")}</TableHead>
                    <TableHead>{t("common.details")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        {t("financialAudit.noEntries")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: dateLocale })}
                        </TableCell>
                        <TableCell>{log.user_email || t("common.system")}</TableCell>
                        <TableCell>{getEntityLabel(log.entity_type)}</TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                                <Eye className="h-4 w-4 mr-1" />
                                {t("common.view")}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>{t("financialAudit.auditDetails")}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="font-medium text-muted-foreground">{t("common.date")}</p>
                                    <p>{format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: dateLocale })}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium text-muted-foreground">{t("financialAudit.userLabel")}</p>
                                    <p>{log.user_email || t("common.system")}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium text-muted-foreground">{t("financialAudit.entityType")}</p>
                                    <p>{getEntityLabel(log.entity_type)}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium text-muted-foreground">{t("financialAudit.actionLabel")}</p>
                                    <p>{getActionBadge(log.action)}</p>
                                  </div>
                                </div>
                                
                                {log.old_values && (
                                  <div>
                                    <p className="font-medium text-muted-foreground mb-2">{t("financialAudit.oldValues")}</p>
                                    <ScrollArea className="h-[150px] rounded border p-2 bg-muted/50">
                                      <pre className="text-xs">{JSON.stringify(log.old_values, null, 2)}</pre>
                                    </ScrollArea>
                                  </div>
                                )}
                                
                                {log.new_values && (
                                  <div>
                                    <p className="font-medium text-muted-foreground mb-2">{t("financialAudit.newValues")}</p>
                                    <ScrollArea className="h-[150px] rounded border p-2 bg-muted/50">
                                      <pre className="text-xs">{JSON.stringify(log.new_values, null, 2)}</pre>
                                    </ScrollArea>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default FinancialAudit;
