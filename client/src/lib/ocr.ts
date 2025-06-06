import { createWorker } from 'tesseract.js';

export interface ExtractedData {
  name: string;
  phone: string;
  email: string;
  workDate: string;
}

export function createManualEntry(): ExtractedData {
  return {
    name: '',
    phone: '',
    email: '',
    workDate: new Date().toISOString().split('T')[0]
  };
}

// Optimized OCR with better preprocessing
export async function processImageWithOCR(
  imageSrc: string,
  onProgress: (progress: number) => void
): Promise<ExtractedData | null> {
  try {
    onProgress(5);
    
    // Preprocess image for better OCR
    const processedImageSrc = await preprocessImage(imageSrc);
    onProgress(20);
    
    const worker = await createWorker('eng');
    onProgress(40);
    
    const { data: { text } } = await worker.recognize(processedImageSrc);
    await worker.terminate();
    onProgress(90);
    
    console.log('Raw OCR text:', text);
    
    const parsed = parseExtractedText(text);
    onProgress(100);
    
    // Always return something, even if empty
    return parsed || createManualEntry();
  } catch (error) {
    console.error('OCR failed:', error);
    onProgress(100);
    return createManualEntry();
  }
}

// Image preprocessing to improve OCR accuracy
async function preprocessImage(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      // Set canvas size
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Convert to grayscale and increase contrast
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        // Increase contrast
        const contrast = avg > 128 ? 255 : 0;
        data[i] = contrast;     // Red
        data[i + 1] = contrast; // Green
        data[i + 2] = contrast; // Blue
      }
      
      // Put processed image data back
      ctx.putImageData(imageData, 0, 0);
      
      // Return processed image as base64
      resolve(canvas.toDataURL());
    };
    
    img.src = imageSrc;
  });
}

function parseExtractedText(text: string): ExtractedData {
  const data: ExtractedData = {
    name: '',
    phone: '',
    email: '',
    workDate: new Date().toISOString().split('T')[0]
  };
  
  if (!text || text.trim().length === 0) {
    return data;
  }
  
  const cleanText = text.replace(/[^\w\s@.-]/g, ' ').replace(/\s+/g, ' ');
  console.log('Cleaned text:', cleanText);
  
  // Phone number detection (flexible patterns)
  const phoneRegex = /(\d{3}[\s.-]?\d{3}[\s.-]?\d{4})/;
  const phoneMatch = cleanText.match(phoneRegex);
  if (phoneMatch) {
    const digits = phoneMatch[1].replace(/\D/g, '');
    data.phone = `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  }
  
  // Email detection
  const emailRegex = /(\S+@\S+\.\w+)/;
  const emailMatch = cleanText.match(emailRegex);
  if (emailMatch) {
    data.email = emailMatch[1];
  }
  
  // Name detection (words that are likely names)
  const words = cleanText.split(/\s+/).filter(word => 
    word.length > 1 && 
    /^[A-Za-z]+$/.test(word) && 
    !word.includes('@')
  );
  
  // Try to find name patterns
  for (let i = 0; i < words.length - 1; i++) {
    const potential = `${words[i]} ${words[i + 1]}`;
    if (potential.length >= 4 && potential.length <= 40) {
      data.name = potential;
      break;
    }
  }
  
  // If no two-word name found, use first decent word
  if (!data.name && words.length > 0) {
    const firstWord = words.find(word => word.length >= 2 && word.length <= 20);
    if (firstWord) {
      data.name = firstWord;
    }
  }
  
  // Date detection
  const dateRegex = /(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/;
  const dateMatch = cleanText.match(dateRegex);
  if (dateMatch) {
    const dateParts = dateMatch[1].split(/[\/-]/);
    if (dateParts.length === 3) {
      // Assume MM/DD/YYYY format
      const [month, day, year] = dateParts;
      data.workDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  
  console.log('Parsed data:', data);
  return data;
}
