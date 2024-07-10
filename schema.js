const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');

const sanitizeString = (value, helpers) => {
  const sanitized = sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
  });
  if (sanitized !== value) {
    return helpers.error('string.threat', { value });
  }
  const sqlPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|UNION|FETCH|DECLARE|SET|SHOW)\b|;|--)/i;
  if (sqlPattern.test(sanitized)) {
    return helpers.error('string.threat', { value });
  }

  return sanitized;
};

const stringSchema = Joi.string().custom(sanitizeString, 'HTML/SQL sanitization').messages({
  'string.threat': 'YOUR ACCOUNT WILL BE DETAINED!!',
});

module.exports.machinerySchema = Joi.object({
  machinery_id: Joi.number().integer().positive().messages({
    'number.base': 'Machinery ID must be a number',
    'number.integer': 'Machinery ID must be an integer',
    'number.positive': 'Machinery ID must be a positive number'
  }),
  seller_id: Joi.number().integer().positive().messages({
    'number.base': 'Seller ID must be a number',
    'number.integer': 'Seller ID must be an integer',
    'number.positive': 'Seller ID must be a positive number'
  }),
  image_url: stringSchema.max(255).allow(null).messages({
    'string.base': 'Image URL must be a string',
    'string.max': 'Image URL must not exceed 255 characters'
  }),
  machinery_name: stringSchema.max(255).required().messages({
    'string.base': 'Machinery name must be a string',
    'string.max': 'Machinery name must not exceed 255 characters',
    'any.required': 'Machinery name is required'
  }),
  description: stringSchema.required().messages({
    'string.base': 'Description must be a string',
    'any.required': 'Description is required'
  }),
  quantity: Joi.number().integer().positive().required().messages({
    'number.base': 'Quantity must be a number',
    'number.integer': 'Quantity must be an integer',
    'number.positive': 'Quantity must be a positive number',
    'any.required': 'Quantity is required'
  }),
  state: stringSchema.valid('new', 'used').required().messages({
    'string.base': 'State must be a string',
    'any.only': 'State must be either "new" or "used"',
    'any.required': 'State is required'
  }),
  price: Joi.number().positive().precision(2).required().messages({
    'number.base': 'Price must be a number',
    'number.positive': 'Price must be a positive number',
    'number.precision': 'Price must have 2 decimal places',
    'any.required': 'Price is required'
  }),
  created_at: Joi.date().default(Date.now())
});


module.exports.blogSchema = Joi.object({
  blog_id: Joi.number().integer().positive().messages({
    'number.base': 'Blog ID must be a number',
    'number.integer': 'Blog ID must be an integer',
    'number.positive': 'Blog ID must be a positive number'
  }),
  user_id: Joi.number().integer().positive().messages({
    'number.base': 'User ID must be a number',
    'number.integer': 'User ID must be an integer',
    'number.positive': 'User ID must be a positive number',
    'any.required': 'User ID is required'
  }),
  image_url: stringSchema.max(240).allow(null).messages({
    'string.base': 'Image URL must be a string',
    'string.max': 'Image URL must not exceed 240 characters'
  }),
  title: stringSchema.max(255).required().messages({
    'string.base': 'Title must be a string',
    'string.max': 'Title must not exceed 255 characters',
    'any.required': 'Title is required'
  }),
  content: stringSchema.required().messages({
    'string.base': 'Content must be a string',
    'any.required': 'Content is required'
  }),
  created_at: Joi.date().default(Date.now())
});

module.exports.bidSchema = Joi.object({
  bid_id: Joi.number().integer().positive().messages({
    'any.required': 'Bid ID is required',
    'number.base': 'Bid ID must be a number',
    'number.integer': 'Bid ID must be an integer',
    'number.positive': 'Bid ID must be a positive number'
  }),
  auction_id: Joi.number().integer().positive().messages({
    'any.required': 'Auction ID is required',
    'number.base': 'Auction ID must be a number',
    'number.integer': 'Auction ID must be an integer',
    'number.positive': 'Auction ID must be a positive number'
  }),
  bidder_id: Joi.number().integer().positive().messages({
    'any.required': 'Bidder ID is required',
    'number.base': 'Bidder ID must be a number',
    'number.integer': 'Bidder ID must be an integer',
    'number.positive': 'Bidder ID must be a positive number'
  }),
  bid_amount: Joi.number().precision(2).required().messages({
    'any.required': 'Bid amount is required',
    'number.base': 'Bid amount must be a number',
    'number.precision': 'Bid amount must have precision of 2'
  }),
  bid_time: Joi.date().timestamp().messages({
    'any.required': 'Bid time is required',
    'date.base': 'Bid time must be a valid date'
  })
});


