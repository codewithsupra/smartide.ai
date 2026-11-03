import { Loader2Icon } from "lucide-react";
import { getItemPadding } from "./constants";

export const LoadingRow = ({ level }: { level: number }) => (
  <div
    role="status"
    className="flex h-7 items-center gap-1.5 pr-2 text-xs text-muted-foreground"
    style={{ paddingLeft: getItemPadding(level, true) }}
  >
    <Loader2Icon aria-hidden="true" className="size-3.5 shrink-0 animate-spin motion-reduce:animate-none" />
    <span>Loading files…</span>
  </div>
);
