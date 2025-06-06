import { createWorker } from 'tesseract.js';

interface ExtractedData {
  name: string;
  phone: string;
  email: string;
  workDate: string;
}

// Simple fallback function for manual entry when OCR fails
export function createManualEntry(): ExtractedData {
  return {
    name: '',
    phone: '',
    email: '',
    workDate: new Date().toISOString().split('T')[0]
  };
}

export async function processImageWithOCR(
  imageSrc: string,
  onProgress: (progress: number) => void
): Promise<ExtractedData | null> {
  try {
    onProgress(10);
    
    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          onProgress(Math.round(20 + m.progress * 60));
        }
      },
    });

    onProgress(25);

    // Skip parameter setting to avoid type issues and improve speed

    onProgress(30);

    const { data: { text } } = await worker.recognize(imageSrc);
    
    await worker.terminate();
    onProgress(100);

    console.log('Extracted text:', text);

    if (!text || text.trim().length === 0) {
      console.log('No text found, returning manual entry template');
      return createManualEntry();
    }

    const parsed = parseExtractedText(text);
    
    // If no useful data was extracted, return manual entry template
    if (!parsed.name && !parsed.phone && !parsed.email) {
      console.log('No useful data extracted, returning manual entry template');
      return createManualEntry();
    }
    
    return parsed;
  } catch (error) {
    console.error('OCR processing failed:', error);
    return createManualEntry();
  }
}

function parseExtractedText(text: string): ExtractedData {
  const lines = text.split(/[\n\r]+/).filter(line => line.trim());
  const allText = text.replace(/\s+/g, ' ').trim();
  
  const data: ExtractedData = {
    name: '',
    phone: '',
    email: '',
    workDate: new Date().toISOString().split('T')[0]
  };

  // Enhanced phone number detection (multiple US formats)
  const phonePatterns = [
    /\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/,
    /([0-9]{3})[-.\s]([0-9]{3})[-.\s]([0-9]{4})/,
    /\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/
  ];
  
  for (const pattern of phonePatterns) {
    const match = allText.match(pattern);
    if (match && !data.phone) {
      data.phone = `(${match[1]}) ${match[2]}-${match[3]}`;
      break;
    }
  }

  // Enhanced email detection
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  const emailMatch = allText.match(emailRegex);
  if (emailMatch) {
    data.email = emailMatch[1];
  }

  // Enhanced name detection
  lines.forEach(line => {
    const cleanLine = line.trim();
    
    // Skip lines that contain numbers, @ symbols, or are too short/long
    if (/[0-9@]/.test(cleanLine) || cleanLine.length < 2 || cleanLine.length > 40) {
      return;
    }
    
    // Look for patterns that suggest a name
    const namePatterns = [
      /^[A-Z][a-z]+\s+[A-Z][a-z]+$/, // First Last
      /^[A-Z][a-z]+\s+[A-Z]\.\s+[A-Z][a-z]+$/, // First M. Last
      /^[A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+$/, // First Middle Last
    ];
    
    for (const pattern of namePatterns) {
      if (pattern.test(cleanLine) && !data.name) {
        data.name = cleanLine;
        break;
      }
    }
  });

  // Date detection with multiple formats
  const datePatterns = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
    /(\d{1,2})-(\d{1,2})-(\d{4})/, // MM-DD-YYYY
    /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
    /(\d{1,2})\.(\d{1,2})\.(\d{4})/, // MM.DD.YYYY
  ];

  for (const pattern of datePatterns) {
    const match = allText.match(pattern);
    if (match) {
      const [, part1, part2, part3] = match;
      
      // Check if it's already in YYYY-MM-DD format
      if (part1.length === 4) {
        data.workDate = `${part1}-${part2.padStart(2, '0')}-${part3.padStart(2, '0')}`;
      } else {
        // Assume MM/DD/YYYY format and convert
        data.workDate = `${part3}-${part1.padStart(2, '0')}-${part2.padStart(2, '0')}`;
      }
      break;
    }
  }

  console.log('Parsed data:', data);
  return data;
}
