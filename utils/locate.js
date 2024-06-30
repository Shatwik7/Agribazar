const axios = require('axios');


module.exports.locate = async (ip) => {
  try {
    const response = await axios.get(`http://ip-api.com/json/${ip}`);
    console.log('Data from API:', response.data);
    return { lng: response.data.lon, lat: response.data.lat };
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
};

