"use client";

import { Fragment } from "react";
import { FileIcon, FolderIcon } from "@react-symbols/icons/utils";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useFilePath } from "@/hooks/use-files";
import { useEditor } from "../hooks/use-editor";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

function FileBreadCrumbs({ projectId }: { projectId: string }) {
  const { tabState } = useEditor(projectId as Id<"projects">);
  const filePath = useFilePath(tabState.activeTab);

  if (!tabState.activeTab) return null;

  if (filePath === undefined) {
    return (
      <div role="status" className="flex h-8 shrink-0 items-center border-b px-3 text-xs text-muted-foreground">
        Loading file path…
      </div>
    );
  }

  return (
    <Breadcrumb aria-label="File path" className="shrink-0 overflow-x-auto border-b px-3 py-1.5">
      <BreadcrumbList className="w-max flex-nowrap gap-1 text-xs">
        {filePath.map((item, index) => {
          const isFile = index === filePath.length - 1;
          return (
            <Fragment key={item._id}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem className="shrink-0">
                {isFile ? (
                  <BreadcrumbPage className="inline-flex items-center gap-1.5 text-xs">
                    <FileIcon fileName={item.name} autoAssign aria-hidden="true" className="size-4 shrink-0" />
                    {item.name}
                  </BreadcrumbPage>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <FolderIcon folderName={item.name.toLowerCase()} aria-hidden="true" className="size-4 shrink-0" />
                    {item.name}
                  </span>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export default FileBreadCrumbs;

