import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifyAuth } from "./auth";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import schema from "./schema";
import { ConvexError } from "convex/values";

const projectValidator = v.object({
  ...schema.tables.projects.validator.fields,
  _id: v.id("projects"),
  _creationTime: v.number(),
});

export const getById = query({
  args: { id: v.id("projects") },
  returns: v.union(projectValidator, v.null()),
  handler: async (ctx, { id }) => {
    const identity = await verifyAuth(ctx);
    const project = await ctx.db.get("projects", id);
    if(!project || project.ownerId !== identity.subject) {
      return null;
    }
    return project;
  },
});

export const rename = mutation({
  args: { id: v.id("projects"), name: v.string() },
  returns: v.null(),
  handler: async (ctx, { id, name }) => {
    const identity = await verifyAuth(ctx);
    const project = await ctx.db.get("projects", id);
    if (!project || project.ownerId !== identity.subject) {
      throw new ConvexError("Project not found.");
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new ConvexError("Project name cannot be empty.");
    }

    await ctx.db.patch("projects", id, {
      name: trimmedName,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const identity = await verifyAuth(ctx);
    const project = await ctx.db.get("projects", id);
    if (!project || project.ownerId !== identity.subject) {
      throw new ConvexError("Project not found.");
    }
    await ctx.db.delete("projects", id);
    return null;
  },
});

// Delete in bounded batches; the client repeats until all owned projects are gone.
export const removeAll = mutation({
  args: {},
  returns: v.object({ deleted: v.number(), hasMore: v.boolean() }),
  handler: async (ctx) => {
    const identity = await verifyAuth(ctx);
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .take(100);
    for (const project of projects) {
      await ctx.db.delete("projects", project._id);
    }
    return { deleted: projects.length, hasMore: projects.length === 100 };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      ownerId: identity.subject,
      updatedAt: Date.now(),
    });
    return projectId;
  },
});

export const getPartial = query({
  args: {
    limit:v.number(),
  },
  returns: v.array(projectValidator),
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

   const query= await ctx.db
    .query("projects")
    .withIndex("by_owner",(q)=>q.eq("ownerId",identity.subject)) // this will return all projects of logged in user
    .order("desc")
    .take(args.limit) // limit the number of projects returned
    return query;
  },
});


export const get = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(projectValidator),
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    return await ctx.db
      .query("projects")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
