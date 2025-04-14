/**
 * Special tests to ensure 100% branch coverage for processor.js
 */

const { processImage } = require('../../src/utils/processor');

describe('processor.js 100% coverage tests', () => {
  const validParams = {
    x: 10, 
    y: 10, 
    width: 100, 
    height: 100
  };
  
  const mockImageData = Buffer.from('test-image-data');
  
  test('processImage should re-throw validation errors', async () => {
    // Test with invalid crop parameters to trigger validation error
    const invalidParams = { x: 0, y: 0 }; // Missing width and height
    
    await expect(processImage(mockImageData, invalidParams))
      .rejects.toThrow('Crop parameters must include x, y, width, and height');
  });
  
  test('processImage should wrap non-validation errors', async () => {
    // We need to modify our approach to actually trigger the non-validation error path
    
    // Create a mock implementation that will throw during processing
    const originalTimeout = global.setTimeout;
    global.setTimeout = jest.fn().mockImplementation((_callback) => {
      // Instead of delaying, throw an error immediately
      throw new Error('Some generic error during processing');
    });
    
    try {
      await expect(processImage(mockImageData, validParams))
        .rejects.toThrow('Image processing failed: Some generic error during processing');
    } finally {
      // Restore the original function
      global.setTimeout = originalTimeout;
    }
  });
  
  test('processImage should handle unsupported format error directly', async () => {
    // Use the actual implementation which should throw for invalid formats
    // The function implementation checks if format is in supported list
    await expect(processImage(mockImageData, validParams, { outputFormat: 'invalid_format' }))
      .rejects.toThrow('Unsupported output format: invalid_format');
  });
  
  test('processImage should call progress callback if provided', async () => {
    const mockProgress = jest.fn();
    
    const result = await processImage(mockImageData, validParams, {
      onProgress: mockProgress
    });
    
    // Should return processed data
    expect(result.toString()).toBe('processed-image-data');
    
    // Should have called progress callback twice (start and end)
    expect(mockProgress).toHaveBeenCalledTimes(2);
    
    // First with 0 and last with 100
    expect(mockProgress).toHaveBeenNthCalledWith(1, 0);
    expect(mockProgress).toHaveBeenNthCalledWith(2, 100);
  });
  
  test('processImage should work without a progress callback', async () => {
    // Call without progress callback to test that branch
    const result = await processImage(mockImageData, validParams);
    
    // Should return processed data
    expect(result.toString()).toBe('processed-image-data');
  });
}); 