module.exports.productSchema = Joi.object({
  address:stringSchema,
  product_id: Joi.number().integer().positive().messages({
    'any.required': 'Product ID is required',
    'number.base': 'Product ID must be a number',
    'number.integer': 'Product ID must be an integer',
    'number.positive': 'Product ID must be a positive number'
  }),
  seller_id: Joi.number().integer().positive().messages({
    'any.required': 'Seller ID is required',
    'number.base': 'Seller ID must be a number',
    'number.integer': 'Seller ID must be an integer',
    'number.positive': 'Seller ID must be a positive number'
  }),
  product_name: stringSchema.max(255).required().messages({
    'any.required': 'Product name is required',
    'string.base': 'Product name must be a string',
    'string.max': 'Product name must not exceed 255 characters'
  }),
  image_url: stringSchema.max(255).allow(null, '').messages({
    'string.max': 'Image URL must not exceed 255 characters'
  }),
  description: stringSchema.min(20).max(255).required().messages({
    'string.base': 'Description must be a string',
    'string.min': 'Description must not be less than 20 characters',
    'string.max': 'Description must not exceed 255 characters'
  }),
  quantity: Joi.number().integer().min(1).required().messages({
    'any.required': 'Quantity is required',
    'number.base': 'Quantity must be a number',
    'number.integer': 'Quantity must be an integer',
    'number.min': 'Quantity cannot be less than 1'
  }),
  quality: stringSchema.valid('low', 'medium', 'high').required().messages({
    'any.required': 'Quality is required',
    'string.base': 'Quality must be a string',
    'any.only': 'Quality must be one of "low", "medium", or "high"'
  }),
  starting_price: Joi.number().precision(2).required().messages({
    'any.required': 'Starting price is required',
    'number.base': 'Starting price must be a number',
    'number.precision': 'Starting price must have precision of 2'
  }),
  reserve_price: Joi.number().precision(2).required().messages({
    'any.required': 'Reserve price is required',
    'number.base': 'Reserve price must be a number',
    'number.precision': 'Reserve price must have precision of 2'
  }),
  status: stringSchema.valid('active', 'completed').default('active').messages({
    'string.base': 'Status must be a string',
    'any.only': 'Status must be one of "active" or "completed"',
    'any.default': 'Default value for status is "active"'
  }),
  lng: Joi.number().required().messages({
    'any.required':'location is required'
  }),
  lat: Joi.number().required().messages({
    'any.required':'location is required'
  }),
  created_at: Joi.date().timestamp().messages({
    'any.required': 'Creation timestamp is required',
    'date.base': 'Creation timestamp must be a valid date'
  })
});


module.exports.userSchema = Joi.object({
  user_id: Joi.number().integer().positive().messages({
    'any.required': 'User ID is required',
    'number.base': 'User ID must be a number',
    'number.integer': 'User ID must be an integer',
    'number.positive': 'User ID must be a positive number'
  }),
  username: stringSchema.min(3).max(36).required().messages({
    'any.required': 'Username is required',
    'string.base': 'Username must be a string',
    'string.max': 'Username must not exceed 36 characters',
    'string.min': 'Username must not be less than 3 characters'
  }),
  email: stringSchema.email().required().messages({
    'any.required': 'Email is required',
    'string.base': 'Email must be a string',
    'string.email': 'Email must be a valid email address'
  }),
  password: stringSchema.max(255).required().messages({
    'any.required': 'Password is required',
    'string.base': 'Password must be a string',
    'string.max': 'Password must not exceed 255 characters'
  }),
  user_type: stringSchema.valid('farmer', 'merchant', 'consumer').required().messages({
    'any.required': 'User type is required',
    'string.base': 'User type must be a string',
    'any.only': 'User type must be one of "buyer", "seller", or "simple"'
  }),
  created_at: Joi.date().timestamp().messages({
    'any.required': 'Creation timestamp is required',
    'date.base': 'Creation timestamp must be a valid date'
  })
});

module.exports.searchMapSchema = Joi.object({
  search: stringSchema.allow(null).allow('').max(26).messages({
    'any.required': 'Enter a search address to begin',
    'string.max': 'Search must not exceed 26 characters',
    'string.min': 'Search must not be less than 3 characters'
  }),
  address: stringSchema.allow(null).allow('').min(3).max(26).messages({
    'any.required': 'Enter a search address to begin',
    'string.max': 'Address must not exceed 26 characters',
    'string.min': 'Address must not be less than 3 characters'
  }),
  radius: Joi.number().allow(null).max(10000).positive().messages({
    'any.required': 'Requires a search parameter',
    'number.base': 'Radius must be a number',
    'number.min': 'Radius must be larger',
    'number.max': 'Radius is too large',
    'number.integer': 'Radius must be an integer',
    'number.positive': 'Radius must be positive'
  })
}); 