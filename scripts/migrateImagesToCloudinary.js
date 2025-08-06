import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import productModel from '../models/productModel.js';
import { uploadToCloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';
import { createImageObject } from '../utils/imageHelper.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

/**
 * Check if file exists
 * @param {String} filePath - File path to check
 * @returns {Boolean} - True if file exists
 */
const fileExists = (filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
};

/**
 * Migrate product images to Cloudinary
 * @param {String} productId - Product ID to migrate (optional, migrates all if not provided)
 * @param {Boolean} dryRun - If true, only shows what would be migrated without actually doing it
 */
const migrateProductImages = async (productId = null, dryRun = false) => {
  try {
    console.log('🚀 Starting image migration to Cloudinary...');
    
    if (!isCloudinaryConfigured()) {
      console.error('❌ Cloudinary is not properly configured. Please check your environment variables.');
      return;
    }

    // Get products to migrate
    const filter = productId ? { _id: productId } : {};
    const products = await productModel.find(filter);
    
    console.log(`📊 Found ${products.length} products to process`);

    let totalMigrated = 0;
    let totalErrors = 0;
    let totalSkipped = 0;

    for (const product of products) {
      console.log(`\n📦 Processing product: ${product.name} (${product._id})`);
      
      const imagesToMigrate = [];
      const updatedImages = [];
      
      // Process main product images
      if (product.images && product.images.length > 0) {
        console.log(`  📸 Processing ${product.images.length} main images...`);
        
        for (let i = 0; i < product.images.length; i++) {
          const image = product.images[i];
          
          // Skip if already migrated to Cloudinary
          if (typeof image === 'object' && image.isCloudinaryUploaded) {
            console.log(`    ⏭️  Image ${i + 1} already in Cloudinary, skipping`);
            updatedImages.push(image);
            totalSkipped++;
            continue;
          }
          
          // Get image path
          let imagePath = typeof image === 'string' ? image : (image.url || image.localPath);
          
          if (!imagePath) {
            console.log(`    ⚠️  Image ${i + 1} has no path, skipping`);
            updatedImages.push(image);
            totalSkipped++;
            continue;
          }
          
          // Skip if already a Cloudinary URL
          if (imagePath.includes('cloudinary.com')) {
            console.log(`    ⏭️  Image ${i + 1} is already a Cloudinary URL, updating metadata`);
            const updatedImage = createImageObject(imagePath, {
              productId: product._id.toString(),
              index: i
            });
            updatedImages.push(updatedImage);
            totalSkipped++;
            continue;
          }
          
          // Construct full file path for local files
          const fullPath = path.isAbsolute(imagePath) 
            ? imagePath 
            : path.join(__dirname, '../../uploads', imagePath);
          
          if (!fileExists(fullPath)) {
            console.log(`    ❌ Image file not found: ${fullPath}`);
            // Keep the original image data even if file is missing
            updatedImages.push(image);
            totalErrors++;
            continue;
          }
          
          if (dryRun) {
            console.log(`    🔍 [DRY RUN] Would migrate: ${fullPath}`);
            imagesToMigrate.push({ path: fullPath, index: i, originalData: image });
            continue;
          }
          
          // Upload to Cloudinary
          console.log(`    ⬆️  Uploading to Cloudinary: ${path.basename(fullPath)}`);
          
          const uploadResult = await uploadToCloudinary(fullPath, {
            folder: `ecommerce/products/${product._id}`,
            public_id: `${product._id}_main_${i}`,
            tags: ['product', 'main', product._id.toString()]
          });
          
          if (uploadResult.success) {
            console.log(`    ✅ Successfully uploaded: ${uploadResult.data.url}`);
            
            const updatedImage = createImageObject(uploadResult.data.url, {
              public_id: uploadResult.data.public_id,
              productId: product._id.toString(),
              index: i,
              size: uploadResult.data.bytes,
              width: uploadResult.data.width,
              height: uploadResult.data.height,
              format: uploadResult.data.format,
              filename: path.basename(fullPath),
              originalName: path.basename(fullPath)
            });
            
            updatedImages.push(updatedImage);
            totalMigrated++;
          } else {
            console.log(`    ❌ Upload failed: ${uploadResult.error}`);
            updatedImages.push(image); // Keep original on failure
            totalErrors++;
          }
        }
      }
      
      // Process color images if they exist
      if (product.colors && product.colors.length > 0) {
        console.log(`  🎨 Processing color images for ${product.colors.length} colors...`);
        
        for (let colorIndex = 0; colorIndex < product.colors.length; colorIndex++) {
          const color = product.colors[colorIndex];
          const updatedColorImages = [];
          
          if (color.images && color.images.length > 0) {
            for (let imgIndex = 0; imgIndex < color.images.length; imgIndex++) {
              const imagePath = color.images[imgIndex];
              
              // Skip if already a Cloudinary URL
              if (imagePath.includes('cloudinary.com')) {
                updatedColorImages.push(imagePath);
                totalSkipped++;
                continue;
              }
              
              const fullPath = path.isAbsolute(imagePath) 
                ? imagePath 
                : path.join(__dirname, '../../uploads', imagePath);
              
              if (!fileExists(fullPath)) {
                console.log(`    ❌ Color image file not found: ${fullPath}`);
                updatedColorImages.push(imagePath); // Keep original
                totalErrors++;
                continue;
              }
              
              if (dryRun) {
                console.log(`    🔍 [DRY RUN] Would migrate color image: ${fullPath}`);
                updatedColorImages.push(imagePath);
                continue;
              }
              
              console.log(`    ⬆️  Uploading color image: ${path.basename(fullPath)}`);
              
              const uploadResult = await uploadToCloudinary(fullPath, {
                folder: `ecommerce/products/${product._id}/colors/${color.colorId}`,
                public_id: `${product._id}_${color.colorId}_${imgIndex}`,
                tags: ['product', 'color', product._id.toString(), color.colorId]
              });
              
              if (uploadResult.success) {
                console.log(`    ✅ Color image uploaded: ${uploadResult.data.url}`);
                updatedColorImages.push(uploadResult.data.url);
                totalMigrated++;
              } else {
                console.log(`    ❌ Color image upload failed: ${uploadResult.error}`);
                updatedColorImages.push(imagePath); // Keep original on failure
                totalErrors++;
              }
            }
          }
          
          // Update color images
          product.colors[colorIndex].images = updatedColorImages;
        }
      }
      
      // Update product with new image data
      if (!dryRun && updatedImages.length > 0) {
        product.images = updatedImages;
        await product.save();
        console.log(`  💾 Updated product ${product._id} in database`);
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`  ✅ Successfully migrated: ${totalMigrated} images`);
    console.log(`  ⏭️  Skipped (already migrated): ${totalSkipped} images`);
    console.log(`  ❌ Errors: ${totalErrors} images`);
    
    if (dryRun) {
      console.log('\n🔍 This was a dry run. No actual changes were made.');
      console.log('   Run without --dry-run flag to perform the actual migration.');
    }
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  }
};

/**
 * Main execution
 */
const main = async () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const productId = args.find(arg => arg.startsWith('--product-id='))?.split('=')[1];
  
  console.log('🖼️  Image Migration Tool');
  console.log('========================');
  
  if (dryRun) {
    console.log('🔍 Running in DRY RUN mode - no changes will be made');
  }
  
  if (productId) {
    console.log(`🎯 Migrating specific product: ${productId}`);
  } else {
    console.log('🌍 Migrating all products');
  }
  
  await connectDB();
  await migrateProductImages(productId, dryRun);
  
  console.log('\n✨ Migration completed');
  process.exit(0);
};

// Handle uncaught exceptions
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { migrateProductImages };
