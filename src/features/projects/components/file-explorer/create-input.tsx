"use client";

import { useId, useState, type FormEvent } from "react";
import { ConvexError } from "convex/values";
import { ChevronRightIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getItemPadding } from "./constants";
import { ItemIcon } from "./item-icon";

export const CreateInput = ({ type, level, onSubmit, onCancel, initialName = "", mode = "create" }: {
  type: "file" | "folder";
  level: number;
  onSubmit: (name: string) => Promise<void>;
  onCancel: () => void;
  initialName?: string;
  mode?: "create" | "rename";
}) => {
  const [name, setName] = useState(initialName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || !name.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(name.trim());
    } catch (error) {
      setError(
        error instanceof ConvexError && typeof error.data === "string"
          ? error.data
          : `Could not ${mode} ${type}. Please try again.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-1 py-1 pr-2"
      style={{ paddingLeft: getItemPadding(level, type === "file") }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !isSubmitting) {
          event.preventDefault();
          event.stopPropagation();
          onCancel();
        }
      }}
    >
      <div className="flex items-center gap-1.5">
        {type === "folder" && (
          <ChevronRightIcon aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <ItemIcon name={name} type={type} />
        <Input
          autoFocus
          aria-label={`${mode === "rename" ? "Rename" : "New"} ${type} name`}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          placeholder={`${type === "folder" ? "Folder" : "File"} name`}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
          disabled={isSubmitting}
          className="h-6 rounded-sm px-1.5 text-xs md:text-xs"
        />
      </div>
      <div className="flex justify-end gap-1">
        <Button type="button" variant="ghost" size="xs" disabled={isSubmitting} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="xs" disabled={isSubmitting || !name.trim()}>
          {isSubmitting ? "Saving…" : mode === "rename" ? "Rename" : "Create"}
        </Button>
      </div>
      {error && <p id={errorId} role="alert" className="text-xs text-destructive">{error}</p>}
    </form>
  );
};
