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
    const worker = await createWorker('kor+eng', 1, {
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
    
    // Phone number detection (Korean format)
    const phoneRegex = /(\d{3}[-\s]?\d{3,4}[-\s]?\d{4})/;
    const phoneMatch = cleanLine.match(phoneRegex);
    if (phoneMatch && !data.phone) {
      data.phone = phoneMatch[1].replace(/\s/g, '-');
    }
    
    // Email detection
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    const emailMatch = cleanLine.match(emailRegex);
    if (emailMatch && !data.email) {
      data.email = emailMatch[1];
    }
    
    // Name detection (Korean characters, 2-4 characters)
    const nameRegex = /^[가-힣]{2,4}$/;
    if (nameRegex.test(cleanLine) && !data.name && cleanLine.length <= 10) {
      data.name = cleanLine;
    }
    
    // Date detection (various formats)
    const dateRegex = /(\d{4}[-./]\d{1,2}[-./]\d{1,2})/;
    const dateMatch = cleanLine.match(dateRegex);
    if (dateMatch && !data.workDate) {
      const dateStr = dateMatch[1].replace(/[./]/g, '-');
      data.workDate = dateStr;
    }
  });

  return data;
}
