const bcrypt=require('bcrypt');


module.exports.hashPassword=async(pw)=>{
    const salt=await bcrypt.genSalt(12);  
    const hash=await bcrypt.hash(pw,salt);  
    return hash;                                                 
}


module.exports.login=async(pw,hashPassword)=>{
    const result=await bcrypt.compare(pw,hashPassword);
    return result;

}