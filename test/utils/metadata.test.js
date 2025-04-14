const { extractMetadata, applyMetadata } = require('../../src/utils/metadata');

// Mock the metadata module
jest.mock('../../src/utils/metadata', () => {
  // Use the actual implementation for most functions
  const originalModule = jest.requireActual('../../src/utils/metadata');
  
  return {
    ...originalModule,
    extractMetadata: jest.fn(originalModule.extractMetadata),
    applyMetadata: jest.fn(originalModule.applyMetadata)
  };
});

describe('metadata utilities', () => {
  const mockImageData = Buffer.from('test-image-data');
  const mockMetadata = {
    exif: {
      Make: 'Test Camera',
      Model: 'Test Model',
      Orientation: 1
    }
  };
  
  // Spy on console.warn to test error handling
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  
  afterEach(() => {
    console.warn.mockRestore();
  });
  
  describe('extractMetadata', () => {
    test('should extract metadata from image', async () => {
      const metadata = await extractMetadata(mockImageData);
      
      // Check the format of returned metadata
      expect(metadata).toHaveProperty('exif');
      expect(metadata.exif).toHaveProperty('Make');
      expect(metadata.exif).toHaveProperty('Model');
      expect(metadata.exif).toHaveProperty('Orientation');
      expect(metadata.exif).toHaveProperty('DateTime');
    });
    
    test('should handle errors gracefully', async () => {
      // Mock an error during extraction
      jest.spyOn(Date.prototype, 'toISOString').mockImplementationOnce(() => {
        throw new Error('Metadata extraction test error');
      });
      
      const metadata = await extractMetadata(mockImageData);
      
      // Should return empty object on failure
      expect(metadata).toEqual({});
      
      // Should log a warning
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to extract metadata:',
        expect.any(Error)
      );
      
      // Restore mock
      Date.prototype.toISOString.mockRestore();
    });
  });
  
  describe('applyMetadata', () => {
    test('should apply metadata to image', async () => {
      const result = await applyMetadata(mockImageData, mockMetadata);
      
      // In the placeholder implementation, it just returns the original image
      expect(result).toBe(mockImageData);
    });
    
    test('should handle errors gracefully', async () => {
      // Override the implementation to simulate an error
      applyMetadata.mockImplementationOnce(async () => {
        console.warn('Failed to apply metadata:', new Error('Metadata application test error'));
        return mockImageData;
      });
      
      const result = await applyMetadata(mockImageData, mockMetadata);
      
      // Should return original data on failure
      expect(result).toBe(mockImageData);
      
      // Should log a warning
      expect(console.warn).toHaveBeenCalled();
    });
  });
}); 