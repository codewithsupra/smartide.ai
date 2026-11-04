import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { verifyAuth } from "./auth";
import schema from "./schema";

const fileValidator = v.object({
  ...schema.tables.files.validator.fields,
  _id: v.id("files"),
  _creationTime: v.number(),
});

function validateName(name: string) {
  const trimmedName = name.trim();
  if (
    !trimmedName ||
    trimmedName === "." ||
    trimmedName === ".." ||
    /[/\\\u0000]/.test(trimmedName)
  ) {
    throw new ConvexError("Enter a valid file or folder name.");
  }
  return trimmedName;
}

export const getFiles = query({
  args: {
    projectId: v.id("projects"),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(fileValidator),
  handler: async (ctx, { projectId, paginationOpts }) => {
    const identity = await verifyAuth(ctx);
    const project = await ctx.db.get("projects", projectId);

    if (!project || project.ownerId !== identity.subject) {
      throw new ConvexError("Project not found.");
    }

    return await ctx.db
      .query("files")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .paginate(paginationOpts);
  },
});
export const getFile = query({
  args: {
    fileId: v.id("files"),
  },
  returns: v.union(fileValidator, v.null()),
  handler: async (ctx, { fileId }) => {
    const identity = await verifyAuth(ctx);
    const file = await ctx.db.get("files", fileId);

    if (!file) {
      return null;
    }

    const project = await ctx.db.get("projects", file.projectId);
    if (!project || project.ownerId !== identity.subject) {
      return null;
    }

    return file;
  },
});

export const getFolderContents = query({
  args: {
    projectId: v.id("projects"),
    parentId: v.optional(v.id("files")),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(fileValidator),
  handler: async (ctx, { projectId, parentId, paginationOpts }) => {
    const identity = await verifyAuth(ctx);
    const project = await ctx.db.get("projects", projectId);

    if (!project || project.ownerId !== identity.subject) {
      throw new ConvexError("Project not found.");
    }

    if (parentId !== undefined) {
      const parent = await ctx.db.get("files", parentId);
      if (
        !parent ||
        parent.projectId !== projectId ||
        parent.type !== "folder"
      ) {
        throw new ConvexError("Folder not found.");
      }
    }

    const result = await ctx.db
      .query("files")
      .withIndex("by_project_and_parent", (q) =>
        q.eq("projectId", projectId).eq("parentId", parentId),
      )
      .paginate(paginationOpts);

    result.page.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }
      return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
    });

    return result;
  },
});
async function createEntry(
  ctx: MutationCtx,
  { projectId, parentId, name, type, content }: {
    projectId: Id<"projects">;
    parentId?: Id<"files">;
    name: string;
    type: "file" | "folder";
    content?: string;
  },
) {
    const identity = await verifyAuth(ctx);
    const project = await ctx.db.get("projects", projectId);

    if (!project || project.ownerId !== identity.subject) {
      throw new ConvexError("Project not found.");
    }

    if (parentId !== undefined) {
      const parent = await ctx.db.get("files", parentId);
      if (
        !parent ||
        parent.projectId !== projectId ||
        parent.type !== "folder"
      ) {
        throw new ConvexError("Folder not found.");
      }
    }

    const trimmedName = validateName(name);

    if (type === "folder" && content !== undefined) {
      throw new ConvexError("Folders cannot have text content.");
    }

    const existing = await ctx.db
      .query("files")
      .withIndex("by_project_parent_name", (q) =>
        q.eq("projectId", projectId)
          .eq("parentId", parentId)
          .eq("name", trimmedName),
      )
      .first();

    if (existing) {
      throw new ConvexError("A file or folder with this name already exists.");
    }

    const updatedAt = Date.now();
    const fileId = await ctx.db.insert("files", {
      projectId,
      parentId,
      name: trimmedName,
      type,
      ...(type === "file" ? { content: content ?? "" } : {}),
      updatedAt,
    });
    await ctx.db.patch("projects", projectId, { updatedAt });

    return fileId;
}

export const createFile = mutation({
  args: {
    projectId: v.id("projects"),
    parentId: v.optional(v.id("files")),
    name: v.string(),
    type: v.union(v.literal("file"), v.literal("folder")),
    content: v.optional(v.string()),
  },
  returns: v.id("files"),
  handler: createEntry,
});

export const createFolder = mutation({
  args: {
    projectId: v.id("projects"),
    parentId: v.optional(v.id("files")),
    name: v.string(),
  },
  returns: v.id("files"),
  handler: (ctx, args) => createEntry(ctx, { ...args, type: "folder" }),
});

