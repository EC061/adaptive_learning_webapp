"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, LayoutDashboard, Shield, AlertTriangle, CheckCircle, Trash2, RefreshCw, RotateCcw } from "lucide-react";

interface Stats {
  students: number;
  teachers: number;
  admins: number;
  classes: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMaterials = async () => {
    try {
      const res = await fetch("/api/admin/materials");
      if (res.ok) {
        const data = await res.json();
        setMaterials(data.materials);
      }
    } catch (err) {
      console.error("Failed to fetch materials", err);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/admin/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Failed to fetch stats", err);
      }

      await fetchMaterials();
      setLoading(false);
    }
    fetchData();

    // Auto-refresh materials processing periodically
    const interval = setInterval(() => {
      fetchMaterials();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRetry = async (materialId: string) => {
    try {
      await fetch(`/api/admin/materials/${materialId}/retry`, { method: "POST" });
      fetchMaterials();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (materialId: string) => {
    if (!confirm("Are you sure you want to delete this material and all its files?")) return;
    try {
      await fetch(`/api/admin/materials/${materialId}`, { method: "DELETE" });
      fetchMaterials();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegenerate = async (materialId: string) => {
    if (!confirm("This will fully re-process all pages from scratch. Continue?")) return;
    try {
      await fetch(`/api/admin/materials/${materialId}/regenerate`, { method: "POST" });
      fetchMaterials();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
        <p className="text-muted-foreground mt-1">
          System statistics and overview.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="h-4 w-24 bg-muted rounded"></div>
                <div className="size-4 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded mt-2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Students
              </CardTitle>
              <GraduationCap className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.students}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Teachers
              </CardTitle>
              <Users className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.teachers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Admins
              </CardTitle>
              <Shield className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.admins}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Classes
              </CardTitle>
              <LayoutDashboard className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.classes}</div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
          Failed to load statistics.
        </div>
      )}

      <div className="mt-12 mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Materials Processing</h2>
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher / Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {materials.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No materials found.</td>
                </tr>
              ) : (
                materials.map((mat) => (
                  <tr key={mat.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {mat.title || mat.originalName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {mat.teacher?.user?.username || "Unknown"} <br />
                      <span className="text-xs text-gray-400">{mat.class?.name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {mat.processingStatus === "SUCCESS" && <span className="inline-flex items-center text-green-600"><CheckCircle className="size-4 mr-1" /> Success</span>}
                      {mat.processingStatus === "FAILED" && <span className="inline-flex items-center text-red-600" title={mat.errorMessage}><AlertTriangle className="size-4 mr-1" /> Failed</span>}
                      {mat.processingStatus === "PROCESSING" && <span className="inline-flex items-center text-blue-600"><RefreshCw className="size-4 mr-1 animate-spin" /> Processing</span>}
                      {mat.processingStatus === "IDLE" && <span className="inline-flex items-center text-gray-500">Idle</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {mat.processedPages} / {mat.totalPages || "?"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {mat.processingStatus === "FAILED" && (
                          <button type="button" onClick={() => handleRetry(mat.id)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors" title="Retry failed pages">
                            <RotateCcw className="size-3" /> Retry
                          </button>
                        )}
                        {mat.processingStatus !== "PROCESSING" && (
                          <button type="button" onClick={() => handleRegenerate(mat.id)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-md transition-colors" title="Re-process all pages from scratch">
                            <RefreshCw className="size-3" /> Regenerate
                          </button>
                        )}
                        <button type="button" onClick={() => handleDelete(mat.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete material">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
