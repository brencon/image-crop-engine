# image-crop-engine

A specialized, platform-agnostic JavaScript utility for processing and manipulating image data for cropping operations.

[![npm version](https://img.shields.io/npm/v/image-crop-engine.svg)](https://www.npmjs.com/package/image-crop-engine)
[![Build Status](https://github.com/brencon/image-crop-engine/workflows/Node.js%20CI%20with%20Coverage/badge.svg)](https://github.com/brencon/image-crop-engine/actions)
[![Coverage Status](https://coveralls.io/repos/github/brencon/image-crop-engine/badge.svg?branch=main)](https://coveralls.io/github/brencon/image-crop-engine?branch=main)

## Installation

```bash
npm install image-crop-engine
```

## Features

- Process image data to extract specific regions based on crop parameters
- Efficiently handle various image formats and sizes
- Manage memory usage for large image processing
- Preserve metadata during cropping operations
- Provide progress feedback for long-running operations
- Optimize quality for resulting cropped images
- Platform agnostic - works in any JavaScript environment (browser, Node.js, React Native)

## Usage

### Basic Example

```javascript
const { ImageCropEngine } = require('image-crop-engine');

// Initialize with configuration options
const cropEngine = new ImageCropEngine({
  preserveMetadata: true,
  outputFormat: 'jpeg',
  quality: 90
});

// Load an image
const imageData = await cropEngine.loadImage('path/to/image.jpg');

// Crop the image
const croppedImage = await cropEngine.cropImage(imageData, {
  x: 100,
  y: 50,
  width: 500,
  height: 300,
  outputWidth: 1000, // Resize output to 1000px width
  outputHeight: 600  // Resize output to 600px height
});

// Save the cropped image
const savedImage = await cropEngine.saveImage(croppedImage, {
  format: 'png',
  quality: 100
});

// Get information about the image
const imageInfo = cropEngine.getImageInfo(imageData);
console.log(imageInfo);
// { width: 2000, height: 1500, format: 'jpeg', ... }
```

### Integration with UI Frameworks

This library is framework-agnostic and can be integrated with any UI technology:

#### React Example

```javascript
import React, { useState, useEffect } from 'react';
import { ImageCropEngine } from 'image-crop-engine';
import { ViewportTransform } from 'viewport-transform';

function ImageEditor({ imageSrc }) {
  const [cropEngine] = useState(() => new ImageCropEngine({
    preserveMetadata: true,
    quality: 90
  }));
  
  const [imageData, setImageData] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  
  useEffect(() => {
    const loadImage = async () => {
      const data = await cropEngine.loadImage(imageSrc);
      setImageData(data);
      
      const info = cropEngine.getImageInfo(data);
      setImageDimensions({ width: info.width, height: info.height });
    };
    
    loadImage();
  }, [imageSrc, cropEngine]);
  
  const handleCrop = async (cropParams) => {
    if (!imageData) return;
    
    const croppedImage = await cropEngine.cropImage(imageData, cropParams);
    // Handle the cropped image (display, save, etc.)
  };
  
  return (
    <div>
      {/* Implement UI for image cropping */}
    </div>
  );
}
```

#### React Native Example

```javascript
import React, { useRef, useState } from 'react';
import { View, Image } from 'react-native';
import { ImageCropEngine } from 'image-crop-engine';
import { ViewportTransform } from 'viewport-transform';

function ImageCropper({ imageUri }) {
  const cropEngine = useRef(new ImageCropEngine()).current;
  const [isProcessing, setIsProcessing] = useState(false);
  
  const processCrop = async (cropParams) => {
    setIsProcessing(true);
    
    try {
      const imageData = await cropEngine.loadImage(imageUri);
      const croppedImage = await cropEngine.cropImageAsync(imageData, cropParams, 
        progress => {
          // Update progress UI
        }
      );
      // Handle the cropped image
    } catch (error) {
      // Handle errors
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <View>
      {/* UI implementation */}
    </View>
  );
}
```

## API Reference

### Constructor

```javascript
new ImageCropEngine({
  maxMemoryUsage,    // Optional: Maximum memory to use in bytes
  preserveMetadata,  // Optional: Whether to preserve image metadata (default: true)
  outputFormat,      // Optional: Default output format (jpeg, png, etc.)
  quality            // Optional: Default output quality (0-100 for JPEG)
})
```

### Methods

#### Crop Operations

- `cropImage(imageData, cropParameters)` - Crops an image using the provided parameters
- `cropImageAsync(imageData, cropParameters, progressCallback)` - Asynchronous version with progress updates

#### Image Input/Output

- `loadImage(source)` - Loads an image from various sources (File, Blob, Buffer, URL)
- `saveImage(processedImageData, options)` - Saves processed image to specified format

#### Utility Methods

- `getImageInfo(imageData)` - Returns information about the image (dimensions, format, etc.)
- `extractMetadata(imageData)` - Extracts metadata from the image
- `applyMetadata(imageData, metadata)` - Applies metadata to an image

### Crop Parameters

```javascript
{
  x: number,           // X coordinate of top-left corner in the original image
  y: number,           // Y coordinate of top-left corner in the original image
  width: number,       // Width of the crop area
  height: number,      // Height of the crop area
  outputWidth: number, // Optional: Width to resize the output to
  outputHeight: number,// Optional: Height to resize the output to
  format: string,      // Optional: Output format (overrides default)
  quality: number,     // Optional: Output quality (overrides default)
}
```

## Technical Features

### Memory Management

The engine efficiently processes large images without memory issues by:
- Streaming large images in chunks
- Using memory-efficient algorithms
- Providing configurable memory limits

### Format Support

Supports a variety of image formats:
- JPEG
- PNG
- WebP
- GIF
- TIFF (where platform allows)

### Metadata Preservation

Properly handles image metadata:
- Preserves relevant EXIF data (orientation, camera info, etc.)
- Allows selective inclusion/exclusion of metadata fields
- Handles orientation automatically

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 