export const renameFile = mutation({
  args: {
    fileId: v.id("files"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { fileId, name }) => {
    const identity = await verifyAuth(ctx);
    const file = await ctx.db.get("files", fileId);
    if (!file) {
      throw new ConvexError("File or folder not found.");
    }

    const project = await ctx.db.get("projects", file.projectId);
    if (!project || project.ownerId !== identity.subject) {
      throw new ConvexError("File or folder not found.");
    }

    const trimmedName = validateName(name);
    if (trimmedName === file.name) {
      return null;
    }

    const existing = await ctx.db
      .query("files")
      .withIndex("by_project_parent_name", (q) =>
        q.eq("projectId", file.projectId)
          .eq("parentId", file.parentId)
          .eq("name", trimmedName),
      )
      .first();

    if (existing) {
      throw new ConvexError("A file or folder with this name already exists.");
    }

    const updatedAt = Date.now();
    await ctx.db.patch("files", fileId, { name: trimmedName, updatedAt });
    await ctx.db.patch("projects", file.projectId, { updatedAt });
    return null;
  },
});

export const updateFile = mutation({
  args: {
    fileId: v.id("files"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { fileId, content }) => {
    const identity = await verifyAuth(ctx);
    const file = await ctx.db.get("files", fileId);
    if (!file) {
      throw new ConvexError("File not found.");
    }

    const project = await ctx.db.get("projects", file.projectId);
    if (!project || project.ownerId !== identity.subject) {
      throw new ConvexError("File not found.");
    }

    if (file.type !== "file") {
      throw new ConvexError("Folders cannot have text content.");
    }
    if (file.storageId !== undefined) {
      throw new ConvexError("Only text files can be edited.");
    }
    if (file.content === content) {
      return null;
    }

    const updatedAt = Date.now();
    await ctx.db.patch("files", fileId, { content, updatedAt });
    await ctx.db.patch("projects", file.projectId, { updatedAt });
    return null;
  },
});

export const deleteFile = mutation({
  args: {
    fileId: v.id("files"),
  },
  returns: v.array(v.id("files")),
  handler: async (ctx, { fileId }) => {
    const identity = await verifyAuth(ctx);
    const file = await ctx.db.get("files", fileId);
    if (!file) {
      throw new ConvexError("File or folder not found.");
    }

    const project = await ctx.db.get("projects", file.projectId);
    if (!project || project.ownerId !== identity.subject) {
      throw new ConvexError("File or folder not found.");
    }

    const projectId = file.projectId;
    const deletedIds: Id<"files">[] = [];
    async function deleteRecursively(current: Doc<"files">): Promise<void> {
      while (true) {
        const children = await ctx.db
          .query("files")
          .withIndex("by_parent", (q) => q.eq("parentId", current._id))
          .take(100);

        if (children.length === 0) {
          break;
        }

        for (const child of children) {
          if (child.projectId !== projectId) {
            throw new ConvexError("Cannot delete entries from another project.");
          }
          await deleteRecursively(child);
        }
      }

      if (current.storageId) {
        await ctx.storage.delete(current.storageId);
      }
      await ctx.db.delete("files", current._id);
      deletedIds.push(current._id);
    }

    await deleteRecursively(file);
    await ctx.db.patch("projects", file.projectId, { updatedAt: Date.now() });
    return deletedIds;
  },
});


export const getFilePath = query({
  args: {
    fileId: v.id("files"),
  },
  returns: v.array(v.object({ _id: v.id("files"), name: v.string() })),
  handler: async (ctx, { fileId }) => {
    const identity = await verifyAuth(ctx);
    const file = await ctx.db.get("files", fileId);
    if (!file) {
      throw new ConvexError("File or folder not found.");
    }

    const project = await ctx.db.get("projects", file.projectId);
    if (!project || project.ownerId !== identity.subject) {
      throw new ConvexError("File or folder not found.");
    }

    const path: { _id: Id<"files">; name: string }[] = [];
    const visited = new Set<Id<"files">>();
    let current: Doc<"files"> = file;

    while (true) {
      if (current.projectId !== file.projectId || visited.has(current._id)) {
        throw new ConvexError("Invalid file path.");
      }
      visited.add(current._id);
      path.push({ _id: current._id, name: current.name });

      if (current.parentId === undefined) {
        break;
      }

      const parent = await ctx.db.get("files", current.parentId);
      if (!parent || parent.type !== "folder") {
        throw new ConvexError("Invalid file path.");
      }
      current = parent;
    }

    return path.reverse();
  },
});
