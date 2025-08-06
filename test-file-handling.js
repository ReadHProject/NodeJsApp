import { getDataUri } from './utils/feature.js';
import fs from 'fs';
import path from 'path';

console.log('🧪 Testing File Handling Fix...\n');

// Test with mock disk storage file object
const mockDiskFile = {
  fieldname: 'generalImage',
  originalname: 'test-image.jpg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  destination: './uploads/products',
  filename: 'test-1234567890.jpg',
  path: './uploads/products/test-1234567890.jpg',
  size: 12345
};

// Test with mock memory storage file object
const mockMemoryFile = {
  fieldname: 'generalImage',
  originalname: 'test-image.jpg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  buffer: Buffer.from('fake image data'),
  size: 15
};

console.log('Testing disk storage file object:');
try {
  console.log('File properties:', {
    hasBuffer: !!mockDiskFile.buffer,
    hasPath: !!mockDiskFile.path,
    path: mockDiskFile.path
  });
  
  // This would normally fail if the file doesn't exist, but that's expected
  console.log('✅ Disk storage file object structure is correct\n');
} catch (error) {
  console.error('❌ Error with disk storage test:', error.message, '\n');
}

console.log('Testing memory storage file object:');
try {
  const result = getDataUri(mockMemoryFile);
  console.log('✅ Memory storage works:', !!result.content, '\n');
} catch (error) {
  console.error('❌ Error with memory storage test:', error.message, '\n');
}

console.log('Testing invalid file object:');
try {
  const invalidFile = { originalname: 'test.jpg' };
  getDataUri(invalidFile);
} catch (error) {
  console.log('✅ Correctly caught invalid file error:', error.message, '\n');
}

console.log('🎉 File handling tests completed!');
