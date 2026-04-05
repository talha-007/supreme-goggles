"use client";

import { updateProduct, type ProductActionState } from "@/lib/products/actions";
import { ProductFields } from "@/components/products/product-fields";
import type { ProductRow } from "@/types/product";
import { useActionState, useMemo } from "react";

export function ProductEditForm({ product }: { product: ProductRow }) {
  const updateAction = useMemo(
    () => updateProduct.bind(null, product.id),
    [product.id],
  );
  const [state, formAction, pending] = useActionState(updateAction, {} as ProductActionState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <ProductFields defaultValues={product} existingImageUrl={product.image_url} />
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
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
