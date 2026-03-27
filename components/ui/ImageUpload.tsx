"use client";

import { useRef, useState } from "react";
import { ImagePlus, X, Loader2, AlertCircle } from "lucide-react";

interface ImageUploadProps {
  currentUrl?: string;
  currentKey?: string;
  onUpload: (url: string, key: string) => void;
  onRemove: () => void;
}

export function ImageUpload({ currentUrl, currentKey, onUpload, onRemove }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al subir imagen");
        setPreview(currentUrl ?? null);
      } else {
        onUpload(data.url, data.key);
      }
    } catch {
      setError("Error de conexión al subir la imagen");
      setPreview(currentUrl ?? null);
    } finally {
      setUploading(false);
      URL.revokeObjectURL(objectUrl);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (currentKey) {
      await fetch(`/api/upload?key=${currentKey}`, { method: "DELETE" });
    }
    setPreview(null);
    setError(null);
    onRemove();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Imagen
      </span>

      {preview ? (
        <div className="relative rounded-xl overflow-hidden">
          <img src={preview} alt="Vista previa" className="w-full h-40 object-cover" />
          <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1.5 bg-red-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow"
            >
              <X className="w-3.5 h-3.5" />
              Eliminar
            </button>
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="
            flex flex-col items-center justify-center gap-2 h-28
            border-2 border-dashed border-slate-200 dark:border-slate-600
            rounded-xl text-slate-400 hover:border-emerald-400 hover:text-emerald-500
            dark:hover:border-emerald-500 transition-colors disabled:opacity-50
            disabled:cursor-not-allowed
          "
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <ImagePlus className="w-6 h-6" />
          )}
          <span className="text-xs">
            {uploading ? "Subiendo..." : "Subir imagen (máx. 10MB)"}
          </span>
        </button>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
