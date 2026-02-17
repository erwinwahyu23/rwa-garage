"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Activity,
  CreditCard,
  Users,
  Wrench,
  ArrowRight,
  Package,
  Plus,
  AlertCircle,
  Calendar,
  Ban,
  FileText,
  Clock
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    visitsToday: 0,
    activeJobs: 0,
    cancelledToday: 0,
    cancelledMonth: 0,
    visitsMonth: 0,
    unpaidInvoices: 0,
    lowStockCount: 0,
    chartData: [],
    revenueMonth: 0,
    completedToday: 0,
    recentActivities: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview operasional bengkel RWA Garage.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/worklist">
              <Plus className="mr-2 h-4 w-4" />
              Catat Kunjungan Baru
            </Link>
          </Button>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

        {/* 1. Total Pendapatan Bulan Ini */}
        <Card className="border-l-4 border-l-green-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Pendapatan (Bulan Ini)
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(stats.revenueMonth)}
            </div>
            <p className="text-xs text-muted-foreground">
              Estimasi pendapatan dari invoice PAID
            </p>
          </CardContent>
        </Card>

        {/* 2. Selesai Hari Ini */}
        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Selesai Hari Ini
            </CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedToday}</div>
            <p className="text-xs text-muted-foreground">
              Kendaraan selesai servis hari ini
            </p>
          </CardContent>
        </Card>

        {/* 3. Pekerjaan Aktif */}
        <Card className="border-l-4 border-l-teal-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Pekerjaan Aktif
            </CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeJobs}</div>
            <p className="text-xs text-muted-foreground">
              Status ANTRI atau PROSES
            </p>
          </CardContent>
        </Card>

        {/* 4. Total Kunjungan Bulan Ini */}
        <Card className="border-l-4 border-l-rose-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Kunjungan (Bulan Ini)
            </CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.visitsMonth}</div>
            <p className="text-xs text-muted-foreground">
              {stats.visitsToday} kendaraan hari ini
            </p>
          </CardContent>
        </Card>
      </div>

      {/* CHART & ACTIVITY SECTION */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">

        {/* CHART: Kunjungan per Bulan */}
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader>
            <CardTitle>Tren Kunjungan (6 Bulan Terakhir)</CardTitle>
            <CardDescription>Grafik jumlah kendaraan masuk per bulan.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[250px] w-full">
              {stats.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tick={{ dy: 10 }}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Memuat data grafik...
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AKtivitas Terkini (moved here) */}
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Aktivitas Terkini</CardTitle>
            <CardDescription>Pantau perubahan stok dan kunjungan terbaru.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 h-[320px] overflow-y-auto pr-2">
              {stats.recentActivities && stats.recentActivities.length > 0 ? (
                stats.recentActivities.map((act: any, i) => (
                  <div key={i} className="flex items-start gap-4 text-sm border-b pb-3 last:border-0 last:pb-0">
                    <div className={`h-8 w-8 min-w-[32px] rounded-full flex items-center justify-center ${act.type === 'VISIT' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                      {act.type === 'VISIT' ? <Wrench className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{act.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" /> {act.user} • <Clock className="h-3 w-3" /> {new Date(act.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ALERTS & QUICK ACCESS (Moved Below) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Stok Menipis */}
        {stats.lowStockCount > 0 && (
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-yellow-600" />
                Stok Menipis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-bold">{stats.lowStockCount}</span>
                  <span className="text-sm text-muted-foreground ml-2">item perlu restock</span>
                </div>
                <Button variant="secondary" size="sm" asChild>
                  <Link href="/inventory/items">Cek Inventory</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoice Belum Dibayar */}
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-red-600" />
              Invoice Belum Dibayar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold">{stats.unpaidInvoices}</span>
                <span className="text-sm text-muted-foreground ml-2">invoice outstanding</span>
              </div>
              <Button variant="secondary" size="sm" asChild>
                <Link href="/billing">Lihat Tagihan</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Access Inventory */}
        <Link href="/inventory" className="block p-4 bg-white border rounded-lg hover:bg-slate-50 transition shadow-sm text-center flex flex-col items-center justify-center">
          <div className="bg-orange-100 p-3 rounded-full mb-3">
            <Package className="h-6 w-6 text-orange-600" />
          </div>
          <div className="font-semibold text-sm">Inventory</div>
        </Link>

        {/* Quick Access Finance */}
        <Link href="/billing" className="block p-4 bg-white border rounded-lg hover:bg-slate-50 transition shadow-sm text-center flex flex-col items-center justify-center">
          <div className="bg-green-100 p-3 rounded-full mb-3">
            <CreditCard className="h-6 w-6 text-green-600" />
          </div>
          <div className="font-semibold text-sm">Keuangan</div>
        </Link>
      </div>
    </div>
  );
}
