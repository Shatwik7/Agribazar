const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_KEY,
    api_secret:process.env.CLOUDINARY_SECRET
});
module.exports.trans=cloudinary.image("landmannalaugar_iceland.jpg", {transformation: [
    {width: 1000, crop: "scale"},
    {quality: "auto"},
    {fetch_format: "auto"}
    ]});

const storage=new CloudinaryStorage({
    cloudinary,
    params:{
        folder:'AgiBazza/user',
        allowedFormates:['jpeg','png','jpg']
    }
});

module.exports={
    cloudinary,
    storage
}