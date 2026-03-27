import mongoose, { Schema, Model } from "mongoose";

export interface IHousehold {
  _id: string;
  name: string;
  members: string[]; // user IDs
  inviteCode: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const HouseholdSchema = new Schema<IHousehold>(
  {
    name: { type: String, required: true },
    members: { type: [String], default: [] },
    inviteCode: { type: String, required: true, unique: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

const Household: Model<IHousehold> =
  mongoose.models.Household ??
  mongoose.model<IHousehold>("Household", HouseholdSchema);

export default Household;
