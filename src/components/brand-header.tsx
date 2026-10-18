export function BrandHeader({ heading = true }: { heading?: boolean }) {
  const titleClassName = "hidden font-nasalization text-3xl tracking-[0.12em] sm:inline";

  return (
    <div className="flex items-center gap-3">
      <img
        src={"/PY1-COMERCIO/icono.svg"}
        alt="Space Shop"
        aria-hidden="true"
        className="size-14 object-contain dark:invert"
      />
      {heading ? (
        <h1 className={titleClassName}>SPACE SHOP</h1>
      ) : (
        <span className={titleClassName}>SPACE SHOP</span>
      )}
    </div>
  );
}
