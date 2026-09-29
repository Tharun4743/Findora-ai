const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
require('dotenv').config();

// Configure Cloudinary using explicit credentials (env vars take priority over CLOUDINARY_URL)
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY    = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

const isCloudinaryConfigured = Boolean(CLOUD_NAME && API_KEY && API_SECRET);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key:    API_KEY,
    api_secret: API_SECRET,
    secure:     true
  });
  console.log(`☁️  Cloudinary configured → cloud: ${CLOUD_NAME}, key: ${API_KEY}`);
} else {
  console.warn('⚠️  [CLOUDINARY] Missing credentials. Image upload will fall back to local storage.');
}

/**
 * Upload from a file path (local dev)
 */
function uploadFromPath(filePath, options = {}) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(filePath, {
      folder: 'findora_items',
      resource_type: 'image',
      ...options
    }, (err, result) => {
      if (err) return reject(err);
      resolve(result.secure_url);
    });
  });
}

/**
 * Upload from a buffer (Vercel/serverless – no disk access required)
 */
function uploadFromBuffer(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'findora_items',
        resource_type: 'image',
        ...options
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      }
    );
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
}

/**
 * Universal upload: accepts a file path (string) or a Buffer.
 * Falls back gracefully if Cloudinary is not configured.
 */
async function uploadToCloudinary(filePathOrBuffer, options = {}) {
  if (!isCloudinaryConfigured) {
    console.warn('[CLOUDINARY] Not configured, skipping cloud upload.');
    return null;
  }

  try {
    if (Buffer.isBuffer(filePathOrBuffer)) {
      return await uploadFromBuffer(filePathOrBuffer, options);
    } else if (typeof filePathOrBuffer === 'string') {
      return await uploadFromPath(filePathOrBuffer, options);
    } else {
      throw new Error('Invalid upload argument: must be Buffer or file path string.');
    }
  } catch (error) {
    console.warn('[CLOUDINARY WARNING] Upload failed:', error.message);
    return null;
  }
}

/**
 * Quick connection test – pings Cloudinary API and returns account info.
 */
async function testCloudinaryConnection() {
  if (!isCloudinaryConfigured) {
    return { ok: false, error: 'Cloudinary credentials not configured.' };
  }
  try {
    const result = await cloudinary.api.ping();
    return { ok: true, cloud_name: CLOUD_NAME, status: result.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = {
  uploadToCloudinary,
  testCloudinaryConnection,
  isCloudinaryConfigured
};
