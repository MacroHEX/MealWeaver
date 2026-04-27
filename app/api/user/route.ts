import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth/getAuth";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/lib/db/models/User";

export async function GET(req: NextRequest) {
  const authSession = await getAuth(req);
  if (!authSession) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await connectDB();
  const user = await User.findById(authSession.user.id).select("-password").lean();
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  return NextResponse.json(user);
}

export async function PUT(req: NextRequest) {
  const authSession = await getAuth(req);
  if (!authSession) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();

  // Only allow updating safe fields
  const allowedFields: Record<string, unknown> = {};
  if (body.name) allowedFields.name = body.name;
  if (body.preferences) allowedFields.preferences = body.preferences;

  await connectDB();
  const user = await User.findByIdAndUpdate(
    authSession.user.id,
    { $set: allowedFields },
    { new: true }
  ).select("-password").lean();

  return NextResponse.json(user);
}
