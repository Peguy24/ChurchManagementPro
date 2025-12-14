import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ["financial-audit-logs", entityFilter, actionFilter],
    queryFn: async () => {
      let query = supabase
        .from("financial_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

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
    const labels: Record<string, string> = {
      create: "Création",
      update: "Modification",
      delete: "Suppression",
      approve: "Approbation",
      reject: "Rejet",
    };
    return <Badge variant={variants[action] || "outline"}>{labels[action] || action}</Badge>;
  };

  const getEntityLabel = (entity: string) => {
    const labels: Record<string, string> = {
      donations: "Donation",
      expenses: "Dépense",
      special_funds: "Fonds Spécial",
      fund_transactions: "Transaction Fonds",
      cash_transactions: "Transaction Caisse",
      budgets: "Budget",
      bank_transactions: "Transaction Bancaire",
    };
    return labels[entity] || entity;
  };

  const formatValue = (value: any) => {
    if (!value) return "-";
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="h-8 w-8" />
            {t("finance.auditTrail")}
          </h1>
          <p className="text-muted-foreground">Historique des modifications financières</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Type d'entité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les entités</SelectItem>
                  <SelectItem value="donations">Donations</SelectItem>
                  <SelectItem value="expenses">Dépenses</SelectItem>
                  <SelectItem value="special_funds">Fonds Spéciaux</SelectItem>
                  <SelectItem value="fund_transactions">Transactions Fonds</SelectItem>
                  <SelectItem value="cash_transactions">Transactions Caisse</SelectItem>
                  <SelectItem value="budgets">Budgets</SelectItem>
                  <SelectItem value="bank_transactions">Transactions Bancaires</SelectItem>
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes actions</SelectItem>
                  <SelectItem value="create">Création</SelectItem>
                  <SelectItem value="update">Modification</SelectItem>
                  <SelectItem value="delete">Suppression</SelectItem>
                  <SelectItem value="approve">Approbation</SelectItem>
                  <SelectItem value="reject">Rejet</SelectItem>
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
              Journal d'Audit ({filteredLogs?.length || 0} entrées)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Chargement...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Heure</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Entité</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Détails</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Aucune entrée d'audit trouvée
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                        </TableCell>
                        <TableCell>{log.user_email || "Système"}</TableCell>
                        <TableCell>{getEntityLabel(log.entity_type)}</TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                                <Eye className="h-4 w-4 mr-1" />
                                Voir
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Détails de l'audit</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="font-medium text-muted-foreground">Date</p>
                                    <p>{format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: fr })}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium text-muted-foreground">Utilisateur</p>
                                    <p>{log.user_email || "Système"}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium text-muted-foreground">Type d'entité</p>
                                    <p>{getEntityLabel(log.entity_type)}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium text-muted-foreground">Action</p>
                                    <p>{getActionBadge(log.action)}</p>
                                  </div>
                                </div>
                                
                                {log.old_values && (
                                  <div>
                                    <p className="font-medium text-muted-foreground mb-2">Anciennes valeurs</p>
                                    <ScrollArea className="h-[150px] rounded border p-2 bg-muted/50">
                                      <pre className="text-xs">{JSON.stringify(log.old_values, null, 2)}</pre>
                                    </ScrollArea>
                                  </div>
                                )}
                                
                                {log.new_values && (
                                  <div>
                                    <p className="font-medium text-muted-foreground mb-2">Nouvelles valeurs</p>
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
