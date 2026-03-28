import mongoose, { Schema, Model } from "mongoose";
import type { MealType } from "@/types";

export interface IMeal {
  _id: string;
  userId: string;   // creator
  scopeId: string;  // householdId ?? userId — used for all queries
  name: string;
  type: MealType;
  ingredients: { name: string; quantity: string }[];
  isBreakfast?: boolean; // true = only used in breakfast slot
  description?: string;
  instructions?: string;
  imageUrl?: string;
  imageKey?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const IngredientSchema = new Schema(
  {
    name: { type: String, required: true },
    quantity: { type: String, default: "" },
  },
  { _id: false }
);

const MealSchema = new Schema<IMeal>(
  {
    userId: { type: String, required: true },
    scopeId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ["carne_roja", "chancho", "pollo", "pescado", "pasta", "arroz", "sopa", "otro"],
    },
    ingredients: { type: [IngredientSchema], default: [] },
    isBreakfast: { type: Boolean, default: false },
    description: String,
    instructions: String,
    imageUrl: String,
    imageKey: String,
    notes: String,
  },
  { timestamps: true }
);

// In development, clear cached model on hot-reload to avoid stale schemas
if (process.env.NODE_ENV === "development" && mongoose.models.Meal) {
  delete (mongoose.models as Record<string, unknown>).Meal;
}

const Meal: Model<IMeal> =
  (mongoose.models.Meal as Model<IMeal>) ?? mongoose.model<IMeal>("Meal", MealSchema);

export default Meal;
