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

// Simple placeholder function - returns manual entry template
export async function processImageWithOCR(
  imageSrc: string,
  onProgress: (progress: number) => void
): Promise<ExtractedData | null> {
  onProgress(100);
  return createManualEntry();
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
  
  // Clean and normalize the text
  const cleanText = text.replace(/[^\w\s@.-/#:]/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  console.log('Cleaned text for parsing:', cleanText);
  
  // Split into lines and words for better parsing
  const lines = text.split(/[\n\r]+/).map(line => line.trim()).filter(line => line.length > 0);
  const allText = text.replace(/\s+/g, ' ');
  
  console.log('Lines:', lines);
  
  // Look for labeled information using various patterns
  
  // Name extraction - look for "name:" label
  const namePatterns = [
    /name\s*:?\s*([a-zA-Z\s]{2,40})/i,
    /^name\s+([a-zA-Z\s]{2,40})/i
  ];
  
  for (const pattern of namePatterns) {
    const match = allText.match(pattern);
    if (match && match[1]) {
      data.name = match[1].trim();
      break;
    }
  }
  
  // If no labeled name found, look for name after first few words
  if (!data.name) {
    for (const line of lines) {
      const words = line.split(/\s+/);
      // Skip lines with numbers, emails, or symbols
      if (!/[\d@#]/.test(line) && words.length >= 2 && words.length <= 4) {
        const potential = words.join(' ');
        if (potential.length >= 4 && potential.length <= 40 && /^[a-zA-Z\s]+$/.test(potential)) {
          data.name = potential;
          break;
        }
      }
    }
  }
  
  // Phone number extraction - look for phone/phone# label and numbers
  const phonePatterns = [
    /phone\s*#?\s*:?\s*([0-9\s.()\-]{10,15})/i,
    /phone\s+([0-9\s.()\-]{10,15})/i,
    /([0-9]{3}[\s.\-]?[0-9]{3}[\s.\-]?[0-9]{4})/,
    /\(?([0-9]{3})\)?[\s.\-]*([0-9]{3})[\s.\-]*([0-9]{4})/
  ];
  
  for (const pattern of phonePatterns) {
    const match = allText.match(pattern);
    if (match) {
      let phoneDigits = '';
      if (match[1]) {
        phoneDigits = match[1].replace(/\D/g, '');
      } else if (match[2] && match[3]) {
        phoneDigits = match[1] + match[2] + match[3];
      }
      
      if (phoneDigits.length === 10) {
        data.phone = `(${phoneDigits.slice(0,3)}) ${phoneDigits.slice(3,6)}-${phoneDigits.slice(6)}`;
        break;
      }
    }
  }
  
  // Email extraction - look for email label
  const emailPatterns = [
    /email\s*:?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
  ];
  
  for (const pattern of emailPatterns) {
    const match = allText.match(pattern);
    if (match && match[1]) {
      data.email = match[1];
      break;
    }
  }
  
  // Date extraction - look for date label
  const datePatterns = [
    /date\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/,
    /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/
  ];
  
  for (const pattern of datePatterns) {
    const match = allText.match(pattern);
    if (match && match[1]) {
      const dateStr = match[1];
      const dateParts = dateStr.split(/[\/\-\.]/);
      
      if (dateParts.length === 3) {
        let [part1, part2, part3] = dateParts;
        
        // Check if it's YYYY-MM-DD format
        if (part1.length === 4) {
          data.workDate = `${part1}-${part2.padStart(2, '0')}-${part3.padStart(2, '0')}`;
        } else {
          // Assume MM/DD/YYYY format
          data.workDate = `${part3}-${part1.padStart(2, '0')}-${part2.padStart(2, '0')}`;
        }
        break;
      }
    }
  }
  
  console.log('Final parsed data:', data);
  return data;
}
