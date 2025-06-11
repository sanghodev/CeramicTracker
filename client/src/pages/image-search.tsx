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
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
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
          if (similarity > 0.3) { // 30% similarity threshold
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
          if (similarity > 0.3) {
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

  // Basic image comparison using canvas pixel data
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
        
        // Resize images to same size for comparison
        const size = 100;
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
        
        // Calculate similarity using normalized cross-correlation
        let correlation = 0;
        const length = data1.length;
        
        for (let i = 0; i < length; i += 4) {
          const r1 = data1[i] / 255;
          const g1 = data1[i + 1] / 255;
          const b1 = data1[i + 2] / 255;
          
          const r2 = data2[i] / 255;
          const g2 = data2[i + 1] / 255;
          const b2 = data2[i + 2] / 255;
          
          // Simple correlation calculation
          correlation += (r1 * r2 + g1 * g2 + b1 * b2) / 3;
        }
        
        const similarity = correlation / (length / 4);
        resolve(Math.max(0, Math.min(1, similarity)));
      };
      
      image1.onload = () => {
        loadedCount++;
        processImages();
      };
      
      image2.onload = () => {
        loadedCount++;
        processImages();
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
                  variant="outline"
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