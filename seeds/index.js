const mysql = require('mysql2');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
dotenv.config();

const coordinates = require('./location.js');
const crop = require('./crop.js');
const cities2 = require('./indianCities');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT
}).promise();

const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapboxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mapboxToken });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

const sql = `
INSERT INTO products (seller_id, product_name, description, quantity, quality, starting_price, reserve_price, status, created_at, image_url, lng, lat)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)
`;

// Function to get a random number between min and max
function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

// Function to upload images to Cloudinary and return the URL
const uploadImage = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "AgiBazza/new"
    });
    return result.secure_url;
  } catch (err) {
    console.error('Error uploading to Cloudinary:', err);
    throw err;
  }
};

const seed = async () => {
  const imageDirectory = path.join(__dirname, 'Agricultural-crops'); // Main directory containing subfolders with plant images
  const plantFolders = fs.readdirSync(imageDirectory);

  for (let i = 0; i < 450; i++) {
    // const geoData = await geocoder.forwardGeocode({
    //   query: loc,
    //   limit: 1
    // }).send();

    const Coordinates = [coordinates[i].longitude,coordinates[i].latitude];
    const startingPrice = getRandomArbitrary(1500, 6000);
    const reservePrice = getRandomArbitrary(1900, 6000);

    const plantFolder = plantFolders[i % plantFolders.length];
    const plantImages = fs.readdirSync(path.join(imageDirectory, plantFolder));
    const randomImage = plantImages[Math.floor(Math.random() * plantImages.length)];
    const imageUrl = await uploadImage(path.join(imageDirectory, plantFolder, randomImage));

    const params = [
      73, // seller_id (change as needed)
      plantFolder, // product_name
      'Crops are plants cultivated by humans for various purposes, including food, feed, fiber, fuel, medicinal, and industrial uses. They play a vital role in sustaining human life and supporting global economies.', // description (change as needed)
      100, // quantity (change as needed)
      'medium', // quality (change as needed)
      startingPrice, // starting_price
      reservePrice, // reserve_price
      'active', // status (change as needed)
      imageUrl, // image_url
      Coordinates[0], // lng
      Coordinates[1] // lat
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
