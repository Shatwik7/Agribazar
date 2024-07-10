
const database=require('./database.js');
const {machinerySchema, blogSchema,userSchema ,productSchema ,bidSchema, searchMapSchema}=require('./schema.js');

const redis=require('./redis.js');

async function detainUser(req, res, next) {
    const id = req.session.user_id;
    
    try {
      await redis.set(`blacklist:${id}`, 'true', 'EX', 3600);
      console.log(`Session ID ${id} has been blacklisted`);
  
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
          return next(err); 
        }
        console.log('Session destroyed successfully');
        res.redirect('/login');
      });
    } catch (error) {
      console.error('Error blacklisting session ID:', error);
      next(error); 
    }
}
  

module.exports.validMachinery=(req,res,next)=>{
    const validation=machinerySchema.validate(req.body);
    const {error}=validation;
    if(error){
        console.log(validation);
        console.log('error is detected');
        console.log(error);
        const errorMessage = error.details.map((err) => err.message).join(', ');
        console.log(errorMessage);
        req.flash('error',errorMessage);
        res.redirect('/machinery');
    }else{
        console.log('validation success full');
        next();
    }
}

module.exports.validBlog=(req,res,next)=>{
    console.log(req.body);
    const {error}=blogSchema.validate(req.body);
    if(error){
        console.log("error detected");
        console.log(error);
        req.flash('error',error.details[0].message);
        res.redirect('/blogs');
    }else{
        next();
    }
}

module.exports.validUser=(req,res,next)=>{
    const {error}=userSchema.validate(req.body);
    if(error){
        console.log("error detected");
        console.log(error);
        req.flash('error',error.details[0].message);
        res.redirect('/register');
    }else{
        console.log("successfully validated!!");
        next();
    }
}

module.exports.validProduct=(req,res,next)=>{
    console.log(req.body);
    const { error } = productSchema.validate(req.body);
  
    if (error) {
      console.log(error);
      req.flash('error', error.details[0].message);
  
      if (error.details[0].type === 'string.threat') {
        return detainUser(req, res, next);
      }
  
      return res.redirect('/product');
    } else {
      console.log("Successfully validated!!");
      next();
    }
}

module.exports.validBid=(req,res,next)=>{
    const {error}=bidSchema.validate(req.body);
    if(error){
        console.log("error detected");
        console.log(error);
        req.flash('error',error.details[0].message);
        res.redirect(`/product/${req.params.id}`);
    }else{
        console.log("successfully validated!!");
        next();
    }
}

module.exports.validMapSearch=(req,res,next)=>{
    const {error}=searchMapSchema.validate(req.body);
    if(error){
        console.log('error detected');
        console.log('error',error.details[0].message);
        req.flash('error',error.details[0].message);
        res.redirect(`/product/map`);
    }else{
        console.log("successful validation");
        next();
    }
}


module.exports.isMerchant=async(req,res,next)=>{
    const mechinary=await database.findOneMachinery(req.params.id);
    if(mechinary.seller_id!=req.session.user_id){
        req.flash('error','you are not authorized to do that');
        res.redirect(`/machinery/${req.params.id}`);
    }else{
        next();
    }
}

module.exports.isFarmer=async(req,res,next)=>{
    const product=await database.FindProduct(req.params.id);
    console.log(product);
    if(product.seller_id!==req.session.user_id){
        req.flash('error','you are not authorized to do that');
        res.redirect(`/product/${req.params.id}`);
    }else{
        next();
    }
}

module.exports.isBloger=async(req,res,next)=>{
    const blog=await database.FindBlog(req.params.id);
    if(blog.user_id!=req.session.user_id){
        req.flash('error','you are not authorized to do that!!');
        res.redirect(`/blogs/${req.params.id}`);
    }else{ 
        next();
    }
}

module.exports.checkMerchant=(req,res,next)=>{
    if(req.session.user_type!="merchant"){
        req.flash('error','You are not a registerd merchant');
        res.redirect('/product');
    }
    else{
        next();
    }
}

module.exports.checkFarmer=(req,res,next)=>{
    if(req.session.user_type!="farmer"){
        req.flash('error','You are not a registerd Farmer');
        res.redirect('/product');
    }
    else{
        next();
    }
}
