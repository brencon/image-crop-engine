const { processImage, validateCropParameters } = require('../../src/utils/processor');
const { isFormatSupported } = require('../../src/utils/format');

// Mock the format module
jest.mock('../../src/utils/format', () => ({
  isFormatSupported: jest.fn().mockReturnValue(true)
}));

describe('processor utilities', () => {
  const mockImageData = Buffer.from('test-image-data');
  const validCropParams = {
    x: 100,
    y: 100,
    width: 500,
    height: 400
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('validateCropParameters', () => {
    test('should validate correct parameters without error', () => {
      expect(() => validateCropParameters(validCropParams)).not.toThrow();
      
      // With output dimensions
      expect(() => validateCropParameters({
        ...validCropParams,
        outputWidth: 250,
        outputHeight: 200
      })).not.toThrow();
    });
    
    test('should throw when required parameters are missing', () => {
      // Missing x
      expect(() => validateCropParameters({
        y: 100,
        width: 500,
        height: 400
      })).toThrow('Crop parameters must include x, y, width, and height');
      
      // Missing y
      expect(() => validateCropParameters({
        x: 100,
        width: 500,
        height: 400
      })).toThrow('Crop parameters must include x, y, width, and height');
      
      // Missing width
      expect(() => validateCropParameters({
        x: 100,
        y: 100,
        height: 400
      })).toThrow('Crop parameters must include x, y, width, and height');
      
      // Missing height
      expect(() => validateCropParameters({
        x: 100,
        y: 100,
        width: 500
      })).toThrow('Crop parameters must include x, y, width, and height');
    });
    
    test('should throw on negative coordinates', () => {
      expect(() => validateCropParameters({
        x: -10,
        y: 100,
        width: 500,
        height: 400
      })).toThrow('Crop x and y coordinates must be non-negative');
      
      expect(() => validateCropParameters({
        x: 100,
        y: -10,
        width: 500,
        height: 400
      })).toThrow('Crop x and y coordinates must be non-negative');
    });
    
    test('should throw on non-positive dimensions', () => {
      expect(() => validateCropParameters({
        x: 100,
        y: 100,
        width: 0,
        height: 400
      })).toThrow('Crop width and height must be positive values');
      
      expect(() => validateCropParameters({
        x: 100,
        y: 100,
        width: 500,
        height: -10
      })).toThrow('Crop width and height must be positive values');
    });
    
    test('should throw on invalid output dimensions', () => {
      expect(() => validateCropParameters({
        x: 100,
        y: 100,
        width: 500,
        height: 400,
        outputWidth: 0
      })).toThrow('Output width must be a positive value');
      
      expect(() => validateCropParameters({
        x: 100,
        y: 100,
        width: 500,
        height: 400,
        outputHeight: -5
      })).toThrow('Output height must be a positive value');
    });
  });
  
  describe('processImage', () => {
    test('should process image and return result', async () => {
      const result = await processImage(mockImageData, validCropParams);
      
      // In our placeholder implementation, it returns the original data
      expect(result).toBe(mockImageData);
    });
    
    test('should validate crop parameters', async () => {
      await processImage(mockImageData, validCropParams);
      
      // Should have run validation
      expect(() => validateCropParameters(validCropParams)).not.toThrow();
      
      // Should throw with invalid parameters
      try {
        await processImage(mockImageData, { x: 100, y: 100 });
        fail('Should have thrown');
      } catch (error) {
        expect(error.message).toContain('Image processing failed');
      }
    });
    
    test('should check format support', async () => {
      isFormatSupported.mockReturnValueOnce(false);
      
      try {
        await processImage(mockImageData, validCropParams, { outputFormat: 'unsupported' });
        fail('Should have thrown');
      } catch (error) {
        expect(error.message).toContain('Unsupported output format');
      }
      
      expect(isFormatSupported).toHaveBeenCalledWith('unsupported');
    });
    
    test('should call progress callback', async () => {
      const mockProgress = jest.fn();
      
      await processImage(mockImageData, validCropParams, { onProgress: mockProgress });
      
      // Progress should be called at least once
      expect(mockProgress).toHaveBeenCalled();
      
      // Last call should be with 1.0 (100%)
      const lastCall = mockProgress.mock.calls.length - 1;
      expect(mockProgress.mock.calls[lastCall][0]).toBe(1.0);
    });
  });
}); 