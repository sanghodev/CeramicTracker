import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, Search, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageZoom } from "@/components/ui/image-zoom";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Customer } from "@shared/schema";

interface ImageMatch {
  customer: Customer;
  similarity: number;
  matchType: 'customer' | 'work';
}

export default function ImageSearch() {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [matches, setMatches] = useState<ImageMatch[]>([]);

  // Get customers from last 3 months
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/customers");
      const allCustomers = await response.json();
      
      // Filter customers from last 3 months
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      return allCustomers.filter((customer: Customer) => 
        new Date(customer.createdAt) >= threeMonthsAgo &&
        (customer.customerImage || customer.workImage)
      );
    }
  });

  const startCamera = async () => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not supported by this browser");
      }

      // Try with environment camera first, fallback to any camera
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
      } catch (envError) {
        // Fallback to any available camera
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: true 
        });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        
        toast({
          title: "Camera Started",
          description: "Camera is now active. Position the image and tap capture.",
        });
      }
    } catch (error) {
      console.error("Camera error:", error);
      
      let errorMessage = "Unable to access camera. ";
      
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          errorMessage += "Please allow camera permissions in your browser settings and try again.";
        } else if (error.name === 'NotFoundError') {
          errorMessage += "No camera device found on this device.";
        } else if (error.name === 'NotSupportedError') {
          errorMessage += "Camera not supported by this browser. Try using a different browser.";
        } else {
          errorMessage += "Please check permissions and try again, or use the upload option.";
        }
      } else if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        errorMessage += "Camera requires HTTPS. Please use the upload option instead.";
      } else {
        errorMessage += "Please check permissions and try again, or use the upload option.";
      }
      
      toast({
        title: "Camera Access Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageData);
      stopCamera();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const searchSimilarImages = async () => {
    if (!capturedImage) return;

    setIsSearching(true);
    try {
      // Simple image comparison using basic image features
      const matches: ImageMatch[] = [];
      
      for (const customer of customers) {
        // Check customer image
        if (customer.customerImage) {
          const similarity = await compareImages(capturedImage, customer.customerImage);
          console.log(`Customer ${customer.name} (customer image): ${(similarity * 100).toFixed(1)}% similarity`);
          if (similarity > 0.15) { // Lowered threshold to 15%
            matches.push({
              customer,
              similarity,
              matchType: 'customer'
            });
          }
        }
        
        // Check work image
        if (customer.workImage) {
          const similarity = await compareImages(capturedImage, customer.workImage);
          console.log(`Customer ${customer.name} (work image): ${(similarity * 100).toFixed(1)}% similarity`);
          if (similarity > 0.15) { // Lowered threshold to 15%
            matches.push({
              customer,
              similarity,
              matchType: 'work'
            });
          }
        }
      }

      // Sort by similarity (highest first)
      matches.sort((a, b) => b.similarity - a.similarity);
      setMatches(matches.slice(0, 10)); // Show top 10 matches
      
      toast({
        title: "Search Complete",
        description: `Found ${matches.length} potential matches`,
      });
    } catch (error) {
      toast({
        title: "Search Error",
        description: "Unable to process image search",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Enhanced image comparison using multiple techniques
  const compareImages = async (img1: string, img2: string): Promise<number> => {
    return new Promise((resolve) => {
      const canvas1 = document.createElement('canvas');
      const canvas2 = document.createElement('canvas');
      const ctx1 = canvas1.getContext('2d');
      const ctx2 = canvas2.getContext('2d');
      
      const image1 = new Image();
      const image2 = new Image();
      
      let loadedCount = 0;
      


      const processImages = () => {
        if (loadedCount < 2) return;
        
        // Use larger size for better comparison
        const size = 64;
        canvas1.width = canvas2.width = size;
        canvas1.height = canvas2.height = size;
        
        ctx1?.drawImage(image1, 0, 0, size, size);
        ctx2?.drawImage(image2, 0, 0, size, size);
        
        const data1 = ctx1?.getImageData(0, 0, size, size).data;
        const data2 = ctx2?.getImageData(0, 0, size, size).data;
        
        if (!data1 || !data2) {
          resolve(0);
          return;
        }
        
        // Multiple comparison techniques
        const histogramSimilarity = compareHistograms(data1, data2);
        const structuralSimilarity = compareStructural(data1, data2, size);
        const colorSimilarity = compareColorDistribution(data1, data2);
        const pixelSimilarity = comparePixels(data1, data2);
        
        // Debug logging
        console.log('Similarity scores:', {
          histogram: histogramSimilarity.toFixed(3),
          structural: structuralSimilarity.toFixed(3),
          color: colorSimilarity.toFixed(3),
          pixel: pixelSimilarity.toFixed(3)
        });
        
        // Weighted combination of different similarities
        const combinedSimilarity = Math.max(
          histogramSimilarity * 0.3 +
          structuralSimilarity * 0.3 +
          colorSimilarity * 0.2 +
          pixelSimilarity * 0.2,
          // Use best individual score if combined is low
          Math.max(histogramSimilarity, structuralSimilarity, colorSimilarity, pixelSimilarity) * 0.7
        );
        
        resolve(Math.max(0, Math.min(1, combinedSimilarity)));
      };
      
      // Color histogram comparison
      const compareHistograms = (data1: Uint8ClampedArray, data2: Uint8ClampedArray): number => {
        const hist1 = new Array(256).fill(0);
        const hist2 = new Array(256).fill(0);
        
        for (let i = 0; i < data1.length; i += 4) {
          const gray1 = Math.round(0.299 * data1[i] + 0.587 * data1[i + 1] + 0.114 * data1[i + 2]);
          const gray2 = Math.round(0.299 * data2[i] + 0.587 * data2[i + 1] + 0.114 * data2[i + 2]);
          hist1[gray1]++;
          hist2[gray2]++;
        }
        
        // Normalize histograms
        const totalPixels = data1.length / 4;
        for (let i = 0; i < 256; i++) {
          hist1[i] /= totalPixels;
          hist2[i] /= totalPixels;
        }
        
        // Calculate intersection
        let intersection = 0;
        for (let i = 0; i < 256; i++) {
          intersection += Math.min(hist1[i], hist2[i]);
        }
        
        return intersection;
      };
      
      // Structural similarity (simplified SSIM)
      const compareStructural = (data1: Uint8ClampedArray, data2: Uint8ClampedArray, size: number): number => {
        let sumSquaredDiff = 0;
        let mean1 = 0, mean2 = 0;
        const totalPixels = data1.length / 4;
        
        // Calculate means
        for (let i = 0; i < data1.length; i += 4) {
          const gray1 = 0.299 * data1[i] + 0.587 * data1[i + 1] + 0.114 * data1[i + 2];
          const gray2 = 0.299 * data2[i] + 0.587 * data2[i + 1] + 0.114 * data2[i + 2];
          mean1 += gray1;
          mean2 += gray2;
        }
        mean1 /= totalPixels;
        mean2 /= totalPixels;
        
        // Calculate variance and covariance
        let var1 = 0, var2 = 0, covar = 0;
        for (let i = 0; i < data1.length; i += 4) {
          const gray1 = 0.299 * data1[i] + 0.587 * data1[i + 1] + 0.114 * data1[i + 2];
          const gray2 = 0.299 * data2[i] + 0.587 * data2[i + 1] + 0.114 * data2[i + 2];
          
          const diff1 = gray1 - mean1;
          const diff2 = gray2 - mean2;
          
          var1 += diff1 * diff1;
          var2 += diff2 * diff2;
          covar += diff1 * diff2;
        }
        
        var1 /= totalPixels;
        var2 /= totalPixels;
        covar /= totalPixels;
        
        // SSIM calculation
        const c1 = 0.01 * 255 * 0.01 * 255;
        const c2 = 0.03 * 255 * 0.03 * 255;
        
        const numerator = (2 * mean1 * mean2 + c1) * (2 * covar + c2);
        const denominator = (mean1 * mean1 + mean2 * mean2 + c1) * (var1 + var2 + c2);
        
        return denominator > 0 ? numerator / denominator : 0;
      };
      
      // Color distribution comparison
      const compareColorDistribution = (data1: Uint8ClampedArray, data2: Uint8ClampedArray): number => {
        let rSum1 = 0, gSum1 = 0, bSum1 = 0;
        let rSum2 = 0, gSum2 = 0, bSum2 = 0;
        const totalPixels = data1.length / 4;
        
        for (let i = 0; i < data1.length; i += 4) {
          rSum1 += data1[i];
          gSum1 += data1[i + 1];
          bSum1 += data1[i + 2];
          
          rSum2 += data2[i];
          gSum2 += data2[i + 1];
          bSum2 += data2[i + 2];
        }
        
        const avgR1 = rSum1 / totalPixels;
        const avgG1 = gSum1 / totalPixels;
        const avgB1 = bSum1 / totalPixels;
        
        const avgR2 = rSum2 / totalPixels;
        const avgG2 = gSum2 / totalPixels;
        const avgB2 = bSum2 / totalPixels;
        
        // Calculate color distance
        const colorDistance = Math.sqrt(
          Math.pow(avgR1 - avgR2, 2) +
          Math.pow(avgG1 - avgG2, 2) +
          Math.pow(avgB1 - avgB2, 2)
        );
        
        // Convert distance to similarity (0-1)
        const maxDistance = Math.sqrt(3 * 255 * 255);
        return 1 - (colorDistance / maxDistance);
      };
      
      image1.onload = () => {
        loadedCount++;
        processImages();
      };
      
      image2.onload = () => {
        loadedCount++;
        processImages();
      };
      
      image1.onerror = () => {
        resolve(0);
      };
      
      image2.onerror = () => {
        resolve(0);
      };
      
      image1.src = img1;
      image2.src = img2;
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "waiting": "outline",
      "In Progress": "secondary",
      "ready": "default", 
      "completed": "destructive"
    };
    return variants[status] || "outline";
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      "waiting": "Waiting",
      "In Progress": "In Progress",
      "ready": "Ready",
      "completed": "Completed"
    };
    return statusMap[status] || status;
  };

  const resetSearch = () => {
    setCapturedImage(null);
    setMatches([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="text-primary" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Image Search</h1>
          <p className="text-slate-600">Find customers by searching with photos</p>
        </div>

        {/* Camera/Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Capture or Upload Image
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Camera Controls */}
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {!cameraActive && !capturedImage && (
                    <Button onClick={startCamera} className="flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Start Camera
                    </Button>
                  )}
                  
                  {cameraActive && (
                    <>
                      <Button onClick={capturePhoto} className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        Capture Photo
                      </Button>
                      <Button onClick={stopCamera} variant="outline">
                        Stop Camera
                      </Button>
                    </>
                  )}
                  
                  <Button 
                    onClick={() => fileInputRef.current?.click()} 
                    variant={!cameraActive ? "default" : "outline"}
                    className="flex items-center gap-2"
                  >
                    <Search className="h-4 w-4" />
                    Upload Image
                  </Button>
                  
                  {capturedImage && (
                    <Button onClick={resetSearch} variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  )}
                </div>

                {/* Camera Permission Help */}
                {!cameraActive && !capturedImage && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-2">Camera Access Tips:</p>
                      <ul className="space-y-1 text-xs">
                        <li>• Click "Allow" when prompted for camera permissions</li>
                        <li>• For Chrome: Click the camera icon in the address bar to enable</li>
                        <li>• For Safari: Go to Settings → Privacy → Camera → Allow for this site</li>
                        <li>• If camera fails, use "Upload Image" to select photos from your device</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Camera Video */}
              {cameraActive && (
                <div className="flex justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="max-w-full h-64 rounded-lg border"
                  />
                </div>
              )}

              {/* Captured Image */}
              {capturedImage && (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="relative">
                      <img
                        src={capturedImage}
                        alt="Captured"
                        className="max-w-xs h-64 object-cover rounded-lg border"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <Button 
                      onClick={searchSimilarImages} 
                      disabled={isSearching || customers.length === 0}
                      className="flex items-center gap-2"
                    >
                      {isSearching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      {isSearching ? "Searching..." : "Search Similar Images"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Hidden canvas for image processing */}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </CardContent>
        </Card>

        {/* Database Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Searching in {customers.length} customer records from the last 3 months</span>
              <span>Images with customer photos or artwork</span>
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        {matches.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Results ({matches.length} matches)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {matches.map((match, index) => (
                  <div key={`${match.customer.id}-${match.matchType}`} className="border rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Customer Info */}
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-slate-800">{match.customer.name}</h3>
                          <Badge variant={getStatusBadge(match.customer.status)}>
                            {getStatusText(match.customer.status)}
                          </Badge>
                          <Badge variant="secondary">
                            {Math.round(match.similarity * 100)}% Match
                          </Badge>
                          <Badge variant="outline">
                            {match.matchType === 'customer' ? 'Customer Photo' : 'Artwork Photo'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600">
                          <div>📞 {match.customer.phone}</div>
                          <div>📧 {match.customer.email || "No email"}</div>
                          <div>📅 {new Date(match.customer.workDate).toLocaleDateString('en-US')}</div>
                          <div>🕒 Registered: {new Date(match.customer.createdAt).toLocaleDateString('en-US')}</div>
                        </div>
                      </div>

                      {/* Matched Image */}
                      <div className="flex items-center gap-2">
                        {match.matchType === 'customer' && match.customer.customerImage && (
                          <div className="relative">
                            <ImageZoom
                              src={match.customer.customerImage}
                              alt={`${match.customer.name}'s customer photo`}
                              thumbnailClassName="w-20 h-20 border-2 border-blue-200 hover:border-blue-400 transition-colors"
                            />
                            <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                              Customer
                            </div>
                          </div>
                        )}
                        
                        {match.matchType === 'work' && match.customer.workImage && (
                          <div className="relative">
                            <ImageZoom
                              src={match.customer.workImage}
                              alt={`${match.customer.name}'s artwork`}
                              thumbnailClassName="w-20 h-20 border-2 border-green-200 hover:border-green-400 transition-colors"
                            />
                            <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                              Artwork
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Results */}
        {capturedImage && !isSearching && matches.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-slate-500">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No Similar Images Found</p>
                <p className="text-sm">Try capturing a different photo or check if the customer image is in the system.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}