import { useState } from "react";
import { ZoomIn, X } from "lucide-react";

interface ImageZoomProps {
  src: string;
  alt: string;
  className?: string;
  thumbnailClassName?: string;
}

export function ImageZoom({ src, alt, className = "", thumbnailClassName = "w-20 h-20 sm:w-24 sm:h-24" }: ImageZoomProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!src) return null;

  return (
    <>
      {/* Thumbnail with hover effect */}
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

      {/* Modal overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={() => setIsOpen(false)}
        >
          <div className="relative w-full max-w-5xl max-h-[95vh] bg-white rounded-lg overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-3 sm:p-4 border-b bg-slate-50">
              <h3 className="text-base sm:text-lg font-semibold text-slate-800 truncate pr-2">{alt}</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors flex-shrink-0"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
            <div className="p-2 sm:p-4 bg-slate-50">
              <img
                src={src}
                alt={alt}
                className="w-full h-auto max-h-[80vh] object-contain rounded border shadow-sm"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}