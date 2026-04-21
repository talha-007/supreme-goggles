import type { SupabaseClient } from "@supabase/supabase-js";
import * as FileSystem from "expo-file-system/legacy";

export const BUSINESS_LOGOS_BUCKET = "business-logos";

const MAX_BYTES = 2 * 1024 * 1024;

function mimeToExt(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("gif")) return "gif";
  if (m.includes("webp")) return "webp";
  return "jpeg";
}

function newFileId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const atobFn = globalThis.atob as ((s: string) => string) | undefined;
  if (typeof atobFn !== "function") {
    throw new Error("Base64 decode is not available on this runtime.");
  }
  const binary = atobFn(base64);
  const len = binary.length;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export function businessLogoPublicUrlToPath(publicUrl: string): string | null {
  const marker = `/object/public/${BUSINESS_LOGOS_BUCKET}/`;
  const i = publicUrl.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(publicUrl.slice(i + marker.length));
}

export async function deleteBusinessLogoByUrl(
  supabase: SupabaseClient,
  publicUrl: string | null | undefined,
): Promise<void> {
  if (!publicUrl) return;
  const path = businessLogoPublicUrlToPath(publicUrl);
  if (!path) return;
  await supabase.storage.from(BUSINESS_LOGOS_BUCKET).remove([path]);
}

/**
 * Upload a picked logo (same pattern as product images: read via expo-file-system for content:// on Android).
 */
export async function uploadBusinessLogoFromUri(
  supabase: SupabaseClient,
  businessId: string,
  localUri: string,
  mimeType: string,
): Promise<{ url: string } | { error: string }> {
  try {
    const info = await FileSystem.getInfoAsync(localUri);
    if (info.exists && info.size > MAX_BYTES) {
      return { error: "Logo must be 2MB or smaller." };
    }
  } catch {
    /* continue */
  }

  let bytes: Uint8Array;
  try {
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    bytes = base64ToUint8Array(base64);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `Could not read image file: ${msg}` };
  }

  if (bytes.length > MAX_BYTES) {
    return { error: "Logo must be 2MB or smaller." };
  }

  const ext = mimeToExt(mimeType || "image/jpeg");
  const path = `${businessId}/${newFileId()}.${ext}`;
  const contentType = mimeType || "image/jpeg";

  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

  const { error } = await supabase.storage.from(BUSINESS_LOGOS_BUCKET).upload(path, ab, {
    contentType,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) return { error: error.message };

  const { data } = supabase.storage.from(BUSINESS_LOGOS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}
