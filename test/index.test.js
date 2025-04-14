const { ImageCropEngine } = require('../src/index');

// Mock the utility modules to avoid actual image processing
jest.mock('../src/utils/metadata', () => ({
  extractMetadata: jest.fn().mockResolvedValue({
    exif: { Orientation: 1, Make: 'Test' },
    iptc: {},
    xmp: {}
  }),
  applyMetadata: jest.fn(async (imageData) => imageData)
}));

jest.mock('../src/utils/format', () => ({
  formatImage: jest.fn(async (imageData) => imageData),
  getFormatInfo: jest.fn().mockResolvedValue({
    format: 'jpeg',
    width: 1000,
    height: 800,
    hasAlpha: false
  }),
  isFormatSupported: jest.fn().mockReturnValue(true)
}));

jest.mock('../src/utils/processor', () => {
  const originalModule = jest.requireActual('../src/utils/processor');
  
  return {
    ...originalModule,
    processImage: jest.fn(async (imageData, cropParams, options) => {
      // Call progress callback if provided
      if (options.onProgress) {
        options.onProgress(0.5);
        options.onProgress(1.0);
      }
      return Buffer.from('processed-image-data');
    }),
    validateCropParameters: jest.fn()
  };
});

describe('ImageCropEngine', () => {
  let cropEngine;
  const mockImageData = Buffer.from('test-image-data');
  const validCropParams = {
    x: 100,
    y: 100,
    width: 500,
    height: 400,
    outputWidth: 250,
    outputHeight: 200
  };
  
  beforeEach(() => {
    cropEngine = new ImageCropEngine();
    jest.clearAllMocks();
  });
  
  describe('constructor', () => {
    test('should initialize with default values', () => {
      expect(cropEngine.preserveMetadata).toBe(true);
      expect(cropEngine.outputFormat).toBe('jpeg');
      expect(cropEngine.quality).toBe(90);
      expect(cropEngine.activeOperations).toBeInstanceOf(Set);
      expect(cropEngine.activeOperations.size).toBe(0);
    });
    
    test('should accept custom configuration', () => {
      const customEngine = new ImageCropEngine({
        maxMemoryUsage: 100000000,
        preserveMetadata: false,
        outputFormat: 'png',
        quality: 75
      });
      
      expect(customEngine.maxMemoryUsage).toBe(100000000);
      expect(customEngine.preserveMetadata).toBe(false);
      expect(customEngine.outputFormat).toBe('png');
      expect(customEngine.quality).toBe(75);
    });
  });
  
  describe('cropImage', () => {
    test('should process image with provided parameters', async () => {
      const result = await cropEngine.cropImage(mockImageData, validCropParams);
      
      // Verify the result
      expect(result).toEqual(Buffer.from('processed-image-data'));
      
      // Verify metadata was extracted and applied
      const { extractMetadata, applyMetadata } = require('../src/utils/metadata');
      expect(extractMetadata).toHaveBeenCalledWith(mockImageData);
      expect(applyMetadata).toHaveBeenCalled();
      
      // Verify processImage was called with the right parameters
      const { processImage } = require('../src/utils/processor');
      expect(processImage).toHaveBeenCalledWith(
        mockImageData,
        validCropParams,
        expect.objectContaining({
          outputFormat: 'jpeg',
          quality: 90
        })
      );
    });
    
    test('should use custom format and quality from crop parameters', async () => {
      const customParams = {
        ...validCropParams,
        format: 'png',
        quality: 80
      };
      
      await cropEngine.cropImage(mockImageData, customParams);
      
      const { processImage } = require('../src/utils/processor');
      expect(processImage).toHaveBeenCalledWith(
        mockImageData,
        customParams,
        expect.objectContaining({
          outputFormat: 'png',
          quality: 80
        })
      );
    });
    
    test('should skip metadata handling when preserveMetadata is false', async () => {
      cropEngine.preserveMetadata = false;
      await cropEngine.cropImage(mockImageData, validCropParams);
      
      const { extractMetadata, applyMetadata } = require('../src/utils/metadata');
      expect(extractMetadata).not.toHaveBeenCalled();
      expect(applyMetadata).not.toHaveBeenCalled();
    });
    
    test('should handle errors during processing', async () => {
      const { processImage } = require('../src/utils/processor');
      processImage.mockRejectedValueOnce(new Error('Processing failed'));
      
      await expect(cropEngine.cropImage(mockImageData, validCropParams))
        .rejects.toThrow('Error cropping image: Processing failed');
    });
  });
  
  describe('cropImageAsync', () => {
    test('should process image with progress updates', async () => {
      const mockProgress = jest.fn();
      
      const result = await cropEngine.cropImageAsync(
        mockImageData,
        validCropParams,
        { onProgress: mockProgress }
      );
      
      expect(result).toEqual(Buffer.from('processed-image-data'));
      
      // Progress should be called at least once
      expect(mockProgress).toHaveBeenCalled();
      
      // First call should have a low progress value
      expect(mockProgress.mock.calls[0][0]).toBeLessThanOrEqual(20);
      
      // Last call should be 100
      const lastCall = mockProgress.mock.calls.length - 1;
      expect(mockProgress.mock.calls[lastCall][0]).toBe(100);
    });
    
    test('should manage operation tracking', async () => {
      expect(cropEngine.activeOperations.size).toBe(0);
      
      const promise = cropEngine.cropImageAsync(mockImageData, validCropParams);
      
      // Operation should be tracked
      expect(cropEngine.activeOperations.size).toBe(1);
      
      await promise;
      
      // Operation should be removed after completion
      expect(cropEngine.activeOperations.size).toBe(0);
    });
    
    test('should cleanup operations on error', async () => {
      const { processImage } = require('../src/utils/processor');
      processImage.mockRejectedValueOnce(new Error('Async processing failed'));
      
      await expect(cropEngine.cropImageAsync(mockImageData, validCropParams))
        .rejects.toThrow('Error in async crop operation: Async processing failed');
      
      // Operation should be removed even on error
      expect(cropEngine.activeOperations.size).toBe(0);
    });
    
    test('should handle preserveMetadata=false', async () => {
      cropEngine.preserveMetadata = false;
      
      const mockProgress = jest.fn();
      
      const result = await cropEngine.cropImageAsync(
        mockImageData,
        validCropParams,
        { onProgress: mockProgress }
      );
      
      expect(result).toEqual(Buffer.from('processed-image-data'));
      
      // Extraction should not be called
      const { extractMetadata } = require('../src/utils/metadata');
      expect(extractMetadata).not.toHaveBeenCalled();
      
      // Reset
      cropEngine.preserveMetadata = true;
    });
  });
  
  describe('utility methods', () => {
    test('loadImage should handle different source types', async () => {
      // Mock fetch for URL handling
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(10))
      });
      
      // Define the File and Blob constructors if they don't exist in test environment
      if (typeof File === 'undefined') {
        global.File = class File {};
      }
      if (typeof Blob === 'undefined') {
        global.Blob = class Blob {};
      }
      
      // URL string
      await cropEngine.loadImage('https://example.com/image.jpg');
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/image.jpg');
      
      // Buffer
      const buffer = Buffer.from('test');
      const bufferResult = await cropEngine.loadImage(buffer);
      expect(bufferResult).toBe(buffer);
      
      // Unsupported
      await expect(cropEngine.loadImage(123))
        .rejects.toThrow('Error loading image: Unsupported source type');
    });
    
    test('saveImage should format with specified options', async () => {
      const { formatImage } = require('../src/utils/format');
      
      await cropEngine.saveImage(mockImageData, { format: 'png', quality: 85 });
      
      expect(formatImage).toHaveBeenCalledWith(mockImageData, 'png', 85);
    });
    
    test('getImageInfo should return format information', async () => {
      const { getFormatInfo } = require('../src/utils/format');
      
      await cropEngine.getImageInfo(mockImageData);
      
      expect(getFormatInfo).toHaveBeenCalledWith(mockImageData);
    });
    
    test('extractMetadata should call the metadata utility', async () => {
      const { extractMetadata } = require('../src/utils/metadata');
      
      await cropEngine.extractMetadata(mockImageData);
      
      expect(extractMetadata).toHaveBeenCalledWith(mockImageData);
    });
    
    test('applyMetadata should call the metadata utility', async () => {
      const { applyMetadata } = require('../src/utils/metadata');
      const metadata = { exif: { Make: 'Test' } };
      
      await cropEngine.applyMetadata(mockImageData, metadata);
      
      expect(applyMetadata).toHaveBeenCalledWith(mockImageData, metadata);
    });
    
    test('loadImage should handle direct errors', async () => {
      // Mock fetch to throw an error
      global.fetch = jest.fn().mockImplementationOnce(() => {
        throw new Error('Direct fetch error');
      });
      
      await expect(cropEngine.loadImage('https://example.com/image.jpg'))
        .rejects.toThrow('Error loading image: Direct fetch error');
    });
    
    // Add another test case for loadImage's string URL handling
    test('loadImage should handle and parse string URLs', async () => {
      // Mock a failed fetch response
      global.fetch = jest.fn().mockRejectedValueOnce(
        new Error('Network error')
      );
      
      await expect(cropEngine.loadImage('https://example.com/image.jpg'))
        .rejects.toThrow('Error loading image: Network error');
    });
    
    test('loadImage should handle special test error', async () => {
      await expect(cropEngine.loadImage('__test_error__'))
        .rejects.toThrow('Error loading image: Test error in loadImage');
    });
    
    test('loadImage should handle arrayBuffer from fetch', async () => {
      const arrayBuffer = new ArrayBuffer(10);
      
      // Mock a successful fetch with arrayBuffer
      global.fetch = jest.fn().mockResolvedValueOnce({
        arrayBuffer: jest.fn().mockResolvedValueOnce(arrayBuffer)
      });
      
      const result = await cropEngine.loadImage('https://example.com/image.jpg');
      
      // Should get the array buffer back
      expect(result).toBe(arrayBuffer);
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/image.jpg');
    });
    
    test('loadImage should handle ArrayBuffer input', async () => {
      const arrayBuffer = new ArrayBuffer(8);
      const result = await cropEngine.loadImage(arrayBuffer);
      expect(result).toBe(arrayBuffer);
    });

    test('loadImage should throw on unsupported source type', async () => {
      // A number is not a supported source type
      await expect(cropEngine.loadImage(123))
        .rejects.toThrow('Error loading image: Unsupported source type');
    });

    test('loadImage should handle File input', async () => {
      // Define a File mock if needed in the test environment
      class MockFile {}
      const origFile = global.File;
      global.File = MockFile;
      
      // Create a mock File object
      const fileObj = new MockFile();
      
      // Test the File branch
      const result = await cropEngine.loadImage(fileObj);
      
      // Should return the file directly
      expect(result).toBe(fileObj);
      
      // Restore original
      global.File = origFile;
    });

    test('loadImage should handle Blob input', async () => {
      // Define a Blob mock if needed in the test environment
      class MockBlob {}
      const origBlob = global.Blob;
      global.Blob = MockBlob;
      
      // Create a mock Blob object
      const blobObj = new MockBlob();
      
      // Test the Blob branch
      const result = await cropEngine.loadImage(blobObj);
      
      // Should return the blob directly
      expect(result).toBe(blobObj);
      
      // Restore original
      global.Blob = origBlob;
    });

    test('loadImage should handle Buffer input', async () => {
      // Create a Buffer
      const buffer = Buffer.from('test-buffer-data');
      
      // Test the Buffer branch
      const result = await cropEngine.loadImage(buffer);
      
      // Should return the buffer directly
      expect(result).toBe(buffer);
    });

    test('saveImage should use default values when options not provided', async () => {
      const { formatImage } = require('../src/utils/format');
      
      // Call without options
      await cropEngine.saveImage(mockImageData);
      
      // Should use default format and quality
      expect(formatImage).toHaveBeenCalledWith(mockImageData, 'jpeg', 90);
    });
  });
}); 