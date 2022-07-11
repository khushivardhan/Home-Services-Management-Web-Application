const jwt=require('jsonwebtoken');

const logger= function(req,res,next){
    const token=req.cookies.jwt;
    
    jwt.verify(token,"homeservices",(err,decodedtoken)=>{
        if(err || token==undefined)
        {
            res.redirect('/users/login');
        }
        else
        {
            next();
        }
    })
}

module.exports=logger;