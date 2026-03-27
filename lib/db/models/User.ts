import mongoose, { Schema, Model } from "mongoose";

export interface IUser {
  _id: string;
  email: string;
  name: string;
  password: string;
  avatar?: string;
  householdId?: string;
  preferences: {
    theme: "light" | "dark";
    restrictions: string[];
    mealsPerDay: 2 | 3;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    avatar: { type: String },
    householdId: { type: String, default: null },
    preferences: {
      theme: { type: String, enum: ["light", "dark"], default: "light" },
      restrictions: { type: [String], default: [] },
      mealsPerDay: { type: Number, enum: [2, 3], default: 3 },
    },
  },
  { timestamps: true }
);

const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);

export default User;
