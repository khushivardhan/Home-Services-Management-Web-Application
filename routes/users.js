'use strict'
const express = require('express');
const router = express.Router();
const bcrypt = require ('bcrypt');
const { v4: uuidv4, parse } = require('uuid');
const session=require('express-session');
const { check, validationResult } = require('express-validator');
const saltRounds = 10;
const cookieparser=require('cookie-parser');

const mongocon = require( '../public/utils/mongocon' );
const dbCon = mongocon.getDb();
const ObjectId=mongocon.getObjectId();

const myCache=function(req,res,next){
  res.set('Cache-Control','no-Cache,private,no-store,must-revalidate,max-stale=0,post-checked,pre-checked');
      next()
  }
router.use(myCache)

router.use(session({
  genid: function(req) {
      return uuidv4();         
    },
secret: 'keyboard cat',
resave: false,
saveUninitialized: true,
cookie: {maxAge: 3000000 }
}))


//jwt token
var jwt=require('jsonwebtoken');

const createToken=(username)=>{
var data={  "username":username,}
    const token=jwt.sign(data,"homeservices");       
        return token;
    }


//multer
const path = require('path');
const multer = require('multer');

const storage = multer.diskStorage({
destination : (req,file,cb) =>{
  cb(null,'public/images')
},

filename : (req, file, cb)=>{
  console.log(file);
  cb(null, Date.now() + path.extname(file.originalname));
  }
})
const upload = multer({storage : storage})


//---------------------------------------------    Login, Logout And Register    -----------------------------------------------


router.get('/login',(req,res)=>{
  // req.session.auth=false;
  req.session.username='';
  res.render('userlogin',{"alert":{}})
})

router.post('/loginvalidate',[
  check('loginname')

      .notEmpty().withMessage('Enter Login Name') 
      .custom((loginname,{req})=>{
        return new Promise((resolve,reject)=>{
            dbCon.collection('users').findOne({"loginname":loginname},(err,result)=>{
              if(result)
              {
                  var password=req.body.password
                  bcrypt.compare(password ,result.password, function(err, passresult) {
                  if (passresult)
                  {
                    resolve(true)
                  } 
                  else
                  {  
                    reject(new Error('Incorrect Password'))
                  }
                })
              }
              else
              {
                reject(new Error('Login Name Does Not Exists!  Please Register'))
              }
        })
      })
      }),

  check('password','Enter Password')
      .notEmpty()

],(req, res) => {
  const errors = validationResult(req)
  if(!errors.isEmpty()) {
      const alert = errors.array()
      //res.render('userlogin', {alert})
      res.json({
        alertError:alert
      })
  }
  else
  {
          dbCon.collection("users").findOne({"loginname":req.body.loginname},(err,result) => {
            if (err) throw err;
            if (result) 
            {
              var password=req.body.password
              bcrypt.compare(password ,result.password, function(err, passresult) {
              if (passresult)
              {

                 const token=createToken(req.body.username)

                //const token1=createToken(req.body.password)

                res.cookie('jwt',token,{maxAge:30000,httpOnly:true})

                // res.cookie('jwt',token,{maxAge:300000,httpOnly:true});
                
              
                  // req.session.auth=true;
                  req.session.username=req.body.loginname;
                  // res.redirect('/users/userhome')
                   res.json({
                   result:'redirect',url:'/users/userhome'
                 })
              } 
           })
          }
      })
  }
})



router.get('/register',(req,res)=>{
  res.render('userregister',{"alert":{}})
  })


