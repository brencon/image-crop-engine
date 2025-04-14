const fs = require('fs');
const path = require('path');
const { ImageCropEngine } = require('../src/index');

describe('ImageCropEngine Integration Tests', () => {
  let cropEngine;
  const mockImageData = Buffer.from('test-image-data');
  
  beforeEach(() => {
    cropEngine = new ImageCropEngine();
  });
  
  describe('error handling', () => {
    test('should handle formatImage errors', async () => {
      // Special test buffer that will trigger errors
      const errorTriggerBuffer = Buffer.from('__test_error__-data');
      
      await expect(cropEngine.saveImage(errorTriggerBuffer, { format: 'jpeg' }))
        .rejects.toThrow('Format conversion failed: Test error');
    });
    
    test('should handle getFormatInfo errors', async () => {
      // Special test buffer that will trigger errors
      const errorTriggerBuffer = Buffer.from('__test_error__-data');
      
      await expect(cropEngine.getImageInfo(errorTriggerBuffer))
        .rejects.toThrow('Format detection failed: Test error');
    });
  });
}); 