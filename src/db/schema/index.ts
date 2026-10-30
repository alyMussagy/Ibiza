import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  primaryKey,
  uniqueIndex,
  integer,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
export const approvalStatus = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected",
  "suspended",
]);
export const memberRole = pgEnum("member_role", [
  "owner",
  "manager",
  "staff",
  "scanner",
]);
export const listingCategory = pgEnum("listing_category", [
  "destinos",
  "estadias",
  "eventos",
  "restaurantes",
  "experiencias",
]);
export const listingStatus = pgEnum("listing_status", [
  "draft",
  "published",
  "archived",
]);
const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name").notNull(),
  ...timestamps(),
});
export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  approval: approvalStatus("approval").default("pending").notNull(),
  ...timestamps(),
});
export const organizationMembers = pgTable(
  "organization_members",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: memberRole("role").default("staff").notNull(),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.profileId] })],
);
export const partnerApplications = pgTable("partner_applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  submittedBy: uuid("submitted_by")
    .notNull()
    .references(() => profiles.id),
  status: approvalStatus("status").default("pending").notNull(),
  notes: text("notes"),
  ...timestamps(),
});
export const destinations = pgTable("destinations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  province: text("province").default("Inhambane").notNull(),
  country: text("country").default("MZ").notNull(),
  description: text("description").notNull(),
  ...timestamps(),
});
export const listings = pgTable(
  "listings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    destinationId: uuid("destination_id").references(() => destinations.id),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: listingCategory("category").notNull(),
    status: listingStatus("status").default("draft").notNull(),
    currency: text("currency").default("MZN").notNull(),
    ...timestamps(),
  },
  (t) => [check("currency_format", sql`${t.currency} ~ '^[A-Z]{3}$'`)],
);
export const listingPhotos = pgTable(
  "listing_photos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull(),
    alt: text("alt").notNull(),
    position: integer("position").default(0).notNull(),
  },
  (t) => [
    uniqueIndex("listing_photo_order").on(t.listingId, t.position),
    check("photo_position_positive", sql`${t.position} >= 0`),
  ],
);
export const favorites = pgTable(
  "favorites",
  {
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.profileId, t.listingId] })],
);
