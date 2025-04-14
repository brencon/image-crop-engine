/**
 * ImageCropEngine
 * 
 * Core implementation of the image cropping functionality.
 * Handles processing and manipulation of image data for cropping operations.
 */

const { extractMetadata, applyMetadata } = require('./utils/metadata');
const { formatImage, getFormatInfo } = require('./utils/format');
const { processImage } = require('./utils/processor');

class ImageCropEngine {
  /**
   * @typedef {Object} CropParameters
   * @property {number} x - X coordinate of top-left corner in the original image
   * @property {number} y - Y coordinate of top-left corner in the original image
   * @property {number} width - Width of the crop area
   * @property {number} height - Height of the crop area
   * @property {number} [outputWidth] - Optional width to resize the output to
   * @property {number} [outputHeight] - Optional height to resize the output to
   * @property {string} [format] - Optional output format (overrides default)
   * @property {number} [quality] - Optional output quality (overrides default)
   */

  /**
   * Creates a new ImageCropEngine instance
   * @param {Object} options - Configuration options
   * @param {number} [options.maxMemoryUsage] - Maximum memory to use in bytes
   * @param {boolean} [options.preserveMetadata=true] - Whether to preserve image metadata
   * @param {string} [options.outputFormat] - Default output format (jpeg, png, etc.)
   * @param {number} [options.quality] - Default output quality (0-100 for JPEG)
   */
  constructor({
    maxMemoryUsage,
    preserveMetadata = true,
    outputFormat = 'jpeg',
    quality = 90
  } = {}) {
    this.maxMemoryUsage = maxMemoryUsage;
    this.preserveMetadata = preserveMetadata;
    this.outputFormat = outputFormat;
    this.quality = quality;
    
    // Track operations for potential memory management
    this.activeOperations = new Set();
  }

  /**
   * Crops an image using the provided parameters
   * @param {Buffer|Blob|ArrayBuffer} imageData - The source image data
   * @param {CropParameters} cropParameters - Parameters for the crop operation
   * @returns {Promise<Buffer|Blob>} - The processed image data
   */
  async cropImage(imageData, cropParameters) {
    try {
      // Extract metadata if needed
      const metadata = this.preserveMetadata ? await extractMetadata(imageData) : null;
      
      // Process the actual image data
      const processedImage = await processImage(imageData, cropParameters, {
        maxMemoryUsage: this.maxMemoryUsage,
        outputFormat: cropParameters.format || this.outputFormat,
        quality: cropParameters.quality || this.quality
      });
      
      // Re-apply metadata if needed
      const finalImage = this.preserveMetadata && metadata 
        ? await applyMetadata(processedImage, metadata)
        : processedImage;
      
      return finalImage;
    } catch (error) {
      throw new Error(`Error cropping image: ${error.message}`);
    }
  }

  /**
   * Crops an image asynchronously with progress callbacks
   * @param {Buffer|Blob|ArrayBuffer} imageData - The source image data
   * @param {CropParameters} cropParameters - Parameters for the crop operation
   * @param {Object} options - Options for the operation
   * @param {Function} [options.onProgress] - Callback for progress updates (0-100)
   * @returns {Promise<Buffer|Blob>} - The processed image data
   */
  cropImageAsync(imageData, cropParameters, { onProgress } = {}) {
    return new Promise((resolve, reject) => {
      // Create a unique ID for this operation
      const operationId = Date.now() + Math.random().toString(36).substr(2, 9);
      this.activeOperations.add(operationId);
      
      let lastProgress = 0;
      const progressCallback = (progress) => {
        if (typeof onProgress === 'function' && progress - lastProgress >= 5) {
          lastProgress = progress;
          onProgress(progress);
        }
      };
      
      // Start with extracting metadata
      progressCallback(5);
      
      let metadata = null;
      const processWithMetadata = async () => {
        try {
          if (this.preserveMetadata) {
            metadata = await extractMetadata(imageData);
          }
          progressCallback(15);
          
          // Process the actual image
          const processedImage = await processImage(imageData, cropParameters, {
            maxMemoryUsage: this.maxMemoryUsage,
            outputFormat: cropParameters.format || this.outputFormat,
            quality: cropParameters.quality || this.quality,
            onProgress: (p) => progressCallback(15 + p * 0.7) // Scale to 15-85%
          });
          progressCallback(85);
          
          // Re-apply metadata
          const finalImage = this.preserveMetadata && metadata 
            ? await applyMetadata(processedImage, metadata)
            : processedImage;
            
          progressCallback(100);
          
          // Cleanup and resolve
          this.activeOperations.delete(operationId);
          resolve(finalImage);
        } catch (error) {
          this.activeOperations.delete(operationId);
          reject(new Error(`Error in async crop operation: ${error.message}`));
        }
      };
      
      processWithMetadata();
    });
  }

  /**
   * Loads an image from various sources
   * @param {string|Buffer|Blob|File} source - The image source 
   * @returns {Promise<Buffer|Blob>} - The loaded image data
   */
  async loadImage(source) {
    try {
      // Handle different input types
      if (typeof source === 'string') {
        // Assume it's a URL or data URL
        const response = await fetch(source);
        return await response.arrayBuffer();
      } else if (
        // Check for browser-specific types
        (typeof File !== 'undefined' && source instanceof File) || 
        (typeof Blob !== 'undefined' && source instanceof Blob)
      ) {
        return source;
      } else if (
        (typeof ArrayBuffer !== 'undefined' && source instanceof ArrayBuffer) || 
        (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(source))
      ) {
        return source;
      } else {
        throw new Error('Unsupported source type');
      }
    } catch (error) {
      throw new Error(`Error loading image: ${error.message}`);
    }
  }

  /**
   * Saves processed image data to a specified format
   * @param {Buffer|Blob|ArrayBuffer} processedImageData - The processed image data
   * @param {Object} options - Options for saving
   * @param {string} [options.format] - Output format
   * @param {number} [options.quality] - Output quality
   * @returns {Promise<Buffer|Blob>} - The saved image data
   */
  async saveImage(processedImageData, { format, quality } = {}) {
    const outputFormat = format || this.outputFormat;
    const outputQuality = quality || this.quality;
    
    return formatImage(processedImageData, outputFormat, outputQuality);
  }

  /**
   * Returns information about the image
   * @param {Buffer|Blob|ArrayBuffer} imageData - The image data
   * @returns {Promise<Object>} - Information about the image
   */
  async getImageInfo(imageData) {
    return getFormatInfo(imageData);
  }

  /**
   * Extracts metadata from the image
   * @param {Buffer|Blob|ArrayBuffer} imageData - The image data
   * @returns {Promise<Object>} - The extracted metadata
   */
  async extractMetadata(imageData) {
    return extractMetadata(imageData);
  }

  /**
   * Applies metadata to an image
   * @param {Buffer|Blob|ArrayBuffer} imageData - The image data
   * @param {Object} metadata - The metadata to apply
   * @returns {Promise<Buffer|Blob>} - The image with applied metadata
   */
  async applyMetadata(imageData, metadata) {
    return applyMetadata(imageData, metadata);
  }
}

module.exports = ImageCropEngine; 