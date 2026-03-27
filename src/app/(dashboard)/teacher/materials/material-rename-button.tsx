"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type MaterialRenameButtonProps = {
  id: string;
  title: string | null;
  originalName: string;
};

export function MaterialRenameButton({ id, title, originalName }: MaterialRenameButtonProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function onStartEdit() {
    setValue(title ?? "");
    setError("");
    setEditing(true);
  }

  function onCancel() {
    setEditing(false);
    setError("");
  }

  async function onSave() {
    const trimmed = value.trim();
    if (trimmed === (title ?? "")) {
      setEditing(false);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/learning-materials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Rename failed.");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Rename failed.");
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") onSave();
    if (e.key === "Escape") onCancel();
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={originalName}
            className="h-7 text-sm py-1 px-2"
            disabled={busy}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={onSave}
            disabled={busy}
            title="Save"
          >
            <Check className="w-3.5 h-3.5 text-green-600" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={onCancel}
            disabled={busy}
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-6 w-6 shrink-0 opacity-50 hover:opacity-100"
      onClick={onStartEdit}
      title="Rename"
    >
      <Pencil className="w-3.5 h-3.5" />
    </Button>
  );
}
