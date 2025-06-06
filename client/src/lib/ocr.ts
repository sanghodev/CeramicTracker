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

// Auto-format phone number as user types
export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  
  if (digits.length === 0) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Get suggested dates (today, tomorrow, common pottery class days)
export function getSuggestedDates(): { label: string; value: string }[] {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  const suggestions = [
    { label: 'Today', value: today.toISOString().split('T')[0] },
    { label: 'Tomorrow', value: tomorrow.toISOString().split('T')[0] },
    { label: 'Next Week', value: nextWeek.toISOString().split('T')[0] }
  ];
  
  return suggestions;
}

// OCR Space API for accurate text recognition
export async function processImageWithOCR(
  imageSrc: string,
  onProgress: (progress: number) => void
): Promise<ExtractedData | null> {
  try {
    onProgress(10);
    
    // Convert base64 to blob for upload
    const response = await fetch(imageSrc);
    const blob = await response.blob();
    
    onProgress(30);
    
    // Create form data for OCR Space API
    const formData = new FormData();
    formData.append('file', blob, 'image.jpg');
    formData.append('apikey', 'helloworld'); // Free API key
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    
    onProgress(50);
    
    // Call OCR Space API
    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData
    });
    
    onProgress(80);
    
    const result = await ocrResponse.json();
    
    if (result.ParsedResults && result.ParsedResults.length > 0) {
      const extractedText = result.ParsedResults[0].ParsedText;
      console.log('OCR Space extracted text:', extractedText);
      
      const parsed = parseExtractedText(extractedText);
      onProgress(100);
      return parsed;
    } else {
      console.log('No text found by OCR Space API');
      onProgress(100);
      return createManualEntry();
    }
  } catch (error) {
    console.error('OCR Space API failed:', error);
    onProgress(100);
    return createManualEntry();
  }
}

// Image preprocessing to improve OCR accuracy for form-like text
async function preprocessImage(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      // Scale up image for better recognition
      const scale = Math.max(1, 800 / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      // Draw scaled image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Convert to grayscale with moderate contrast adjustment
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        
        // Moderate contrast enhancement (not as aggressive as before)
        let enhanced;
        if (avg < 50) {
          enhanced = 0; // Very dark stays black
        } else if (avg > 200) {
          enhanced = 255; // Very light stays white
        } else {
          // Enhance contrast for middle values
          enhanced = avg < 128 ? Math.max(0, avg - 30) : Math.min(255, avg + 30);
        }
        
        data[i] = enhanced;     // Red
        data[i + 1] = enhanced; // Green
        data[i + 2] = enhanced; // Blue
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
  
  console.log('Raw extracted text:', text);
  
  // Split into lines for line-by-line analysis
  const lines = text.split(/[\n\r]+/).map(line => line.trim()).filter(line => line.length > 0);
  
  // Also prepare a single string version for pattern matching
  const singleLineText = text.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ');
  
  console.log('Processing lines:', lines);
  
  // Enhanced parsing for form labels like "Name:", "Phone#:", "Email:", "Date:"
  for (const line of lines) {
    const cleanLine = line.trim();
    
    // Name extraction - look for "Name:" followed by text
    if (/^name\s*:?\s*/i.test(cleanLine)) {
      const nameMatch = cleanLine.match(/^name\s*:?\s*(.+)/i);
      if (nameMatch && nameMatch[1]) {
        const potentialName = nameMatch[1].trim();
        // Validate it looks like a name (letters and spaces, reasonable length)
        if (/^[a-zA-Z\s]{2,50}$/.test(potentialName)) {
          data.name = potentialName;
          console.log('Found name:', data.name);
        }
      }
    }
    
    // Phone extraction - look for "Phone" or "Phone#:" followed by numbers
    if (/^phone\s*#?\s*:?\s*/i.test(cleanLine)) {
      const phoneMatch = cleanLine.match(/^phone\s*#?\s*:?\s*(.+)/i);
      if (phoneMatch && phoneMatch[1]) {
        const phoneText = phoneMatch[1].trim();
        const digits = phoneText.replace(/\D/g, '');
        if (digits.length === 10) {
          data.phone = `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
          console.log('Found phone:', data.phone);
        }
      }
    }
    
    // Email extraction - look for "Email:" followed by email address
    if (/^email\s*:?\s*/i.test(cleanLine)) {
      const emailMatch = cleanLine.match(/^email\s*:?\s*(.+)/i);
      if (emailMatch && emailMatch[1]) {
        const emailText = emailMatch[1].trim();
        const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
        const foundEmail = emailText.match(emailPattern);
        if (foundEmail) {
          data.email = foundEmail[1];
          console.log('Found email:', data.email);
        }
      }
    }
    
    // Date extraction - look for "Date:" followed by date
    if (/^date\s*:?\s*/i.test(cleanLine)) {
      const dateMatch = cleanLine.match(/^date\s*:?\s*(.+)/i);
      if (dateMatch && dateMatch[1]) {
        const dateText = dateMatch[1].trim();
        const datePattern = /(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/;
        const foundDate = dateText.match(datePattern);
        if (foundDate) {
          const dateParts = foundDate[1].split(/[\/-]/);
          if (dateParts.length === 3) {
            const [month, day, year] = dateParts;
            data.workDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            console.log('Found date:', data.workDate);
          }
        }
      }
    }
  }
  
  // Fallback: if no labeled data found, try to extract from anywhere in text
  if (!data.phone) {
    const phonePattern = /(\d{3}[\s.-]?\d{3}[\s.-]?\d{4})/;
    const phoneMatch = singleLineText.match(phonePattern);
    if (phoneMatch) {
      const digits = phoneMatch[1].replace(/\D/g, '');
      if (digits.length === 10) {
        data.phone = `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
        console.log('Found phone (fallback):', data.phone);
      }
    }
  }
  
  if (!data.email) {
    const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    const emailMatch = singleLineText.match(emailPattern);
    if (emailMatch) {
      data.email = emailMatch[1];
      console.log('Found email (fallback):', data.email);
    }
  }
  
  if (!data.name) {
    // Look for potential names (sequences of 2-4 words with only letters)
    for (const line of lines) {
      if (!/[\d@#:()]/.test(line)) { // Skip lines with numbers, symbols
        const words = line.split(/\s+/).filter(word => /^[a-zA-Z]+$/.test(word));
        if (words.length >= 2 && words.length <= 4) {
          const potentialName = words.join(' ');
          if (potentialName.length >= 4 && potentialName.length <= 50) {
            data.name = potentialName;
            console.log('Found name (fallback):', data.name);
            break;
          }
        }
      }
    }
  }
  
  console.log('Final parsed data:', data);
  return data;
}
