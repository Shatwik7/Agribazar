const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();


module.exports.mail=async(reciver,title,messaage)=>{

const transporter = await nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL,
        pass: process.env.MAIL_PASS
    }
});

const mailOptions = {
    from: process.env.GMAIL,
    to: reciver, 
    subject: title,
    text: messaage,
};

await transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        console.error('Error occurred:', error);
    } else {
        console.log('Email sent successfully:', info.response);
    }
});
}