router.post('/registervalidate',upload.single("userimage"), [
  check('regloginname')
      .isLength({ min: 5 }).withMessage('This username must me atleast 5 characters long')
      .custom((loginname)=>{
        return new Promise((resolve,reject)=>{
            dbCon.collection('users').findOne({"loginname":loginname},(err,result)=>{
              if(result)
              {
                reject(new Error('Login Name Already Exists'))
              }
              else
              {
                resolve(true)
              }
            })
        })
      }),
  check('regnumber', 'Mobile Number Must Be Of Length 10')
      .isLength({ min: 10,max:10 }),
  check('gender','Please select Gender')
      .notEmpty(),
  check('regmail')
      .notEmpty().withMessage('Email Should Not Be Empty')
      .isEmail().withMessage('Enter A Valid Mail')
      .normalizeEmail(),
  check('regpassword', 'Password Must Contain 1 uppercase,lowercase,number and a symbol and of atleast length 5')
      .isStrongPassword({
          minLength:5,
          minUppercase:1,
          minLowercase:1,
          minNumbers:1,
          minSymbols:1
      })
],(req,res)=>{
  const errors = validationResult(req)
  if(!errors.isEmpty()) {
      const alert = errors.array()
      res.render('userregister', {alert})
  }
  else
  {
        var pass=req.body.regpassword;
        var image=req.file.filename
        bcrypt.hash(pass, saltRounds, function(err, hash) {
            var details={"loginname":req.body.regloginname,"gender":req.body.gender,"number":req.body.regnumber,"address":req.body.regaddress,"password":hash,"mail":req.body.regmail,"image":image}
            dbCon.collection("users").insertOne(details,(err1,res1)=>{
                if (err1) throw err1;
                else{
                
                    res.redirect('/users/login')
              }
          })
      })
  }
})

router.get('/logout',(req,res)=>{
  const token=createToken(req.session.username)
  // req.cookies.jwt;
  res.cookie('jwt',token,{maxAge:1,httpOnly:true});
  req.session.destroy(function(){
  res.redirect('/users/login');
})
})



//------------------------------------------------------    User Routes    ------------------------------------------


// router.use((req,res,next)=>{
//   if(req.session.auth){
//     next()
//   }
//   else
//   {
//     res.redirect('/users/login')
//   }
// })

const jwtmiddleware=require('../public/middleware/auth')
router.use(jwtmiddleware)


router.get('/userhome',(req,res)=>{


    async function userhome()
    {
      try
      {
          const [temp1,temp2]= await Promise.all([
          dbCon.collection("domain").find({}).toArray(),
          dbCon.collection("services").find({}).toArray()
        ])
           res.render('userhome',{"domain":temp1,"service":temp2,"user":req.session.username,"alertmsg":'a'})
      }
      catch(e)
      {
        console.log(e)
      }
    }
    userhome()
})


router.get('/add/:domain/:subdomain',(req,res)=>{
 
        var username=req.session.username
        var domain=req.params.domain
        var subdomain=req.params.subdomain

        async function add(){ 
        try
        {
              var ser=await dbCon.collection("services").findOne({"domain":domain,"subdomain":subdomain})   
              var cart1=await dbCon.collection("cart").findOne({"username":username,"subdomain":subdomain})
            
              if(cart1)
              {      
                res.redirect('/users/userdashboard2')   
              }
              else
              {
                  var user=await dbCon.collection("users").findOne({"loginname":username})      
                  var cart2=await dbCon.collection("cart").insertOne({"username":username,"domain":domain,"subdomain":subdomain,"cost":ser.cost,"address":user.address,"number":user.number,"status":"pending"})
                
                  res.redirect('/users/userdashboard')        
              }
        }
        catch(e)
        {
          console.log(e)
        }
        }
        add()
   
})

router.get('/userdashboard',(req,res)=>{

  async function dash()
  {
    try
    {
        var temp1=await  dbCon.collection("domain").find({}).toArray()
        var temp2=await  dbCon.collection("services").find({}).toArray()
    
        res.render('userhome',{"domain":temp1,"service":temp2,"user":req.session.username,"alertmsg":true})      
    }
    catch(e)
    {
      console.log(e)
    }    
    }
  dash()
})

router.get('/userdashboard2',(req,res)=>{

  async function dash2()
  {
    try
    {
        var temp1=await  dbCon.collection("domain").find({}).toArray()
        var temp2=await  dbCon.collection("services").find({}).toArray()
    
        res.render('userhome',{"domain":temp1,"service":temp2,"user":req.session.username,"alertmsg":false})     
    }
    catch(e)
    {
      console.log(e)
    }
  }
  dash2()

})



router.get('/cart',(req,res)=>{
 
      var  username=req.session.username;

        dbCon.collection("cart").find({"username":username}).toArray((err,result)=>{
        if(err) throw err;
          res.render('cart',{"key":result,"user":username,"alertmsg":'a'})
    })
})

