import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  CheckIcon,
  MapPinIcon,
  PackageCheckIcon,
  StarIcon,
} from "lucide-react";
import { BrandHeader } from "@/components/brand-header";
import { cn } from "@/lib/utils";
import type { ProductHit } from "@/features/catalog/types";
import { getProductVariants } from "./getProductVariants";

type VariantsResult = {
  productId: string;
  variants: ProductHit[];
  error: boolean;
};

function formatPrice(value: number, currency: string) {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function ProductDetailSkeleton() {
  return (
    <main className="mx-auto grid w-full max-w-7xl animate-pulse gap-8 px-4 py-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)] lg:px-8">
      <div className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="aspect-square rounded-lg bg-muted" />
        ))}
      </div>
      <div className="space-y-4">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-10 w-3/4 rounded bg-muted" />
        <div className="h-7 w-36 rounded bg-muted" />
        <div className="h-24 rounded bg-muted" />
      </div>
    </main>
  );
}

export default function ProductDetailPage() {
  const { productId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [result, setResult] = useState<VariantsResult>();
  const [selection, setSelection] = useState<{
    sku: string | null;
    size: string | null;
    imageIndex: number;
  }>({
    sku: null,
    size: null,
    imageIndex: 0,
  });

  useEffect(() => {
    let active = true;

    getProductVariants(productId)
      .then((variants) => {
        if (active) setResult({ productId, variants, error: false });
      })
      .catch(() => {
        if (active) setResult({ productId, variants: [], error: true });
      });

    return () => {
      active = false;
    };
  }, [productId]);

  const isLoading = result?.productId !== productId;
  const variants = isLoading ? [] : result.variants;
  const requestedSku = searchParams.get("variante");
  const selectedVariant =
    variants.find((variant) => variant.sku === selection.sku) ??
    variants.find((variant) => variant.sku === requestedSku) ??
    variants[0];
  const selectedSize =
    selection.sku === selectedVariant?.sku ? selection.size : null;

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background">
        <SiteHeader />
        <ProductDetailSkeleton />
      </div>
    );
  }

  if (result.error || !selectedVariant) {
    return (
      <div className="min-h-dvh bg-background">
        <SiteHeader />
        <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
          <h1 className="text-2xl font-semibold">Producto no disponible</h1>
          <p className="mt-3 text-muted-foreground">
            No pudimos encontrar las variantes de este producto.
          </p>
          <Link
            to="/"
            className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            Volver al catálogo
          </Link>
        </main>
      </div>
    );
  }

  const images = selectedVariant.images.length > 0
    ? selectedVariant.images
    : [selectedVariant.image];
  const selectedImageIndex = selection.sku === selectedVariant.sku
    ? selection.imageIndex
    : 0;
  const selectedImage = images[selectedImageIndex] ?? images[0];
  const discount = selectedVariant.on_discount
    ? selectedVariant.b2c_discount
    : undefined;
  const currentPrice = discount
    ? selectedVariant.b2c_price * (1 - discount.percentage / 100)
    : selectedVariant.b2c_price;
  const isAvailable = selectedVariant.b2c_available_quantity > 0;

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1440px] px-4 py-5 lg:px-8 lg:py-8">
        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          Volver al catálogo
        </Link>

        <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-3 lg:grid-cols-[5.5rem_minmax(0,1fr)_minmax(320px,380px)] lg:gap-6 xl:grid-cols-[6rem_minmax(0,640px)_400px] xl:justify-center">
          <section aria-label="Imágenes del producto" className="contents">
            <div className="flex max-h-[75vw] flex-col gap-2 overflow-y-auto pr-1 lg:max-h-[calc(100vh-9rem)]">
              {images.map((image, index) => (
                <button
                  key={`${image.url}-${index}`}
                  type="button"
                  aria-label={`Ver imagen ${index + 1} de ${images.length}`}
                  aria-pressed={index === selectedImageIndex}
                  className={cn(
                    "aspect-square shrink-0 cursor-pointer overflow-hidden rounded-md border-2 bg-muted outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    index === selectedImageIndex
                      ? "border-foreground"
                      : "border-transparent hover:border-ring",
                  )}
                  onClick={() => setSelection({
                    sku: selectedVariant.sku,
                    size: selectedSize,
                    imageIndex: index,
                  })}
                >
                  <img
                    src={image.url}
                    alt=""
                    className="size-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>

            <figure className="aspect-square min-w-0 overflow-hidden rounded-lg bg-muted">
              <img
                src={selectedImage.url}
                alt={selectedImage.alt}
                className="size-full object-cover"
                decoding="async"
              />
            </figure>
          </section>

          <aside className="col-span-2 mt-5 space-y-7 lg:col-span-1 lg:mt-0 lg:sticky lg:top-6">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {selectedVariant.brand}
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                {selectedVariant.title}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedVariant.categories.join(" · ")}
              </p>
              <div className="mt-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xl font-semibold">
                    {formatPrice(currentPrice, selectedVariant.currency)}
                  </p>
                  {discount && (
                    <p className="text-sm text-muted-foreground">
                      <span className="line-through">
                        {formatPrice(selectedVariant.b2c_price, selectedVariant.currency)}
                      </span>{" "}
                      <span className="font-medium text-foreground">
                        {discount.percentage}% de descuento
                      </span>
                    </p>
                  )}
                </div>
                <p
                  className="flex items-center gap-1 text-sm font-medium"
                  aria-label={`Calificación: ${selectedVariant.rating} de 5`}
                >
                  <StarIcon aria-hidden="true" className="size-4 fill-amber-400 text-amber-500" />
                  {selectedVariant.rating}
                </p>
              </div>
            </div>

            <section aria-labelledby="variant-title">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 id="variant-title" className="font-medium">Selecciona un color</h2>
                <span className="text-sm text-muted-foreground">{selectedVariant.facets.color}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
                {variants.map((variant) => (
                  <button
                    key={variant.sku}
                    type="button"
                    aria-pressed={variant.sku === selectedVariant.sku}
                    aria-label={`Color ${variant.facets.color}`}
                    className={cn(
                      "cursor-pointer overflow-hidden rounded-lg border-2 bg-muted outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                      variant.sku === selectedVariant.sku
                        ? "border-foreground"
                        : "border-transparent hover:border-ring",
                    )}
                    onClick={() => {
                      setSelection({ sku: variant.sku, size: null, imageIndex: 0 });
                      setSearchParams({ variante: variant.sku }, { replace: true });
                    }}
                  >
                    <img
                      src={variant.image.url}
                      alt=""
                      className="aspect-square w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </section>

            <section aria-labelledby="size-title">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 id="size-title" className="font-medium">Selecciona una talla</h2>
                <span className="text-xs text-muted-foreground">
                  {selectedVariant.facets.size.length} disponibles
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {selectedVariant.facets.size.map((size) => (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={selectedSize === size}
                    className={cn(
                      "min-h-12 cursor-pointer rounded-md border px-2 py-2 text-sm outline-none transition-colors hover:border-foreground focus-visible:ring-2 focus-visible:ring-ring",
                      selectedSize === size
                        ? "border-foreground bg-foreground text-background"
                        : "border-input",
                    )}
                    onClick={() => setSelection({
                      sku: selectedVariant.sku,
                      size,
                      imageIndex: selectedImageIndex,
                    })}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </section>

            <div className={cn(
              "flex items-center gap-3 rounded-lg border p-4",
              isAvailable ? "border-input" : "border-destructive/40 bg-destructive/5",
            )}>
              <PackageCheckIcon aria-hidden="true" className="size-5 shrink-0" />
              <div>
                <p className="font-medium">
                  {isAvailable ? "Disponible" : "Temporalmente agotado"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isAvailable
                    ? `${selectedVariant.b2c_available_quantity} unidades disponibles`
                    : "Prueba con otro color"}
                </p>
              </div>
            </div>

          </aside>
        </div>

        <section className="mt-10 border-t border-input pt-8 lg:mt-14 lg:pt-10">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:gap-16">
            <div>
              <h2 className="text-2xl font-semibold">Descripción</h2>
              <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
                {selectedVariant.description}
              </p>
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Especificaciones</h2>
              <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              <DetailRow label="Color" value={selectedVariant.facets.color} />
              <DetailRow label="SKU" value={selectedVariant.sku} />
              {selectedVariant.facets.technology && (
                <DetailRow label="Tecnología" value={selectedVariant.facets.technology} />
              )}
              <DetailRow label="Materiales" value={selectedVariant.facets.materials.join(", ")} />
              <DetailRow label="Género" value={selectedVariant.facets.gender.join(", ")} />
              <DetailRow
                label="Cantidad por pedido"
                value={`${selectedVariant.b2c_min_order_quantity}–${selectedVariant.b2c_max_order_quantity} unidades, en incrementos de ${selectedVariant.b2c_step_quantity}`}
              />
              {selectedVariant.facets.recommend_use && (
                <DetailRow
                  label="Uso recomendado"
                  value={selectedVariant.facets.recommend_use.join(", ")}
                />
              )}
              </dl>
            </div>
          </div>

          {selectedVariant.b2c_stock_by_location.length > 0 && (
            <div className="mt-8 border-t border-input pt-8">
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <MapPinIcon aria-hidden="true" className="size-5" />
                Disponibilidad por tienda
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {selectedVariant.b2c_stock_by_location.map((location) => (
                  <li
                    key={`${location.province}-${location.locale_name}`}
                    className="flex items-start justify-between gap-4 rounded-lg bg-muted/60 p-4 text-sm"
                  >
                    <div>
                      <p className="font-medium">{location.locale_name}</p>
                      <p className="text-muted-foreground">{location.province}</p>
                    </div>
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <CheckIcon aria-hidden="true" className="size-4" />
                      {location.available_quantity} disponibles
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="border-b border-input px-4 py-3 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        <Link to="/" aria-label="SPACE, volver al catálogo" className="inline-flex">
          <BrandHeader heading={false} />
        </Link>
      </div>
    </header>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 border-b border-input/70 pb-3">
      <dt className="font-medium">{label}</dt>
      <dd className="text-muted-foreground">{value}</dd>
    </div>
  );
}
