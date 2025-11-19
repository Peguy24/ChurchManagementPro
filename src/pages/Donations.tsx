import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Download, Plus, TrendingUp } from "lucide-react";

const donations = [
  {
    id: 1,
    donor: "Jean Pierre",
    amount: 500,
    category: "Dim",
    method: "Lajan Kach",
    date: "2025-01-14",
  },
  {
    id: 2,
    donor: "Marie Duval",
    amount: 250,
    category: "Ofrann",
    method: "Chèk",
    date: "2025-01-14",
  },
  {
    id: 3,
    donor: "Paul Joseph",
    amount: 1000,
    category: "Batiman",
    method: "Vire",
    date: "2025-01-15",
  },
  {
    id: 4,
    donor: "Sophie Laurent",
    amount: 300,
    category: "Dim",
    method: "Lajan Mobil",
    date: "2025-01-14",
  },
  {
    id: 5,
    donor: "Marc Etienne",
    amount: 750,
    category: "Misyon",
    method: "Vire",
    date: "2025-01-16",
  },
];

const categoryColors: Record<string, string> = {
  Dim: "bg-primary/10 text-primary border-primary/20",
  Ofrann: "bg-secondary/10 text-secondary border-secondary/20",
  Batiman: "bg-info/10 text-info border-info/20",
  Misyon: "bg-success/10 text-success border-success/20",
};

const stats = [
  {
    title: "Total Mwa Sa",
    value: "$8,450",
    change: "+23% vs mwa pase",
    icon: DollarSign,
  },
  {
    title: "Mwayèn Don",
    value: "$342",
    change: "+8% vs mwa pase",
    icon: TrendingUp,
  },
  {
    title: "Kantite Don",
    value: "24",
    change: "Mwa sa",
    icon: TrendingUp,
  },
];

export default function Donations() {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Jesyon Kontribisyon
            </h2>
            <p className="text-muted-foreground">
              Jere don ak kontribisyon yo
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Ekspòte Rapò
            </Button>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Ajoute Don
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.change}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Distribisyon pa Kategori</CardTitle>
            <CardDescription>Mwa sa (Janvye 2025)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <span className="font-medium">Dim</span>
                </div>
                <span className="font-bold">$4,500</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-info" />
                  <span className="font-medium">Batiman</span>
                </div>
                <span className="font-bold">$2,200</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-success" />
                  <span className="font-medium">Misyon</span>
                </div>
                <span className="font-bold">$1,100</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-secondary" />
                  <span className="font-medium">Ofrann</span>
                </div>
                <span className="font-bold">$650</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Donations */}
        <Card>
          <CardHeader>
            <CardTitle>Don Resan</CardTitle>
            <CardDescription>
              History kontribisyon yo pou semèn sa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Donatè</TableHead>
                    <TableHead>Montan</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Metòd</TableHead>
                    <TableHead>Dat</TableHead>
                    <TableHead className="text-right">Aksyon</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {donations.map((donation) => (
                    <TableRow key={donation.id}>
                      <TableCell className="font-medium">
                        {donation.donor}
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${donation.amount}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={categoryColors[donation.category]}
                        >
                          {donation.category}
                        </Badge>
                      </TableCell>
                      <TableCell>{donation.method}</TableCell>
                      <TableCell>{donation.date}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Resi
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
