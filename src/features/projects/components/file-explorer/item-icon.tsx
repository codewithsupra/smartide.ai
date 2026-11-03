import { FileIcon, FolderIcon } from "@react-symbols/icons/utils";

export const ItemIcon = ({ name, type }: {
  name: string;
  type: "file" | "folder";
}) => type === "folder" ? (
  <FolderIcon folderName={name.trim().toLowerCase()} aria-hidden="true" className="size-4 shrink-0" />
) : (
  <FileIcon fileName={name.trim()} autoAssign aria-hidden="true" className="size-4 shrink-0" />
);