router.get('/book',(req,res)=>{
 
    var user=req.session.username

    async function book(){
      try
      {
            var cart1=await dbCon.collection("cart").find({"username":user}).toArray()
            var ord=await dbCon.collection("orders").insertMany(cart1)
            var cart2=await dbCon.collection("cart").deleteMany({"username":user})
        
            res.redirect('/users/bookdashboard')
      }
      catch(e)
      {
        console.log(e)
      }
  }
    book()
  
})

router.get('/bookdashboard',(req,res)=>{

  var user=req.session.username

  dbCon.collection("cart").find({"username":user}).toArray((err,result)=>{
    if(err) throw err;
        res.render('cart',{"key":result,"user":user,"alertmsg":true})
  })
})

router.get('/orders',(req,res)=>{
    
      var username=req.session.username;

      async function ord()
      {
      try
      {
          const [temp1,temp2]=await Promise.all([

          dbCon.collection("orders").find({"username":username}).toArray(),
          dbCon.collection("acceptedorders").find({"username":username}).toArray()
          ])
            res.render('orders',{"key":temp1,"user":username,"acceptdetails":temp2})
      }
      catch(e)
      {
        console.log(e)
      }
    }
      ord()
})

router.get('/deletecart/:id',(req,res)=>{
 
    var id=req.params.id
   
    dbCon.collection("cart").deleteOne({"_id":ObjectId(id)},(err,result)=>{
      if(err) throw err;
      res.redirect('/users/cartdashboard')
    })
})

router.get('/cartdashboard',(req,res)=>{

  var  username=req.session.username;
   
     dbCon.collection("cart").find({"username":username}).toArray((err,result)=>{
        if(err) throw err;
        res.render('cart',{"key":result,"user":username,"alertmsg":false})
    })
})

router.get('/cancelorder/:id',(req,res)=>{

  var id=req.params.id
  var username=req.session.username;

      dbCon.collection("orders").deleteOne({"_id":ObjectId(id)},(err,result)=>{
        if(err) throw err;
        res.redirect('/users/orderdashboard')
      })  
})

router.get('/orderdashboard',(req,res)=>{

  var id=req.params.id
  var username=req.session.username;

  async function orderdash()
  {
    try
    {
      const [temp1,temp2]=await Promise.all([ 
     
        dbCon.collection("orders").find({"username":username}).toArray(),
        dbCon.collection("acceptedorders").find({"username":username}).toArray()
      ])
       res.render('orders',{"key":temp1,"user":username,"acceptdetails":temp2,"alertmsg":true})
    }
    catch(e)
    {
      console.log(e)
    }
  }
  orderdash()
})

router.get('/completedorders',(req,res)=>{
  
    var username=req.session.username;

    dbCon.collection("completedorders").find({"username":username}).toArray((err,result)=>{
      if(err) throw err;
      res.render('completedorders',{"key":result,"user":username})
    })
 
})

router.get('/userprofile',(req,res)=>{
  
    var username=req.session.username;

    dbCon.collection("users").findOne({"loginname":username},(err,result)=>{
      if(err) throw err;
        res.render('userprofile',{"key":result,"user":username,"alert1":{}})
    })
 
})

router.post('/save/:username',[
  check('number', 'Mobile Number Must Be Of Length 10')
      .exists()
      .isLength({ min: 10,max:10 }),
  check('email', 'Email is not valid')
      .isEmail()
      .normalizeEmail()
],(req,res)=>{
  const errors = validationResult(req)
  if(!errors.isEmpty()) 
  {
      const alert = errors.array()
      dbCon.collection("users").findOne({"loginname":req.params.username},(err,result)=>{
        if(err) throw err;
        res.render('userprofile', {"alert1":alert,"user":req.params.username,"key":result})
      })
  }
  else
  {
 
    var username=req.params.username;
    var number=req.body.number
    var address=req.body.address
    var mail=req.body.email

    dbCon.collection("users").updateOne({"loginname":username},{$set:{"number":number,"address":address,"mail":mail}},(err,result)=>{
    if(err) throw err;      
        res.redirect('/users/userprofile')
    })
       
  }
})

router.get('/invoice/:id',(req,res)=>{

  var id=req.params.id
  var username=req.session.username;

  dbCon.collection('completedorders').find({"_id":ObjectId(id)}).toArray((err,result)=>{
      if(err) throw err;
      res.render('invoice',{"key":result,"user":username})
  })
})

module.exports = router;
