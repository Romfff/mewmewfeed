const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = () => {
  const buffer = Buffer.from('test string', 'utf-8');
  cloudinary.uploader.upload_stream({ folder: 'feed-the-cat' }, (error, result) => {
    if (error) {
      console.error('Upload Error:', error);
    } else {
      console.log('Upload Success:', result);
    }
  }).end(buffer);
};

upload();
