import mongoose, { Schema, Model } from "mongoose";
import type { DayOfWeek } from "@/types";

export interface IDayMenu {
  dayOfWeek: DayOfWeek;
  breakfast?: string;
  lunch?: string;
  dinner?: string;
  cooked?: string[]; // slot names marked as cooked: ["lunch", "dinner"]
  notes?: string;
}

export interface IWeeklyMenu {
  _id: string;
  scopeId: string; // householdId ?? userId
  year: number;
  week: number;
  days: IDayMenu[];
  prices: Record<string, number>; // ingredient name → price
  createdAt: Date;
  updatedAt: Date;
}

const DayMenuSchema = new Schema<IDayMenu>(
  {
    dayOfWeek: {
      type: String,
      required: true,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    },
    breakfast: { type: String },
    lunch: { type: String },
    dinner: { type: String },
    cooked: { type: [String], default: [] },
    notes: { type: String },
  },
  { _id: false }
);

const WeeklyMenuSchema = new Schema<IWeeklyMenu>(
  {
    scopeId: { type: String, required: true, index: true },
    year: { type: Number, required: true },
    week: { type: Number, required: true },
    days: { type: [DayMenuSchema], default: [] },
    prices: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

WeeklyMenuSchema.index({ scopeId: 1, year: 1, week: 1 }, { unique: true });

const WeeklyMenu: Model<IWeeklyMenu> =
  mongoose.models.WeeklyMenu ??
  mongoose.model<IWeeklyMenu>("WeeklyMenu", WeeklyMenuSchema);

export default WeeklyMenu;
