import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, Search, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageZoom } from "@/components/ui/image-zoom";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getImageUrl } from "@/lib/image-utils";
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

      // Show camera UI first
      setCameraActive(true);

      let stream;
      try {
        // Try with environment camera first, fallback to any camera
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
      } catch (envError) {
        // Fallback to any available camera
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: true 
        });
      }

      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to load and then play
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play();
            toast({
              title: "Camera Started",
              description: "Camera is now active. Position the image and tap capture.",
            });
          } catch (playError) {
            console.error("Video play error:", playError);
            // Try to play without waiting
            videoRef.current?.play().catch(() => {
              // Silent fail, camera might still work
            });
          }
        };

        // Also try to play immediately in case metadata is already loaded
        try {
          await videoRef.current.play();
        } catch (immediatePlayError) {
          // This is expected on some devices, onloadedmetadata will handle it
        }
      }
    } catch (error) {
      setCameraActive(false);
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
    if (!videoRef.current || !canvasRef.current) {
      toast({
        title: "Camera Error",
        description: "Camera not ready. Please try again.",
        variant: "destructive"
      });
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    // Ensure video has dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast({
        title: "Camera Error", 
        description: "Video not ready. Please wait a moment and try again.",
        variant: "destructive"
      });
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw the current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to base64 image data
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageData);
      stopCamera();
      
      toast({
        title: "Photo Captured",
        description: "Image captured successfully. Ready to search.",
      });
    } else {
      toast({
        title: "Camera Error",
        description: "Unable to process photo. Please try again.",
        variant: "destructive"
      });
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
          const imageUrl = getImageUrl(customer.customerImage);
          if (imageUrl) {
            const similarity = await compareImages(capturedImage, imageUrl);

            if (similarity > 0.45) { // Raised threshold for pottery-specific matching
              matches.push({
                customer,
                similarity,
                matchType: 'customer'
              });
            }
          }
        }
        
        // Check work image
        if (customer.workImage) {
          const imageUrl = getImageUrl(customer.workImage);
          if (imageUrl) {
            const similarity = await compareImages(capturedImage, imageUrl);

            if (similarity > 0.45) { // Raised threshold for pottery-specific matching
              matches.push({
                customer,
                similarity,
                matchType: 'work'
              });
            }
          }
        }
      }

      // Sort by similarity (highest first) - Perfect matches first, then high matches
      matches.sort((a, b) => {
        // Perfect matches (90%+) come first
        const aPerfect = a.similarity >= 0.9;
        const bPerfect = b.similarity >= 0.9;
        if (aPerfect && !bPerfect) return -1;
        if (!aPerfect && bPerfect) return 1;
        
        // Then sort by similarity within each group
        return b.similarity - a.similarity;
      });
      
      setMatches(matches.slice(0, 15)); // Show top 15 matches
      
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

  // Enhanced image comparison using multiple techniques optimized for pottery
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
        
        // Use larger size for better comparison - increased for pottery details
        const size = 128;
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
        
        // Pottery-specific analysis
        const shapeContourSimilarity = compareShapeContours(data1, data2, size);
        const patternSimilarity = comparePatterns(data1, data2, size);
        const colorAdaptiveSimilarity = compareColorAdaptive(data1, data2);
        const glazeTextureSimilarity = compareGlazeTexture(data1, data2, size);
        const proportionSimilarity = compareProportions(data1, data2, size);
        const surfaceDetailSimilarity = compareSurfaceDetails(data1, data2, size);
        const symmetrySimilarity = compareSymmetry(data1, data2, size);
        
        // Weighted combination optimized for pottery recognition
        const combinedSimilarity = (
          shapeContourSimilarity * 0.35 +     // Shape outline (most important)
          patternSimilarity * 0.25 +          // Surface patterns/decorations
          colorAdaptiveSimilarity * 0.15 +    // Color accounting for firing changes
          glazeTextureSimilarity * 0.10 +     // Glaze texture
          proportionSimilarity * 0.08 +       // Height/width proportions
          surfaceDetailSimilarity * 0.05 +    // Fine surface details
          symmetrySimilarity * 0.02           // Symmetry characteristics
        );
        
        resolve(Math.max(0, Math.min(1, combinedSimilarity)));
      };
      
      // Shape contour comparison - most important for pottery
      const compareShapeContours = (data1: Uint8ClampedArray, data2: Uint8ClampedArray, size: number): number => {
        const contour1 = extractContour(data1, size);
        const contour2 = extractContour(data2, size);
        
        if (contour1.length === 0 || contour2.length === 0) return 0;
        
        // Normalize contours to same scale
        const normalizedContour1 = normalizeContour(contour1);
        const normalizedContour2 = normalizeContour(contour2);
        
        // Compare contour shapes using Fourier descriptors
        const fourier1 = computeFourierDescriptors(normalizedContour1);
        const fourier2 = computeFourierDescriptors(normalizedContour2);
        
        return compareFourierDescriptors(fourier1, fourier2);
      };
      
      // Extract object contour/outline
      const extractContour = (data: Uint8ClampedArray, size: number): Array<{x: number, y: number}> => {
        const contour: Array<{x: number, y: number}> = [];
        
        // Convert to binary mask first
        const threshold = 128;
        const binary = new Array(size * size).fill(0);
        
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          binary[i / 4] = gray > threshold ? 1 : 0;
        }
        
        // Find contour using edge detection
        for (let y = 1; y < size - 1; y++) {
          for (let x = 1; x < size - 1; x++) {
            const idx = y * size + x;
            
            if (binary[idx] === 1) {
              // Check if this is an edge pixel
              const neighbors = [
                binary[idx - 1], binary[idx + 1],
                binary[idx - size], binary[idx + size]
              ];
              
              if (neighbors.some(n => n === 0)) {
                contour.push({x, y});
              }
            }
          }
        }
        
        return contour;
      };
      
      // Normalize contour to standard scale
      const normalizeContour = (contour: Array<{x: number, y: number}>): Array<{x: number, y: number}> => {
        if (contour.length === 0) return [];
        
        const minX = Math.min(...contour.map(p => p.x));
        const maxX = Math.max(...contour.map(p => p.x));
        const minY = Math.min(...contour.map(p => p.y));
        const maxY = Math.max(...contour.map(p => p.y));
        
        const scaleX = maxX - minX;
        const scaleY = maxY - minY;
        
        if (scaleX === 0 || scaleY === 0) return contour;
        
        return contour.map(p => ({
          x: (p.x - minX) / scaleX,
          y: (p.y - minY) / scaleY
        }));
      };
      
      // Simple Fourier descriptors for shape comparison
      const computeFourierDescriptors = (contour: Array<{x: number, y: number}>): number[] => {
        const descriptors: number[] = [];
        const n = Math.min(contour.length, 32); // Use first 32 points
        
        for (let k = 0; k < 8; k++) { // 8 descriptors
          let real = 0, imag = 0;
          
          for (let j = 0; j < n; j++) {
            const angle = -2 * Math.PI * k * j / n;
            const complex = contour[j].x + contour[j].y;
            real += complex * Math.cos(angle);
            imag += complex * Math.sin(angle);
          }
          
          descriptors.push(Math.sqrt(real * real + imag * imag) / n);
        }
        
        return descriptors;
      };
      
      // Compare Fourier descriptors
      const compareFourierDescriptors = (desc1: number[], desc2: number[]): number => {
        let similarity = 0;
        const len = Math.min(desc1.length, desc2.length);
        
        for (let i = 0; i < len; i++) {
          const diff = Math.abs(desc1[i] - desc2[i]);
          similarity += Math.exp(-diff * 2); // Exponential decay for differences
        }
        
        return similarity / len;
      };

      // Pattern recognition for pottery decorations
      const comparePatterns = (data1: Uint8ClampedArray, data2: Uint8ClampedArray, size: number): number => {
        const patterns1 = extractPatterns(data1, size);
        const patterns2 = extractPatterns(data2, size);
        
        return comparePatternSets(patterns1, patterns2);
      };
      
      // Extract repeating patterns
      const extractPatterns = (data: Uint8ClampedArray, size: number): number[] => {
        const patterns: number[] = [];
        const blockSize = 8;
        
        for (let y = 0; y < size - blockSize; y += blockSize) {
          for (let x = 0; x < size - blockSize; x += blockSize) {
            let variance = 0;
            let mean = 0;
            
            // Calculate block statistics
            for (let dy = 0; dy < blockSize; dy++) {
              for (let dx = 0; dx < blockSize; dx++) {
                const idx = ((y + dy) * size + (x + dx)) * 4;
                const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                mean += gray;
              }
            }
            mean /= (blockSize * blockSize);
            
            for (let dy = 0; dy < blockSize; dy++) {
              for (let dx = 0; dx < blockSize; dx++) {
                const idx = ((y + dy) * size + (x + dx)) * 4;
                const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                variance += Math.pow(gray - mean, 2);
              }
            }
            variance /= (blockSize * blockSize);
            
            patterns.push(variance);
          }
        }
        
        return patterns;
      };
      
      // Compare pattern sets
      const comparePatternSets = (patterns1: number[], patterns2: number[]): number => {
        const len = Math.min(patterns1.length, patterns2.length);
        if (len === 0) return 0;
        
        let similarity = 0;
        for (let i = 0; i < len; i++) {
          const diff = Math.abs(patterns1[i] - patterns2[i]);
          similarity += Math.exp(-diff / 1000); // Normalize by typical variance
        }
        
        return similarity / len;
      };

      // Color adaptive comparison accounting for firing changes
      const compareColorAdaptive = (data1: Uint8ClampedArray, data2: Uint8ClampedArray): number => {
        const hist1 = buildColorHistogram(data1);
        const hist2 = buildColorHistogram(data2);
        
        // Compare base colors and account for darkening/lightening
        let bestMatch = 0;
        
        // Try different brightness adjustments (-50 to +50)
        for (let adjust = -50; adjust <= 50; adjust += 10) {
          const adjustedHist = adjustHistogram(hist1, adjust);
          const match = compareHistograms(adjustedHist, hist2);
          bestMatch = Math.max(bestMatch, match);
        }
        
        return bestMatch;
      };
      
      // Build detailed color histogram
      const buildColorHistogram = (data: Uint8ClampedArray): number[] => {
        const hist = new Array(256).fill(0);
        
        for (let i = 0; i < data.length; i += 4) {
          const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          hist[gray]++;
        }
        
        // Normalize
        const total = data.length / 4;
        return hist.map(h => h / total);
      };
      
      // Adjust histogram for brightness changes
      const adjustHistogram = (hist: number[], adjust: number): number[] => {
        const adjusted = new Array(256).fill(0);
        
        for (let i = 0; i < hist.length; i++) {
          const newIndex = Math.max(0, Math.min(255, i + adjust));
          adjusted[newIndex] += hist[i];
        }
        
        return adjusted;
      };
      
      // Compare histograms
      const compareHistograms = (hist1: number[], hist2: number[]): number => {
        let intersection = 0;
        for (let i = 0; i < Math.min(hist1.length, hist2.length); i++) {
          intersection += Math.min(hist1[i], hist2[i]);
        }
        return intersection;
      };

      // Glaze texture comparison
      const compareGlazeTexture = (data1: Uint8ClampedArray, data2: Uint8ClampedArray, size: number): number => {
        const texture1 = computeGlazeTexture(data1, size);
        const texture2 = computeGlazeTexture(data2, size);
        
        // Compare texture features
        const smoothnessDiff = Math.abs(texture1.smoothness - texture2.smoothness);
        const glossinessDiff = Math.abs(texture1.glossiness - texture2.glossiness);
        const grainDiff = Math.abs(texture1.grain - texture2.grain);
        
        const similarity = 1 - (smoothnessDiff + glossinessDiff + grainDiff) / 3;
        return Math.max(0, similarity);
      };
      
      // Compute glaze texture features
      const computeGlazeTexture = (data: Uint8ClampedArray, size: number) => {
        let smoothness = 0;
        let glossiness = 0;
        let grain = 0;
        let count = 0;
        
        for (let y = 1; y < size - 1; y++) {
          for (let x = 1; x < size - 1; x++) {
            const idx = (y * size + x) * 4;
            const center = data[idx] + data[idx + 1] + data[idx + 2];
            
            // Calculate local variance (smoothness)
            const neighbors = [
              data[idx - 4] + data[idx - 3] + data[idx - 2],
              data[idx + 4] + data[idx + 5] + data[idx + 6],
              data[idx - size * 4] + data[idx - size * 4 + 1] + data[idx - size * 4 + 2],
              data[idx + size * 4] + data[idx + size * 4 + 1] + data[idx + size * 4 + 2]
            ];
            
            const variance = neighbors.reduce((sum, n) => sum + Math.pow(n - center, 2), 0) / 4;
            smoothness += 1 / (1 + variance / 1000);
            
            // Glossiness based on brightness variation
            const brightness = center / 3;
            glossiness += brightness > 180 ? 1 : brightness / 180;
            
            // Grain based on high-frequency detail
            const highFreq = Math.abs(center - neighbors[0]) + Math.abs(center - neighbors[1]);
            grain += highFreq / 255;
            
            count++;
          }
        }
        
        return {
          smoothness: smoothness / count,
          glossiness: glossiness / count,
          grain: grain / count
        };
      };

      // Proportions comparison
      const compareProportions = (data1: Uint8ClampedArray, data2: Uint8ClampedArray, size: number): number => {
        const props1 = calculateProportions(data1, size);
        const props2 = calculateProportions(data2, size);
        
        const aspectDiff = Math.abs(props1.aspectRatio - props2.aspectRatio);
        const heightDiff = Math.abs(props1.relativeHeight - props2.relativeHeight);
        const widthDiff = Math.abs(props1.relativeWidth - props2.relativeWidth);
        
        return Math.max(0, 1 - (aspectDiff + heightDiff + widthDiff) / 3);
      };
      
      // Calculate object proportions
      const calculateProportions = (data: Uint8ClampedArray, size: number) => {
        let minX = size, maxX = 0, minY = size, maxY = 0;
        
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            
            if (gray > 128) { // Object pixel
              minX = Math.min(minX, x);
              maxX = Math.max(maxX, x);
              minY = Math.min(minY, y);
              maxY = Math.max(maxY, y);
            }
          }
        }
        
        const width = maxX - minX;
        const height = maxY - minY;
        
        return {
          aspectRatio: width > 0 ? height / width : 1,
          relativeHeight: height / size,
          relativeWidth: width / size
        };
      };

      // Surface detail comparison
      const compareSurfaceDetails = (data1: Uint8ClampedArray, data2: Uint8ClampedArray, size: number): number => {
        const details1 = extractSurfaceDetails(data1, size);
        const details2 = extractSurfaceDetails(data2, size);
        
        return compareDetailSets(details1, details2);
      };
      
      // Extract fine surface details
      const extractSurfaceDetails = (data: Uint8ClampedArray, size: number): number[] => {
        const details: number[] = [];
        
        for (let y = 2; y < size - 2; y++) {
          for (let x = 2; x < size - 2; x++) {
            const idx = (y * size + x) * 4;
            const center = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            
            // Local detail measure using Laplacian
            const laplacian = 
              -4 * center +
              (0.299 * data[idx - 4] + 0.587 * data[idx - 3] + 0.114 * data[idx - 2]) +
              (0.299 * data[idx + 4] + 0.587 * data[idx + 5] + 0.114 * data[idx + 6]) +
              (0.299 * data[idx - size * 4] + 0.587 * data[idx - size * 4 + 1] + 0.114 * data[idx - size * 4 + 2]) +
              (0.299 * data[idx + size * 4] + 0.587 * data[idx + size * 4 + 1] + 0.114 * data[idx + size * 4 + 2]);
            
            details.push(Math.abs(laplacian));
          }
        }
        
        return details;
      };
      
      // Compare detail sets
      const compareDetailSets = (details1: number[], details2: number[]): number => {
        const len = Math.min(details1.length, details2.length);
        if (len === 0) return 0;
        
        let similarity = 0;
        for (let i = 0; i < len; i++) {
          const diff = Math.abs(details1[i] - details2[i]);
          similarity += Math.exp(-diff / 50);
        }
        
        return similarity / len;
      };

      // Symmetry comparison
      const compareSymmetry = (data1: Uint8ClampedArray, data2: Uint8ClampedArray, size: number): number => {
        const sym1 = measureSymmetry(data1, size);
        const sym2 = measureSymmetry(data2, size);
        
        return 1 - Math.abs(sym1 - sym2);
      };
      
      // Measure vertical symmetry
      const measureSymmetry = (data: Uint8ClampedArray, size: number): number => {
        let symmetryScore = 0;
        let count = 0;
        
        const mid = Math.floor(size / 2);
        
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < mid; x++) {
            const leftIdx = (y * size + x) * 4;
            const rightIdx = (y * size + (size - 1 - x)) * 4;
            
            const leftGray = 0.299 * data[leftIdx] + 0.587 * data[leftIdx + 1] + 0.114 * data[leftIdx + 2];
            const rightGray = 0.299 * data[rightIdx] + 0.587 * data[rightIdx + 1] + 0.114 * data[rightIdx + 2];
            
            const diff = Math.abs(leftGray - rightGray);
            symmetryScore += 1 - (diff / 255);
            count++;
          }
        }
        
        return count > 0 ? symmetryScore / count : 0;
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
      
      // Edge pattern comparison for detecting shapes and outlines
      const compareEdgePatterns = (data1: Uint8ClampedArray, data2: Uint8ClampedArray, size: number): number => {
        const edges1 = detectEdges(data1, size);
        const edges2 = detectEdges(data2, size);
        
        let matchingEdges = 0;
        let totalEdges = 0;
        
        for (let i = 0; i < edges1.length; i++) {
          if (edges1[i] > 50 || edges2[i] > 50) { // Consider as edge if above threshold
            totalEdges++;
            const edgeDiff = Math.abs(edges1[i] - edges2[i]);
            if (edgeDiff < 100) { // Similar edge strength
              matchingEdges++;
            }
          }
        }
        
        return totalEdges > 0 ? matchingEdges / totalEdges : 0;
      };
      
      // Simple edge detection using Sobel-like operator
      const detectEdges = (data: Uint8ClampedArray, size: number): number[] => {
        const edges = new Array(size * size).fill(0);
        
        for (let y = 1; y < size - 1; y++) {
          for (let x = 1; x < size - 1; x++) {
            const idx = (y * size + x) * 4;
            
            // Convert to grayscale
            const center = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            
            // Get surrounding pixels
            const left = 0.299 * data[idx - 4] + 0.587 * data[idx - 3] + 0.114 * data[idx - 2];
            const right = 0.299 * data[idx + 4] + 0.587 * data[idx + 5] + 0.114 * data[idx + 6];
            const top = 0.299 * data[idx - size * 4] + 0.587 * data[idx - size * 4 + 1] + 0.114 * data[idx - size * 4 + 2];
            const bottom = 0.299 * data[idx + size * 4] + 0.587 * data[idx + size * 4 + 1] + 0.114 * data[idx + size * 4 + 2];
            
            // Simple edge detection
            const gx = Math.abs(right - left);
            const gy = Math.abs(bottom - top);
            const magnitude = Math.sqrt(gx * gx + gy * gy);
            
            edges[y * size + x] = magnitude;
          }
        }
        
        return edges;
      };
      
      // Texture comparison for surface patterns
      const compareTexture = (data1: Uint8ClampedArray, data2: Uint8ClampedArray, size: number): number => {
        const texture1 = calculateTexture(data1, size);
        const texture2 = calculateTexture(data2, size);
        
        // Compare texture features
        const contrastDiff = Math.abs(texture1.contrast - texture2.contrast) / 255;
        const homogeneityDiff = Math.abs(texture1.homogeneity - texture2.homogeneity);
        const energyDiff = Math.abs(texture1.energy - texture2.energy);
        
        const avgDiff = (contrastDiff + homogeneityDiff + energyDiff) / 3;
        return Math.max(0, 1 - avgDiff);
      };
      
      // Calculate texture features
      const calculateTexture = (data: Uint8ClampedArray, size: number) => {
        let contrast = 0;
        let homogeneity = 0;
        let energy = 0;
        let count = 0;
        
        for (let y = 0; y < size - 1; y++) {
          for (let x = 0; x < size - 1; x++) {
            const idx1 = (y * size + x) * 4;
            const idx2 = (y * size + (x + 1)) * 4;
            const idx3 = ((y + 1) * size + x) * 4;
            
            const gray1 = 0.299 * data[idx1] + 0.587 * data[idx1 + 1] + 0.114 * data[idx1 + 2];
            const gray2 = 0.299 * data[idx2] + 0.587 * data[idx2 + 1] + 0.114 * data[idx2 + 2];
            const gray3 = 0.299 * data[idx3] + 0.587 * data[idx3 + 1] + 0.114 * data[idx3 + 2];
            
            const diff1 = Math.abs(gray1 - gray2);
            const diff2 = Math.abs(gray1 - gray3);
            
            contrast += (diff1 + diff2) / 2;
            homogeneity += 1 / (1 + (diff1 + diff2) / 2);
            energy += Math.pow((gray1 + gray2 + gray3) / 3, 2);
            count++;
          }
        }
        
        return {
          contrast: contrast / count,
          homogeneity: homogeneity / count,
          energy: Math.sqrt(energy / count) / 255
        };
      };
      
      // Basic shape comparison using moments
      const compareShapes = (data1: Uint8ClampedArray, data2: Uint8ClampedArray, size: number): number => {
        const moments1 = calculateMoments(data1, size);
        const moments2 = calculateMoments(data2, size);
        
        // Compare centralized moments (shape descriptors)
        const m1Diff = Math.abs(moments1.m20 - moments2.m20);
        const m2Diff = Math.abs(moments1.m02 - moments2.m02);
        const m3Diff = Math.abs(moments1.m11 - moments2.m11);
        
        const avgDiff = (m1Diff + m2Diff + m3Diff) / 3;
        return Math.max(0, 1 - (avgDiff / 10000)); // Normalize by expected range
      };
      
      // Calculate image moments for shape analysis
      const calculateMoments = (data: Uint8ClampedArray, size: number) => {
        let m00 = 0, m10 = 0, m01 = 0;
        
        // Calculate basic moments
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            
            m00 += gray;
            m10 += x * gray;
            m01 += y * gray;
          }
        }
        
        // Calculate centroids
        const cx = m00 > 0 ? m10 / m00 : 0;
        const cy = m00 > 0 ? m01 / m00 : 0;
        
        // Calculate central moments
        let m20 = 0, m02 = 0, m11 = 0;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            
            const dx = x - cx;
            const dy = y - cy;
            
            m20 += dx * dx * gray;
            m02 += dy * dy * gray;
            m11 += dx * dy * gray;
          }
        }
        
        return { m20, m02, m11 };
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

  const getMatchBadgeVariant = (similarity: number): "default" | "secondary" | "destructive" | "outline" => {
    if (similarity >= 0.85) return 'default'; // Excellent match - blue (85%+)
    if (similarity >= 0.70) return 'secondary'; // Good match - gray (70-84%)
    if (similarity >= 0.55) return 'outline'; // Fair match - outlined (55-69%)
    return 'destructive'; // Poor match - red (45-54%)
  };

  const getMatchDescription = (similarity: number) => {
    if (similarity >= 0.85) return 'Excellent Match';
    if (similarity >= 0.70) return 'Good Match';
    if (similarity >= 0.55) return 'Fair Match';
    return 'Possible Match';
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
              {/* Initial Controls - only show when no camera is active */}
              {!cameraActive && !capturedImage && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button 
                      onClick={startCamera} 
                      size="lg"
                      className="flex items-center gap-2 h-12"
                    >
                      <Camera className="h-5 w-5" />
                      Start Camera
                    </Button>
                    <Button 
                      onClick={() => fileInputRef.current?.click()} 
                      variant="outline"
                      size="lg"
                      className="flex items-center gap-2 h-12"
                    >
                      <Search className="h-5 w-5" />
                      Upload Image
                    </Button>
                  </div>

                  {/* Camera Permission Help */}
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
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Camera Video with Controls Below */}
              {cameraActive && (
                <div className="space-y-4">
                  {/* Video Feed */}
                  <div className="flex justify-center">
                    <div className="relative">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="max-w-full h-64 sm:h-80 rounded-lg border shadow-lg"
                        style={{ minHeight: '256px' }}
                      />
                      {/* Overlay instruction */}
                      <div className="absolute bottom-2 left-2 right-2 bg-black/70 text-white text-xs p-2 rounded">
                        Position the image in the frame and tap capture
                      </div>
                    </div>
                  </div>
                  
                  {/* Camera Controls Below Video */}
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button 
                      onClick={capturePhoto} 
                      size="lg"
                      className="flex items-center gap-2 h-12 bg-green-600 hover:bg-green-700"
                    >
                      <Camera className="h-5 w-5" />
                      Capture Photo
                    </Button>
                    <Button 
                      onClick={stopCamera} 
                      variant="outline"
                      size="lg"
                      className="flex items-center gap-2 h-12"
                    >
                      Stop Camera
                    </Button>
                    <Button 
                      onClick={() => fileInputRef.current?.click()} 
                      variant="outline"
                      size="lg"
                      className="flex items-center gap-2 h-12"
                    >
                      <Search className="h-5 w-5" />
                      Upload Instead
                    </Button>
                  </div>
                </div>
              )}

              {/* Reset button for captured image */}
              {capturedImage && (
                <div className="flex justify-center">
                  <Button onClick={resetSearch} variant="outline" size="lg" className="h-12">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Take New Photo
                  </Button>
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
                          <Badge variant={getMatchBadgeVariant(match.similarity)}>
                            {Math.round(match.similarity * 100)}% - {getMatchDescription(match.similarity)}
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
                              src={getImageUrl(match.customer.customerImage) || ''}
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
                              src={getImageUrl(match.customer.workImage) || ''}
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