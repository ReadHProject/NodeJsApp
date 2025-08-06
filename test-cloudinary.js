import { config } from 'dotenv';
import { isCloudinaryConfigured } from './config/cloudinary.js';

// Load environment variables
config();

console.log('🔧 Testing Cloudinary Configuration...\n');

console.log('Environment Variables:');
console.log('CLOUDINARY_NAME:', process.env.CLOUDINARY_NAME ? '✅ Set' : '❌ Missing');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing');
console.log('CLOUDINARY_SECRET:', process.env.CLOUDINARY_SECRET ? '✅ Set' : '❌ Missing');

console.log('\nCloudinary Status:');
console.log('Configuration Valid:', isCloudinaryConfigured() ? '✅ Valid' : '❌ Invalid');

console.log('\nIf all checks pass, the issue is likely in the product category lookup.');
console.log('The fix has been applied to handle missing categoryName properly.');
