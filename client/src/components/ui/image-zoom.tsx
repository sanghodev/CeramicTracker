import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ZoomIn, ZoomOut, RotateCcw, X } from "lucide-react";

interface ImageZoomProps {
  src: string;
  alt: string;
  className?: string;
  thumbnailClassName?: string;
}

export function ImageZoom({ src, alt, className = "", thumbnailClassName = "w-20 h-20 sm:w-24 sm:h-24" }: ImageZoomProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  const [touchStartPosition, setTouchStartPosition] = useState({ x: 0, y: 0 });

  if (!src) return null;

  // Handle escape key and reset zoom when modal opens/closes
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      // Reset zoom and position when modal closes
      setScale(1);
      setPosition({ x: 0, y: 0 });
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

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev * 1.5, 5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev / 1.5, 0.5));
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.min(Math.max(prev * delta, 0.5), 5));
  };

  // Touch event handlers for mobile
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const getTouchCenter = (touches: React.TouchList) => {
    if (touches.length === 1) {
      return { x: touches[0].clientX, y: touches[0].clientY };
    }
    const touch1 = touches[0];
    const touch2 = touches[1];
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touches = e.touches;
    
    if (touches.length === 1) {
      // Single touch - start dragging
      if (scale > 1) {
        setIsDragging(true);
        setTouchStartPosition({
          x: touches[0].clientX - position.x,
          y: touches[0].clientY - position.y
        });
      }
    } else if (touches.length === 2) {
      // Two fingers - start pinch zoom
      setIsDragging(false);
      const touch1 = touches[0];
      const touch2 = touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      setLastTouchDistance(distance);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const touches = e.touches;

    if (touches.length === 1 && isDragging && scale > 1) {
      // Single touch drag
      setPosition({
        x: touches[0].clientX - touchStartPosition.x,
        y: touches[0].clientY - touchStartPosition.y
      });
    } else if (touches.length === 2 && lastTouchDistance > 0) {
      // Pinch zoom
      const touch1 = touches[0];
      const touch2 = touches[1];
      const currentDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      const scaleChange = currentDistance / lastTouchDistance;
      setScale(prev => Math.min(Math.max(prev * scaleChange, 0.5), 5));
      setLastTouchDistance(currentDistance);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setLastTouchDistance(0);
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
            className="relative w-full max-w-6xl max-h-[95vh] bg-white rounded-lg overflow-hidden shadow-2xl"
            onClick={handleImageClick}
          >
            <div className="flex justify-between items-center p-3 sm:p-4 border-b bg-slate-50">
              <h3 className="text-base sm:text-lg font-semibold text-slate-800 truncate pr-2">{alt}</h3>
              
              {/* Zoom Controls */}
              <div className="flex items-center gap-2 mr-2">
                <button
                  onClick={handleZoomOut}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                  type="button"
                  title="축소"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-sm text-slate-600 min-w-[60px] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                  type="button"
                  title="확대"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={handleReset}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                  type="button"
                  title="Original Size"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={handleModalClick}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors flex-shrink-0"
                type="button"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
            
            <div 
              className="relative bg-slate-50 max-h-[85vh] overflow-hidden cursor-grab active:cursor-grabbing touch-none"
              style={{ 
                cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                touchAction: 'none'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <img
                src={src}
                alt={alt}
                className="w-full h-auto max-h-[80vh] object-contain mx-auto block transition-transform duration-200"
                style={{
                  transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                  maxHeight: '80vh'
                }}
                onClick={handleImageClick}
                onError={(e) => {
                  console.error("Modal image failed to load:", src);
                }}
                draggable={false}
              />
            </div>
            
            {/* Instructions */}
            <div className="p-2 text-xs text-slate-500 text-center bg-slate-50 border-t">
              <div className="hidden sm:block">마우스 휠로 확대/축소 • 확대된 이미지를 드래그해서 이동 가능</div>
              <div className="block sm:hidden">두 손가락으로 확대/축소 • 한 손가락으로 드래그해서 이동 가능</div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}