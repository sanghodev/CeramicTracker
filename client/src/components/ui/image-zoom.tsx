import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleThumbnailClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Image thumbnail clicked, opening zoom modal");
    setIsOpen(true);
  };

  const handleModalClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(false);
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <>
      {/* Thumbnail with hover effect */}
      <div className={`relative group cursor-pointer ${className}`}>
        <img
          src={src}
          alt={alt}
          className={`object-cover rounded-lg border border-slate-200 ${thumbnailClassName}`}
          onClick={handleThumbnailClick}
          onError={(e) => {
            console.error("Image failed to load:", src);
            e.currentTarget.style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center pointer-events-none">
          <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </div>
      </div>

      {/* Modal overlay - using React Portal */}
      {isOpen && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-2 sm:p-4"
          onClick={handleModalClick}
          style={{ zIndex: 9999 }}
        >
          <div 
            className="relative w-full max-w-5xl max-h-[95vh] bg-white rounded-lg overflow-hidden shadow-2xl"
            onClick={handleImageClick}
          >
            <div className="flex justify-between items-center p-3 sm:p-4 border-b bg-slate-50">
              <h3 className="text-base sm:text-lg font-semibold text-slate-800 truncate pr-2">{alt}</h3>
              <button
                onClick={handleModalClick}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors flex-shrink-0"
                type="button"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
            <div className="p-2 sm:p-4 bg-slate-50 max-h-[85vh] overflow-auto">
              <img
                src={src}
                alt={alt}
                className="w-full h-auto max-h-[80vh] object-contain rounded border shadow-sm mx-auto block"
                onClick={handleImageClick}
                onError={(e) => {
                  console.error("Modal image failed to load:", src);
                }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}