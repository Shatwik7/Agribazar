const mysql = require('mysql2');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
dotenv.config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
}).promise();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

const sql = `
INSERT INTO machinery (seller_id, image_url, machinery_name, description, quantity, state, price, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
`;

// Function to upload images to Cloudinary and return the URL
const uploadImage = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "AgiBazza/machinery"
    });
    return result.secure_url;
  } catch (err) {
    console.error('Error uploading to Cloudinary:', err);
    throw err;
  }
};

const seed = async () => {
  const imageDirectory = path.join(__dirname, 'machinery-images');
  const machineryImages = fs.readdirSync(imageDirectory);

  for (const image of machineryImages) {
    const imageUrl = await uploadImage(path.join(imageDirectory, image));
    const machineryName = path.parse(image).name;
    const description = 'This machinery is used for agricultural purposes.';
    const quantity = Math.floor(Math.random() * 100) + 1;
    const state = Math.random() > 0.5 ? 'new' : 'used';
    const price = (Math.random() * 9000 + 1000).toFixed(2);

    const params = [
      83, // seller_id (change as needed)
      imageUrl,
      machineryName,
      description,
      quantity,
      state,
      price
    ];

    console.log(params);
    await pool.query(sql, params);
    console.log('Record inserted successfully');
  }

  pool.end();
};

// Run the seed function
seed().catch(err => {
  console.error('Error during seeding:', err);
});
