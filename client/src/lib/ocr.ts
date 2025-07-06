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

// Enhanced phone number formatting for all scenarios
export function formatPhoneNumber(value: string): string {
  if (!value) return '';
  
  const digits = value.replace(/[^\d]/g, '');
  
  if (digits.length === 0) return '';
  if (digits.length === 11 && digits.startsWith('010')) {
    // Korean mobile format: 010-XXXX-XXXX
    return `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`;
  } else if (digits.length === 10) {
    // US format: (XXX) XXX-XXXX
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  } else if (digits.length === 8) {
    // 8 digit format: XXXX-XXXX
    return `${digits.slice(0,4)}-${digits.slice(4)}`;
  } else if (digits.length === 9) {
    // 9 digit format: XXX-XXX-XXX
    return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`;
  } else if (digits.length <= 3) {
    return digits;
  } else if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  } else if (digits.length <= 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length >= 8 && digits.length <= 12) {
    // Keep original if reasonable length
    return value.trim();
  }
  
  return '';
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

// Advanced text preprocessing for better OCR recognition
function preprocessTextForRecognition(text: string): string {
  return text
    // Fix common OCR character confusions
    .replace(/[Il1|]/g, 'I')      // I/l/1/| confusion
    .replace(/[O0]/g, 'O')        // O/0 confusion
    .replace(/[5S]/g, 'S')        // S/5 confusion
    .replace(/[6G]/g, 'G')        // G/6 confusion
    .replace(/[B8]/g, 'B')        // B/8 confusion
    .replace(/[Z2]/g, 'Z')        // Z/2 confusion
    .replace(/[rn]/g, 'n')        // r/n confusion in lowercase
    .replace(/[cl]/g, 'c')        // c/l confusion
    // Fix spacing issues
    .replace(/\s+/g, ' ')         // Multiple spaces to single space
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')  // Add space between letters and numbers
    .replace(/(\d)([a-zA-Z])/g, '$1 $2')  // Add space between numbers and letters
    .trim();
}

// Advanced name recognition with partial occlusion handling
function extractNameIntelligently(text: string, lines: string[]): string {
  // Method 1: Look for explicit name labels with partial text
  const namePatterns = [
    /(?:ame|name|이름|성명|名前|nombre)\s*:?\s*([a-zA-Z가-힣\s\.\-]{1,50})/i,
    /(?:성명|이름)\s*:?\s*([a-zA-Z가-힣\s\.\-]{1,50})/i,
    /(?:Name|NAME)\s*:?\s*([a-zA-Z가-힣\s\.\-]{1,50})/i,
    /(?:ame|이름)\s*:?\s*([a-zA-Z가-힣\s\.\-]{1,50})/i,  // 'N' missing
    /(?:name|ame)\s*:?\s*([a-zA-Z가-힣\s\.\-]{1,50})/i,  // 'N' missing
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let name = match[1].trim();
      // Clean up the name
      name = name.replace(/^(name|ame|이름|성명|名前|nombre)\s*:?\s*/i, '').trim();
      if (name.length > 0 && name.length <= 50 && 
          !name.match(/^(phone|email|date|tel|mobile|010)$/i)) {
        return name;
      }
    }
  }
  
  // Method 2: Look for capitalized words that look like names
  const capitalizedWordsPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
  const capitalizedWords = text.match(capitalizedWordsPattern);
  if (capitalizedWords) {
    for (const word of capitalizedWords) {
      if (word.length >= 2 && word.length <= 50 && 
          !word.match(/^(Name|Phone|Email|Date|Tel|Mobile|January|February|March|April|May|June|July|August|September|October|November|December|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i)) {
        return word;
      }
    }
  }
  
  // Method 3: Look for Korean names
  const koreanNamePattern = /[가-힣]{2,4}/g;
  const koreanNames = text.match(koreanNamePattern);
  if (koreanNames) {
    for (const name of koreanNames) {
      if (name.length >= 2 && name.length <= 4) {
        return name;
      }
    }
  }
  
  // Method 4: Line-by-line analysis for names after labels
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check if this line contains a name label
    if (/(?:name|ame|이름|성명)/i.test(line)) {
      // Check current line for name after label
      const afterLabel = line.replace(/^.*(?:name|ame|이름|성명)\s*:?\s*/i, '').trim();
      if (afterLabel.length > 0 && afterLabel.length <= 50) {
        return afterLabel;
      }
      // Check next line for name
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine.length > 0 && nextLine.length <= 50 && 
            !nextLine.match(/^(phone|email|date|tel|mobile|010)/i)) {
          return nextLine;
        }
      }
    }
  }
  
  return '';
}

// Advanced phone number recognition with complete occlusion handling
function extractPhoneIntelligently(text: string, lines: string[]): string {
  // Method 1: Look for phone labels with partial text
  const phonePatterns = [
    /(?:hone|phone|tel|mobile|cell|휴대폰|전화|핸드폰|연락처)\s*#?\s*:?\s*([0-9\-\(\)\s\+]{8,20})/i,
    /(?:phone|hone|tel|mobile|cell|휴대폰|전화|핸드폰)\s*#?\s*:?\s*([0-9\-\(\)\s\+]{8,20})/i,
    /(?:Tel|TEL|Phone|PHONE)\s*#?\s*:?\s*([0-9\-\(\)\s\+]{8,20})/i,
  ];
  
  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const phoneText = match[1].trim();
      const formatted = formatPhoneNumber(phoneText);
      if (formatted) return formatted;
    }
  }
  
  // Method 2: Look for phone number patterns without labels
  const phoneNumberPatterns = [
    /010[-\s]?\d{4}[-\s]?\d{4}/g,           // Korean mobile
    /\+82[-\s]?10[-\s]?\d{4}[-\s]?\d{4}/g,  // Korean international
    /\b\d{3}[-\s]?\d{4}[-\s]?\d{4}\b/g,     // XXX-XXXX-XXXX
    /\b\d{3}[-\s]?\d{3}[-\s]?\d{4}\b/g,     // XXX-XXX-XXXX
    /\(\d{3}\)\s?\d{3}[-\s]?\d{4}/g,        // (XXX) XXX-XXXX
    /\b\d{10,11}\b/g                        // 10-11 digit numbers
  ];
  
  for (const pattern of phoneNumberPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        const digits = match.replace(/[^\d]/g, '');
        if (digits.length >= 8 && digits.length <= 11) {
          return formatPhoneNumber(match);
        }
      }
    }
  }
  
  // Method 3: Line-by-line analysis for phone numbers
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check if this line contains a phone label
    if (/(?:phone|hone|tel|mobile|cell|휴대폰|전화|핸드폰)/i.test(line)) {
      // Check current line for phone after label
      const afterLabel = line.replace(/^.*(?:phone|hone|tel|mobile|cell|휴대폰|전화|핸드폰)\s*#?\s*:?\s*/i, '').trim();
      if (afterLabel) {
        const formatted = formatPhoneNumber(afterLabel);
        if (formatted) return formatted;
      }
      // Check next line for phone
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const formatted = formatPhoneNumber(nextLine);
        if (formatted) return formatted;
      }
    }
  }
  
  // Method 4: Look for any sequence of digits that could be a phone number
  const digitSequences = text.match(/\d{8,11}/g);
  if (digitSequences) {
    for (const sequence of digitSequences) {
      if (sequence.length >= 8 && sequence.length <= 11) {
        return formatPhoneNumber(sequence);
      }
    }
  }
  
  return '';
}

// Enhanced email recognition with multi-line concatenation
function extractEmailIntelligently(text: string, lines: string[]): string {
  // Method 1: Look for complete emails in single line
  const emailPatterns = [
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    /([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,4})/g,
  ];
  
  for (const pattern of emailPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        const email = match.toLowerCase().trim();
        if (isValidEmail(email)) {
          return email;
        }
      }
    }
  }
  
  // Method 2: Handle multi-line emails (join lines and remove spaces)
  const fullText = lines.join('').replace(/\s+/g, '');
  const multilineEmailMatch = fullText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (multilineEmailMatch && isValidEmail(multilineEmailMatch[1])) {
    return multilineEmailMatch[1].toLowerCase();
  }
  
  // Method 3: Handle emails split across lines
  for (let i = 0; i < lines.length - 1; i++) {
    const currentLine = lines[i].trim();
    const nextLine = lines[i + 1].trim();
    
    // Check if current line has @ and next line has domain
    if (currentLine.includes('@') && /\.[a-zA-Z]{2,}/.test(nextLine)) {
      const combinedEmail = (currentLine + nextLine).replace(/\s+/g, '');
      const emailMatch = combinedEmail.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch && isValidEmail(emailMatch[1])) {
        return emailMatch[1].toLowerCase();
      }
    }
  }
  
  // Method 4: Fix common OCR errors and spacing issues
  const spacedText = text.replace(/\s+/g, ' ');
  const fixedText = spacedText
    .replace(/\s*@\s*/g, '@')     // Remove spaces around @
    .replace(/\s*\.\s*/g, '.')    // Remove spaces around .
    .replace(/at/gi, '@')         // Replace 'at' with @
    .replace(/dot/gi, '.')        // Replace 'dot' with .
    .replace(/\s+/g, '');         // Remove all spaces
  
  const fixedEmailMatch = fixedText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (fixedEmailMatch && isValidEmail(fixedEmailMatch[1])) {
    return fixedEmailMatch[1].toLowerCase();
  }
  
  return '';
}

// Google Vision API for accurate text recognition
export async function processImageWithOCR(
  imageSrc: string,
  onProgress: (progress: number) => void
): Promise<ExtractedData | null> {
  try {
    onProgress(10);
    
    // Extract base64 image data
    const base64Data = imageSrc.split(',')[1] || imageSrc;
    
    onProgress(30);
    
    // Call Google Vision API from server
    const response = await fetch('/api/vision/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Data
      })
    });
    
    onProgress(70);
    
    if (!response.ok) {
      throw new Error(`Vision API failed: ${response.status}`);
    }
    
    const result = await response.json();
    
    onProgress(90);
    
    if (result.text) {
      const parsed = parseExtractedText(result.text);
      onProgress(100);
      return parsed;
    } else {
      onProgress(100);
      return createManualEntry();
    }
  } catch (error) {
    onProgress(100);
    return createManualEntry();
  }
}

// Enhanced text parsing with intelligent recognition
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
  
  // Debug: log the extracted text
  console.log('OCR Extracted Text:', text);
  
  // Split into lines for line-by-line analysis
  const lines = text.split(/[\n\r]+/).map(line => line.trim()).filter(line => line.length > 0);
  
  // Enhanced text preprocessing for better recognition
  const preprocessedText = preprocessTextForRecognition(text);
  
  // Use intelligent extraction methods
  data.name = extractNameIntelligently(preprocessedText, lines);
  data.phone = extractPhoneIntelligently(preprocessedText, lines);
  data.email = extractEmailIntelligently(preprocessedText, lines);
  
  // Enhanced date extraction
  for (const line of lines) {
    const cleanLine = line.trim();
    
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
  
  // Log extraction results for debugging
  console.log('Intelligent extraction results:', {
    name: data.name,
    phone: data.phone,
    email: data.email,
    workDate: data.workDate
  });
  
  return data;
}