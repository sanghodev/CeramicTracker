import { useState, useRef } from "react";
import { Camera, Cog, RotateCcw, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { processImageWithOCR, createManualEntry } from "@/lib/ocr";
import { useToast } from "@/hooks/use-toast";

interface CameraCaptureProps {
  onDataExtracted: (data: any) => void;
}

export default function CameraCapture({ onDataExtracted }: CameraCaptureProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcessImage = async () => {
    if (!capturedImage) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const extractedData = await processImageWithOCR(capturedImage, (progress) => {
        setProgress(progress);
      });

      if (extractedData) {
        onDataExtracted(extractedData);
        toast({
          title: "Text Extraction Complete",
          description: "Customer information extracted. Please review and edit as needed.",
        });
      } else {
        toast({
          title: "Extraction Failed",
          description: "Unable to recognize text. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("OCR processing error:", error);
      toast({
        title: "Processing Error",
        description: "An error occurred while processing the image.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleManualEntry = () => {
    const manualData = createManualEntry();
    onDataExtracted(manualData);
    toast({
      title: "Manual Entry Mode",
      description: "Please fill in the customer information manually.",
    });
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Camera className="text-primary" size={32} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Capture Customer Info</h2>
          <p className="text-slate-600 text-sm">
            Take a photo of customer information form<br />to automatically extract data
          </p>
        </div>

        {/* Camera Input */}
        {!capturedImage && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              onClick={handleCameraClick}
              className="w-full bg-primary hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200"
              size="lg"
            >
              <Camera className="mr-3" size={20} />
              Take Photo
            </Button>
            
            <div className="text-center">
              <span className="text-slate-400 text-sm">or</span>
            </div>
            
            <Button
              onClick={handleManualEntry}
              variant="outline"
              className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 font-medium py-4 px-6 rounded-xl transition-colors duration-200"
              size="lg"
            >
              <Edit className="mr-3" size={20} />
              Enter Manually
            </Button>
          </div>
        )}

        {/* Image Preview */}
        {capturedImage && !isProcessing && (
          <div className="mt-4">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-4">
              <img
                src={capturedImage}
                className="w-full rounded-lg shadow-sm"
                alt="Captured image preview"
              />
              <div className="mt-3 flex space-x-2">
                <Button
                  onClick={handleProcessImage}
                  className="flex-1 bg-secondary hover:bg-emerald-700 text-white font-medium"
                >
                  <Cog className="mr-2" size={16} />
                  Extract Text
                </Button>
                <Button
                  onClick={handleRetake}
                  variant="outline"
                  className="flex-1 bg-slate-500 hover:bg-slate-600 text-white font-medium"
                >
                  <RotateCcw className="mr-2" size={16} />
                  Retake Photo
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Processing Status */}
        {isProcessing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-primary font-medium">
                {progress < 20 ? "Preprocessing image..." : 
                 progress < 40 ? "Initializing OCR..." : 
                 progress < 90 ? "Reading text..." : "Processing data..."}
              </span>
            </div>
            <div className="mt-2 bg-blue-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="mt-2 text-center text-xs text-slate-600">
              {progress}% complete
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
