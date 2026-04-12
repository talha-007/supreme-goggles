"use client";

import { ProductBarcodeField } from "@/components/products/product-barcode-field";
import { PRODUCT_UNITS } from "@/types/product";
import type { ProductRow } from "@/types/product";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useId } from "react";

type Props = {
  defaultValues?: Partial<ProductRow>;
  /** When editing, show current photo + optional remove. */
  existingImageUrl?: string | null;
  /** Prefill barcode (e.g. `?barcode=` from catalog search). */
  barcodeFromUrl?: string;
  /** Autofocus barcode field for USB scanner setup at the counter. */
  scanMode?: boolean;
  /** Distinct values from existing products (searchable when non-empty). */
  categorySuggestions?: readonly string[];
  brandSuggestions?: readonly string[];
};

export function ProductFields({
  defaultValues,
  existingImageUrl,
  barcodeFromUrl,
  scanMode = false,
  categorySuggestions = [],
  brandSuggestions = [],
}: Props) {
  const t = useTranslations("productFields");
  const d = defaultValues ?? {};
  const barcodeValue = d.barcode ?? barcodeFromUrl ?? "";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2 flex flex-col gap-2">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("photo")}</span>
        {existingImageUrl ? (
          <div className="flex flex-wrap items-start gap-4">
            <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
              <Image
                src={existingImageUrl}
                alt=""
                fill
                sizes="128px"
                className="object-cover"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                name="remove_image"
                className="size-4 rounded border-zinc-300"
              />
              {t("removePhoto")}
            </label>
          </div>
        ) : null}
        <input
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-900 hover:file:bg-zinc-200 dark:text-zinc-300 dark:file:bg-zinc-800 dark:file:text-zinc-100 dark:hover:file:bg-zinc-700"
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("imageHint")}</p>
      </div>

      <div className="sm:col-span-2 flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("name")} <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={d.name}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      <div className="sm:col-span-2 flex flex-col gap-1">
        <label htmlFor="barcode" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("barcode")}
        </label>
        <ProductBarcodeField defaultValue={barcodeValue} autoFocus={scanMode} />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {t("barcodeHint", { scanMode: t("scanModeWord") })}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="sku" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("sku")}
        </label>
        <input
          id="sku"
          name="sku"
          type="text"
          defaultValue={d.sku ?? ""}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="category" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("category")}
        </label>
        <input
          id="category"
          name="category"
          type="text"
          list={categorySuggestions.length > 0 ? categoryListId : undefined}
          defaultValue={d.category ?? ""}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        {categorySuggestions.length > 0 ? (
          <datalist id={categoryListId}>
            {categorySuggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="brand" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("brand")}
        </label>
        <input
          id="brand"
          name="brand"
          type="text"
          list={brandSuggestions.length > 0 ? brandListId : undefined}
          defaultValue={d.brand ?? ""}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        {brandSuggestions.length > 0 ? (
          <datalist id={brandListId}>
            {brandSuggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        ) : null}
      </div>
      {categorySuggestions.length > 0 || brandSuggestions.length > 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 sm:col-span-2">{t("taxonomyHint")}</p>
      ) : null}
      <div className="flex flex-col gap-1">
        <label htmlFor="unit" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("unit")}
        </label>
        <select
          id="unit"
          name="unit"
          defaultValue={d.unit ?? "pcs"}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          {PRODUCT_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2 flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("description")}
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={d.description ?? ""}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="purchase_price" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("purchasePrice")}
        </label>
        <input
          id="purchase_price"
          name="purchase_price"
          type="number"
          min={0}
          step="0.01"
          defaultValue={d.purchase_price ?? 0}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="sale_price" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("salePrice")}
        </label>
        <input
          id="sale_price"
          name="sale_price"
          type="number"
          min={0}
          step="0.01"
          defaultValue={d.sale_price ?? 0}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="current_stock" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("currentStock")}
        </label>
        <input
          id="current_stock"
          name="current_stock"
          type="number"
          min={0}
          step="0.001"
          defaultValue={d.current_stock ?? 0}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="reorder_level" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("reorderLevel")}
        </label>
        <input
          id="reorder_level"
          name="reorder_level"
          type="number"
          min={0}
          step="0.001"
          defaultValue={d.reorder_level ?? 0}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      <div className="sm:col-span-2 flex items-center gap-2 pt-1">
        <input
          id="is_active"
          name="is_active"
          type="checkbox"
          defaultChecked={d.is_active !== false}
          className="size-4 rounded border-zinc-300"
        />
        <label htmlFor="is_active" className="text-sm text-zinc-700 dark:text-zinc-300">
          {t("activeShown")}
        </label>
      </div>
    </div>
  );
}
