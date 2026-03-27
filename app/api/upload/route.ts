import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { UTApi } from "uploadthing/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!process.env.UPLOADTHING_TOKEN) {
    return NextResponse.json({ error: "Almacenamiento de imágenes no configurado" }, { status: 503 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "El archivo debe ser una imagen" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "La imagen no puede superar los 10MB" }, { status: 400 });
    }

    const utapi = new UTApi();
    const response = await utapi.uploadFiles(file);

    if (response.error) {
      return NextResponse.json({ error: response.error.message }, { status: 500 });
    }

    return NextResponse.json({
      url: response.data.ufsUrl,
      key: response.data.key,
    });
  } catch {
    return NextResponse.json({ error: "Error al subir la imagen" }, { status: 500 });
  }
}

/** DELETE /api/upload?key=xxx — delete an image from UploadThing */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const key = new URL(req.url).searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Key requerida" }, { status: 400 });

  if (!process.env.UPLOADTHING_TOKEN) {
    return NextResponse.json({ message: "OK" });
  }

  const utapi = new UTApi();
  await utapi.deleteFiles(key);
  return NextResponse.json({ message: "Imagen eliminada" });
}
