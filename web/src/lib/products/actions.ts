"use server";

import { requireBusinessContext, canManageProducts } from "@/lib/auth/business-context";
import { createClient } from "@/lib/supabase/server";
import {
  deleteProductImageByUrl,
  uploadProductImage,
} from "@/lib/storage/product-images";
import type { ProductUnit } from "@/types/product";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseMoney(value: FormDataEntryValue | null): number {
  if (value === null || value === "") return 0;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function parseQty(value: FormDataEntryValue | null): number {
  if (value === null || value === "") return 0;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export type ProductActionState = { error?: string };

export async function createProduct(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageProducts(ctx.role)) {
    return { error: "You do not have permission to add products." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Name is required." };
  }

  const skuRaw = String(formData.get("sku") ?? "").trim();
  const sku = skuRaw === "" ? null : skuRaw;

  const unit = String(formData.get("unit") ?? "pcs") as ProductUnit;

  const supabase = await createClient();

  const { data: inserted, error } = await supabase
    .from("products")
    .insert({
      business_id: ctx.businessId,
      name,
      sku,
      barcode: String(formData.get("barcode") ?? "").trim() || null,
      category: String(formData.get("category") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim() || null,
      unit,
      purchase_price: parseMoney(formData.get("purchase_price")),
      sale_price: parseMoney(formData.get("sale_price")),
      current_stock: parseQty(formData.get("current_stock")),
      reorder_level: parseQty(formData.get("reorder_level")),
      is_active: formData.get("is_active") === "on",
      created_by: ctx.userId,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "SKU must be unique in your business." };
    }
    return { error: error.message };
  }

  const imageFile = formData.get("image");
  if (imageFile instanceof File && imageFile.size > 0) {
    const up = await uploadProductImage(supabase, ctx.businessId, inserted.id, imageFile);
    if ("error" in up) {
      await supabase.from("products").delete().eq("id", inserted.id);
      return { error: up.error };
    }
    const { error: uerr } = await supabase
      .from("products")
      .update({ image_url: up.url })
      .eq("id", inserted.id)
      .eq("business_id", ctx.businessId);
    if (uerr) {
      await supabase.from("products").delete().eq("id", inserted.id);
      return { error: uerr.message };
    }
  }

  revalidatePath("/dashboard/products");
  redirect("/dashboard/products");
}

export async function updateProduct(
  productId: string,
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageProducts(ctx.role)) {
    return { error: "You do not have permission to edit products." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Name is required." };
  }

  const skuRaw = String(formData.get("sku") ?? "").trim();
  const sku = skuRaw === "" ? null : skuRaw;

  const unit = String(formData.get("unit") ?? "pcs") as ProductUnit;

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("products")
    .select("id, business_id, image_url")
    .eq("id", productId)
    .maybeSingle();

  if (!existing || existing.business_id !== ctx.businessId) {
    return { error: "Product not found." };
  }

  const imageFile = formData.get("image");
  const removeImage = formData.get("remove_image") === "on";

  let nextImageUrl: string | null | undefined;

  if (imageFile instanceof File && imageFile.size > 0) {
    await deleteProductImageByUrl(supabase, existing.image_url);
    const up = await uploadProductImage(supabase, ctx.businessId, productId, imageFile);
    if ("error" in up) {
      return { error: up.error };
    }
    nextImageUrl = up.url;
  } else if (removeImage) {
    await deleteProductImageByUrl(supabase, existing.image_url);
    nextImageUrl = null;
  }

  const updateRow: Record<string, unknown> = {
    name,
    sku,
    barcode: String(formData.get("barcode") ?? "").trim() || null,
    category: String(formData.get("category") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    unit,
    purchase_price: parseMoney(formData.get("purchase_price")),
    sale_price: parseMoney(formData.get("sale_price")),
    current_stock: parseQty(formData.get("current_stock")),
    reorder_level: parseQty(formData.get("reorder_level")),
    is_active: formData.get("is_active") === "on",
  };

  if (nextImageUrl !== undefined) {
    updateRow.image_url = nextImageUrl;
  }

  const { error } = await supabase
    .from("products")
    .update(updateRow)
    .eq("id", productId)
    .eq("business_id", ctx.businessId);

  if (error) {
    if (error.code === "23505") {
      return { error: "SKU must be unique in your business." };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/products");
  redirect("/dashboard/products");
}
