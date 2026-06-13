import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a buffer stream to Cloudinary
 * @param {Buffer} fileBuffer
 * @param {String} folder
 * @param {String} format - 'pdf', 'png', etc.
 * @returns {Promise<Object>}
 */
export const uploadBufferToCloudinary = (fileBuffer, folder = "lumora", format = "pdf") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "raw", // 'raw' is necessary for PDFs
        format: format,
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

/**
 * Deletes a file from Cloudinary
 * @param {String} publicId
 * @param {String} resourceType - 'raw', 'image', etc.
 * @returns {Promise<Object>}
 */
export const deleteFromCloudinary = (publicId, resourceType = "raw") => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      { resource_type: resourceType },
      (error, result) => {
        if (error) {
          console.error("Cloudinary delete error:", error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
  });
};

export default cloudinary;
