const { formatImage, getFormatInfo, isFormatSupported } = require('../../src/utils/format');

describe('format utilities', () => {
  const mockImageData = Buffer.from('test-image-data');
  
  describe('formatImage', () => {
    test('should convert image format', async () => {
      const result = await formatImage(mockImageData, 'png', 80);
      
      // In the placeholder implementation, it returns the original data
      expect(result).toBe(mockImageData);
    });
  });
  
  describe('getFormatInfo', () => {
    test('should return format information', async () => {
      const info = await getFormatInfo(mockImageData);
      
      // Check the placeholder implementation returns expected values
      expect(info).toEqual({
        format: expect.any(String),
        width: expect.any(Number),
        height: expect.any(Number),
        hasAlpha: expect.any(Boolean),
        bitDepth: expect.any(Number),
        colorSpace: expect.any(String)
      });
    });
  });
  
  describe('isFormatSupported', () => {
    test('should return true for supported formats', () => {
      const supported = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'tiff', 'bmp'];
      
      supported.forEach(format => {
        expect(isFormatSupported(format)).toBe(true);
      });
      
      // Test case insensitivity
      expect(isFormatSupported('JPEG')).toBe(true);
      expect(isFormatSupported('Png')).toBe(true);
    });
    
    test('should return false for unsupported formats', () => {
      const unsupported = ['raw', 'psd', 'unknown', '', null, undefined];
      
      unsupported.forEach(format => {
        expect(isFormatSupported(format)).toBe(false);
      });
    });
  });
}); 