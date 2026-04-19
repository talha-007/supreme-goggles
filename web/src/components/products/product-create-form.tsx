"use client";

import { createProduct, type ProductActionState } from "@/lib/products/actions";
import type { ProductTaxonomy } from "@/lib/products/taxonomy";
import { ProductFields } from "@/components/products/product-fields";
import { PRODUCT_IMAGE_MAX_BYTES, validateProductImageSelection } from "@/lib/storage/product-images";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

const MAX_IMAGE_MB = PRODUCT_IMAGE_MAX_BYTES / (1024 * 1024);

type CreateProps = {
  barcodeFromUrl?: string;
  scanMode?: boolean;
  taxonomy: ProductTaxonomy;
  showPharmacyFields?: boolean;
  showRestaurantFields?: boolean;
  menuMode?: boolean;
};

export function ProductCreateForm({
  barcodeFromUrl,
  scanMode,
  taxonomy,
  showPharmacyFields = false,
  showRestaurantFields = false,
  menuMode = false,
}: CreateProps) {
  const t = useTranslations("productFields");
  const [state, formAction, pending] = useActionState(createProduct, {} as ProductActionState);
  const [clientError, setClientError] = useState<string | null>(null);

  const displayError = clientError ?? state.error;

  return (
    <form
      action={formAction}
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        setClientError(null);
        const fd = new FormData(e.currentTarget);
        const img = fd.get("image");
        if (!(img instanceof File) || img.size === 0) return;
        const code = validateProductImageSelection(img);
        if (code === "too_large") {
          e.preventDefault();
          setClientError(t("imageTooLarge", { maxMb: MAX_IMAGE_MB }));
          return;
        }
        if (code === "bad_type") {
          e.preventDefault();
          setClientError(t("imageBadType"));
        }
      }}
    >
      <ProductFields
        barcodeFromUrl={barcodeFromUrl}
        scanMode={scanMode}
        categorySuggestions={taxonomy.categories}
        brandSuggestions={taxonomy.brands}
        showPharmacyFields={showPharmacyFields}
        showRestaurantFields={showRestaurantFields}
        menuMode={menuMode}
      />
      {displayError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {displayError}
        </p>
      ) : null}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {pending ? "Saving…" : "Save product"}
        </button>
      </div>
    </form>
  );
}
