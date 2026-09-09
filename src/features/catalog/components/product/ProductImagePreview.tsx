import type { ReactNode } from "react";
import { ExpandIcon, XIcon } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ProductImage } from "../../types";

type ProductImagePreviewProps = {
  image: ProductImage;
  title: string;
  children: ReactNode;
};

export function ProductImagePreview({ image, title, children }: ProductImagePreviewProps) {
  return (
    <Dialog>
      <article className="flex flex-col gap-2 rounded-lg border border-input p-3 transition-[border-color,box-shadow] duration-150 hover:border-ring hover:shadow-md motion-reduce:transition-none">
        <div className="relative">
          <img
            src={image.url}
            alt={image.alt}
            loading="lazy"
            decoding="async"
            className="h-40 w-full rounded-md object-cover"
          />
          <DialogTrigger
            aria-label={`Ampliar foto de ${title}`}
            className="absolute right-2 bottom-2 flex min-h-9 cursor-pointer items-center gap-1 rounded-md bg-background/95 px-2 py-1 text-xs text-foreground shadow-sm outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ExpandIcon aria-hidden="true" className="size-3" />
            Ampliar foto
          </DialogTrigger>
        </div>
        {children}
      </article>

      <DialogContent showCloseButton={false} className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl motion-reduce:animate-none">
        <DialogTitle className="pr-10 leading-snug">{title}</DialogTitle>
        <DialogClose render={<Button variant="ghost" size="icon" className="absolute top-2 right-2 cursor-pointer" />}>
          <XIcon aria-hidden="true" />
          <span className="sr-only">Cerrar foto ampliada</span>
        </DialogClose>
        <img src={image.url} alt={image.alt} className="max-h-[70dvh] w-full rounded-lg object-contain" />
      </DialogContent>
    </Dialog>
  );
}
