"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Users,
  Search,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  Clock,
} from "lucide-react";

interface StudentEntry {
  id: string;
  orgDefinedId: string;
  firstName: string;
  lastName: string;
  isRegistered: boolean;
  createdAt: string;
}

export default function StudentsPage() {
  const { id } = useParams<{ id: string }>();
  const [students, setStudents] = useState<StudentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [className, setClassName] = useState("");

  // Add dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ orgDefinedId: "", firstName: "", lastName: "" });
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
    fetchClassName();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchClassName() {
    try {
      const res = await fetch(`/api/classes/${id}`);
      if (res.ok) {
        const data = await res.json();
        setClassName(data.name || "");
      }
    } catch {
      // ignore
    }
  }

  async function fetchStudents() {
    setLoading(true);
    try {
      const res = await fetch(`/api/classes/${id}/students`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAddLoading(true);
    try {
      const res = await fetch(`/api/classes/${id}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Failed to add student.");
      } else {
        setStudents((prev) => [...prev, data].sort((a, b) =>
          a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)
        ));
        setAddForm({ orgDefinedId: "", firstName: "", lastName: "" });
        setAddOpen(false);
      }
    } catch {
      setAddError("An unexpected error occurred.");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleDelete(studentListId: string) {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/classes/${id}/students/${studentListId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setStudents((prev) => prev.filter((s) => s.id !== studentListId));
      }
    } catch {
      // ignore
    } finally {
      setDeleteLoading(false);
      setDeleteId(null);
    }
  }

  const searchLower = search.toLowerCase();
  const filtered = search
    ? students.filter(
        (s) =>
          s.firstName.toLowerCase().includes(searchLower) ||
          s.lastName.toLowerCase().includes(searchLower) ||
          s.orgDefinedId.includes(search.replace(/^#/, ""))
      )
    : students;

  const registeredCount = students.filter((s) => s.isRegistered).length;

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/teacher/classes/${id}`}>
          <ArrowLeft className="w-4 h-4" /> Back to {className || "class"}
        </Link>
      </Button>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" /> Students
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {students.length} in roster · {registeredCount} registered
          </p>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Student
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Student to Roster</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              {addError && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {addError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="add-orgId">81 Number</Label>
                <Input
                  id="add-orgId"
                  value={addForm.orgDefinedId}
                  onChange={(e) =>
                    setAddForm((p) => ({ ...p, orgDefinedId: e.target.value }))
                  }
                  required
                  placeholder="e.g. 811947904"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="add-first">First Name</Label>
                  <Input
                    id="add-first"
                    value={addForm.firstName}
                    onChange={(e) =>
                      setAddForm((p) => ({ ...p, firstName: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-last">Last Name</Label>
                  <Input
                    id="add-last"
                    value={addForm.lastName}
                    onChange={(e) =>
                      setAddForm((p) => ({ ...p, lastName: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={addLoading}>
                {addLoading ? "Adding..." : "Add Student"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or 81 number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          {search && (
            <p className="text-xs text-muted-foreground mt-2">
              Showing {filtered.length} of {students.length} students
            </p>
          )}
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p>{search ? "No students match your search." : "No students in the roster yet."}</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((s) => (
                <div key={s.id} className="flex items-center gap-3 py-3 flex-wrap">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                    {s.firstName[0]}
                    {s.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">
                      {s.firstName} {s.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {s.orgDefinedId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.isRegistered ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
                        <CheckCircle className="w-3 h-3" /> Registered
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        <Clock className="w-3 h-3" /> Not registered
                      </span>
                    )}

                    {deleteId === s.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(s.id)}
                          disabled={deleteLoading}
                          className="text-xs h-7 px-2"
                        >
                          {deleteLoading ? "..." : "Confirm"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteId(null)}
                          className="text-xs h-7 px-2"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteId(s.id)}
                        className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
