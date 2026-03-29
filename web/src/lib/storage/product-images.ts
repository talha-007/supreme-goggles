import type { SupabaseClient } from "@supabase/supabase-js";

export const PRODUCT_IMAGES_BUCKET = "product-images";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export function validateImageFile(file: File): string | null {
  if (file.size === 0) return null;
  if (file.size > MAX_BYTES) return "Image must be 2MB or smaller.";
  if (!ALLOWED_TYPES.includes(file.type)) return "Use JPEG, PNG, GIF, or WebP.";
  return null;
}

function extensionForFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "gif", "webp"].includes(fromName)) {
    return fromName === "jpg" ? "jpeg" : fromName;
  }
  if (file.type === "image/jpeg") return "jpeg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/gif") return "gif";
  if (file.type === "image/webp") return "webp";
  return "jpeg";
}

export async function uploadProductImage(
  supabase: SupabaseClient,
  businessId: string,
  productId: string,
  file: File,
): Promise<{ url: string } | { error: string }> {
  const v = validateImageFile(file);
  if (v) return { error: v };

  const ext = extensionForFile(file);
  const path = `${businessId}/${productId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    return { error: error.message };
  }

  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}

export function publicUrlToStoragePath(publicUrl: string): string | null {
  const marker = `/object/public/${PRODUCT_IMAGES_BUCKET}/`;
  const i = publicUrl.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(publicUrl.slice(i + marker.length));
}

export async function deleteProductImageByUrl(
  supabase: SupabaseClient,
  publicUrl: string | null | undefined,
): Promise<void> {
  if (!publicUrl) return;
  const path = publicUrlToStoragePath(publicUrl);
  if (!path) return;
  await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);
}
