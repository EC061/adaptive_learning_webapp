"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FolderInput, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type MaterialFolderButtonProps = {
  id: string;
  folder: string | null;
  existingFolders: string[];
};

export function MaterialFolderButton({ id, folder, existingFolders }: MaterialFolderButtonProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(folder ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setValue(folder ?? "");
      setError("");
      inputRef.current?.focus();
    }
  }, [editing, folder]);

  async function save(newFolder: string | null) {
    const next =
      typeof newFolder === "string" && newFolder.trim().length > 0
        ? newFolder.trim()
        : null;

    if (next === folder) {
      setEditing(false);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/learning-materials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to update folder.");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Failed to update folder.");
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") save(value);
    if (e.key === "Escape") setEditing(false);
  }

  const suggestions = existingFolders.filter((f) => f !== folder);

  if (editing) {
    return (
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Folder name (blank to remove)"
            className="h-7 text-sm py-1 px-2"
            disabled={busy}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => save(value)}
            disabled={busy}
            title="Apply"
          >
            <Check className="w-3.5 h-3.5 text-green-600" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setEditing(false)}
            disabled={busy}
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {suggestions.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => save(f)}
                disabled={busy}
                className="text-xs px-2 py-0.5 rounded-full border border-border bg-muted hover:bg-accent transition-colors disabled:opacity-50"
              >
                {f}
              </button>
            ))}
            {folder && (
              <button
                type="button"
                onClick={() => save(null)}
                disabled={busy}
                className="text-xs px-2 py-0.5 rounded-full border border-destructive/40 text-destructive/70 hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                Remove from folder
              </button>
            )}
          </div>
        )}

        {!suggestions.length && folder && (
          <button
            type="button"
            onClick={() => save(null)}
            disabled={busy}
            className="text-xs px-2 py-0.5 rounded-full border border-destructive/40 text-destructive/70 hover:bg-destructive/10 transition-colors self-start disabled:opacity-50"
          >
            Remove from folder
          </button>
        )}

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
      onClick={() => setEditing(true)}
      title={folder ? `Folder: ${folder}` : "Move to folder"}
    >
      <FolderInput className="w-3.5 h-3.5" />
    </Button>
  );
}
