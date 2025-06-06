import { createWorker } from 'tesseract.js';

interface ExtractedData {
  name: string;
  phone: string;
  email: string;
  workDate: string;
}

export async function processImageWithOCR(
  imageSrc: string,
  onProgress: (progress: number) => void
): Promise<ExtractedData | null> {
  try {
    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          onProgress(Math.round(m.progress * 100));
        }
      },
    });

    const { data: { text } } = await worker.recognize(imageSrc);
    await worker.terminate();

    if (!text || text.trim().length === 0) {
      return null;
    }

    return parseExtractedText(text);
  } catch (error) {
    console.error('OCR processing failed:', error);
    return null;
  }
}

function parseExtractedText(text: string): ExtractedData {
  const lines = text.split('\n').filter(line => line.trim());
  const data: ExtractedData = {
    name: '',
    phone: '',
    email: '',
    workDate: new Date().toISOString().split('T')[0]
  };

  lines.forEach(line => {
    const cleanLine = line.trim();
    
    // Phone number detection (US formats)
    const phoneRegex = /(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/;
    const phoneMatch = cleanLine.match(phoneRegex);
    if (phoneMatch && !data.phone) {
      data.phone = phoneMatch[1];
    }
    
    // Email detection
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    const emailMatch = cleanLine.match(emailRegex);
    if (emailMatch && !data.email) {
      data.email = emailMatch[1];
    }
    
    // Name detection (English names, 2-30 characters, letters, spaces, apostrophes, hyphens)
    const nameRegex = /^[A-Za-z\s\-']{2,30}$/;
    if (nameRegex.test(cleanLine) && !data.name && !cleanLine.includes('@') && !phoneRegex.test(cleanLine)) {
      data.name = cleanLine;
    }
    
    // Date detection (various formats: MM/DD/YYYY, MM-DD-YYYY, YYYY-MM-DD, etc.)
    const dateRegex = /(\d{1,2}[-./]\d{1,2}[-./]\d{4}|\d{4}[-./]\d{1,2}[-./]\d{1,2})/;
    const dateMatch = cleanLine.match(dateRegex);
    if (dateMatch && data.workDate === new Date().toISOString().split('T')[0]) {
      const dateStr = dateMatch[1].replace(/[./]/g, '-');
      // Convert MM/DD/YYYY to YYYY-MM-DD format if needed
      const dateParts = dateStr.split('-');
      if (dateParts[0].length === 2 && dateParts[2].length === 4) {
        data.workDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
      } else {
        data.workDate = dateStr;
      }
    }
  });

  return data;
}
