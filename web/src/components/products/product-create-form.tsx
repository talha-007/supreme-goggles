"use client";

import { createProduct, type ProductActionState } from "@/lib/products/actions";
import { ProductFields } from "@/components/products/product-fields";
import { useActionState } from "react";

type CreateProps = {
  barcodeFromUrl?: string;
  scanMode?: boolean;
};

export function ProductCreateForm({ barcodeFromUrl, scanMode }: CreateProps) {
  const [state, formAction, pending] = useActionState(createProduct, {} as ProductActionState);

  return (
    <form action={formAction} encType="multipart/form-data" className="flex flex-col gap-6">
      <ProductFields barcodeFromUrl={barcodeFromUrl} scanMode={scanMode} />
      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
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
