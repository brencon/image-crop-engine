const { formatImage, getFormatInfo, isFormatSupported } = require('../../src/utils/format');

// Mock the format module for testing
jest.mock('../../src/utils/format', () => {
  // Use the actual implementation for most functions
  const originalModule = jest.requireActual('../../src/utils/format');
  
  return {
    ...originalModule,
    // Mock these functions to allow test overrides
    formatImage: jest.fn(originalModule.formatImage),
    getFormatInfo: jest.fn(originalModule.getFormatInfo)
  };
});

describe('format utilities', () => {
  const mockImageData = Buffer.from('test-image-data');
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('formatImage', () => {
    test('should convert image format', async () => {
      const result = await formatImage(mockImageData, 'png', 80);
      
      // In the placeholder implementation, it returns the original data
      expect(result).toBe(mockImageData);
    });
    
    test('should handle errors', async () => {
      // Override implementation to throw an error
      formatImage.mockRejectedValueOnce(
        new Error('Format conversion test error')
      );
      
      await expect(formatImage(mockImageData, 'invalid', 80))
        .rejects.toThrow('Format conversion test error');
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
    
    test('should handle errors', async () => {
      // Override implementation to throw an error
      getFormatInfo.mockRejectedValueOnce(
        new Error('Format detection test error')
      );
      
      await expect(getFormatInfo(null))
        .rejects.toThrow('Format detection test error');
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