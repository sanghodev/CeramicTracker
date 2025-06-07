import { useState } from "react";
import { X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ImageZoomProps {
  src: string;
  alt: string;
  className?: string;
  thumbnailClassName?: string;
}

export function ImageZoom({ src, alt, className = "", thumbnailClassName = "w-20 h-20 sm:w-24 sm:h-24" }: ImageZoomProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className={`relative group cursor-pointer ${className}`}>
        <img
          src={src}
          alt={alt}
          className={`object-cover rounded-lg border border-slate-200 ${thumbnailClassName}`}
          onClick={() => setIsOpen(true)}
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
          <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex justify-between items-center">
              <span>{alt}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <img
              src={src}
              alt={alt}
              className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}