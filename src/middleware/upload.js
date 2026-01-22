// File: src/middleware/upload.js
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// File filter for GIS files
const gisFileFilter = (req, file, cb) => {
  const allowedExtensions = ['.geojson', '.json', '.shp', '.kml', '.kmz', '.gpkg'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${allowedExtensions.join(', ')}`), false);
  }
};

// File filter for images
const imageFileFilter = (req, file, cb) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid image type. Allowed: ${allowedExtensions.join(', ')}`), false);
  }
};

// Upload middleware for GIS files
const uploadGISFile = multer({
  storage,
  fileFilter: gisFileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
});

// Upload middleware for images
const uploadImage = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB for images
  },
});

// Upload middleware for any file
const uploadAny = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
});

module.exports = {
  uploadGISFile,
  uploadImage,
  uploadAny,
};
