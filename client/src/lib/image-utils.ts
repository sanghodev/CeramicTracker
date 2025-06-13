// Helper functions for image handling

export function getImageUrl(filename: string | null | undefined): string | null {
  if (!filename) return null;
  
  // If it's already a full URL or base64, return as is
  if (filename.startsWith('http') || filename.startsWith('data:')) {
    return filename;
  }
  
  // Convert filename to URL
  return `/uploads/${filename}`;
}

export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith('http') || url.startsWith('data:') || url.startsWith('/uploads/');
}

// Upload image file to server
export async function uploadImageFile(file: File, type: 'work' | 'customer'): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('type', type);
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error('Failed to upload image');
  }
  
  const result = await response.json();
  return result.filename; // Return just the filename to store in database
}

// Convert base64 to blob for download
export function base64ToBlob(base64: string): Blob {
  const byteCharacters = atob(base64.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: 'image/jpeg' });
}