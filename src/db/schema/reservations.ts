import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  check,
  uniqueIndex,
  index,
  boolean,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { listings, organizations, profiles } from "./index";
export const availabilitySlots = pgTable(
  "availability_slots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    capacity: integer("capacity").notNull(),
    priceMinor: integer("price_minor").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("slot_dates_valid", sql`${t.endsAt}>${t.startsAt}`),
    check("slot_capacity_valid", sql`${t.capacity} BETWEEN 1 AND 10000`),
    check("slot_price_valid", sql`${t.priceMinor} BETWEEN 0 AND 100000000`),
    index("slots_listing_start").on(t.listingId, t.startsAt),
  ],
);
export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slotId: uuid("slot_id")
      .notNull()
      .references(() => availabilitySlots.id),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => profiles.id),
    requestKey: uuid("request_key").notNull(),
    quantity: integer("quantity").notNull(),
    totalMinor: integer("total_minor").notNull(),
    currency: text("currency").notNull().default("MZN"),
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    listingTitle: text("listing_title").notNull(),
    customerName: text("customer_name").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    customerNote: text("customer_note").notNull().default(""),
    decisionNote: text("decision_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("reservation_request_once").on(t.customerId, t.requestKey),
    index("reservations_slot_state").on(t.slotId, t.status),
    check("reservation_quantity_valid", sql`${t.quantity} BETWEEN 1 AND 20`),
    check("reservation_total_valid", sql`${t.totalMinor}>=0`),
    check(
      "reservation_state_valid",
      sql`${t.status} IN ('pending','confirmed','rejected','cancelled','completed')`,
    ),
  ],
);
