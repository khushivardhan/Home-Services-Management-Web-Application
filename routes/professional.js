'use strict'
const express = require('express');
const router = express.Router();
const bcrypt = require ('bcrypt');
const { v4: uuidv4 } = require('uuid');
const session=require('express-session')
const { check, validationResult } = require('express-validator')
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
//-------------------------------------------------    Login, Logout and Register    --------------------------------------------------


router.get('/login',(req,res)=>{
    // req.session.professionalauth=false;
    req.session.professionalname='';
    res.render('userlogin',{"alert":{}})
  })


router.post('/professionalloginvalidate',[
    check('loginname')
        .notEmpty().withMessage('Enter Login Name')
        .custom((loginname,{req})=>{
         return new Promise((resolve,reject)=>{
            dbCon.collection('professionalusers').findOne({"name":loginname},(err,result)=>{
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
        .notEmpty(),
    check('usertype','Select login Type')
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
    dbCon.collection("professionalusers").findOne({"name":req.body.loginname},(err,result) => {
        if (err) throw err;
        if (result) {
            var password=req.body.password
            bcrypt.compare(password ,result.password, function(err, passresult) {
            if (passresult){

                const token=createToken(req.body.loginname)
                res.cookie('jwt',token,{maxAge:300000,httpOnly:true});

                // req.session.professionalauth=true;
                req.session.professionalname=req.body.loginname;
                //res.redirect('/professional/professionaluserhome')
                res.json({
                    result:'redirect',url:'/professional/professionaluserhome'
                  })
            }
            })
        }
    })
    }
  })
  
  
  
  router.get('/professionalregister',(req,res)=>{
      dbCon.collection("domain").find({}).toArray((err,result)=>{
          if(err) throw err;
            res.render('professionalregister',{"key":result,"alert":{}})
      })
    })
  
  router.post('/registervalidate', [
    check('professionalname')
        .isLength({ min: 4 }).withMessage('This name must me atleast 4 characters long')
        .custom((loginname)=>{
            return new Promise((resolve,reject)=>{
                dbCon.collection('professionalusers').findOne({"name":loginname},(err,result)=>{
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
    check('professionalnumber', 'Mobile Number Must Be Of Length 10')
        .isLength({ min: 10,max:10 }),
    check('professionalmail')
        .notEmpty().withMessage('Email Should Not Be Empty')
        .isEmail().withMessage('Enter A Valid Mail')
        .normalizeEmail(),
    check('professionaldomain', 'This domain must me atleast 3 characters long')
        .isLength({ min: 3 }),
    check('professionalpassword', 'Password Must Contain 1 uppercase,lowercase,number and a symbol and of atleast length 5')
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
        dbCon.collection("domain").find({}).toArray((err,result)=>{
            if(err) throw err;
        res.render('professionalregister', {"key":result,alert})
        })
    }
   
      else
      {
          var pass=req.body.professionalpassword;
          bcrypt.hash(pass, saltRounds, function(err, hash) {
              var details={"name":req.body.professionalname,"number":req.body.professionalnumber,"address":req.body.professionaladdress,"password":hash,"mail":req.body.professionalmail,"domain":req.body.professionaldomain,"status":"pending"}
              dbCon.collection("professionalusers").insertOne(details,(err1,res1)=>{
                  if (err1) throw err1;
                  
                      res.redirect('/professional/response')
                  
              })
          })
      }
  })

  router.post('/registervalidatenew', [
    check('professionalname')
    .isLength({ min: 4 }).withMessage('This name must me atleast 4 characters long')
    .custom((loginname)=>{
        return new Promise((resolve,reject)=>{
            dbCon.collection('professionalusers').findOne({"name":loginname},(err,result)=>{
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
    check('professionalnumber', 'Mobile Number Must Be Of Length 10')
        .isLength({ min: 10,max:10 }),
    check('professionalmail')
        .notEmpty().withMessage('Email Should Not Be Empty')
        .isEmail().withMessage('Enter A Valid Mail')
        .normalizeEmail(),
    check('professionaldomainnew', 'This domain must me atleast 3 characters long')
        .exists()
        .isLength({ min: 3 }),
    check('professionalpassword', 'Password Must Contain 1 uppercase,lowercase,number and a symbol and of atleast length 5')
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
        dbCon.collection("domain").find({}).toArray((err,result)=>{
            if(err) throw err;
            res.render('professionalregister', {"key":result,alert})
        })
    }
   
      else
      {
          var pass=req.body.professionalpassword;
          bcrypt.hash(pass, saltRounds, function(err, hash) {
              var details={"name":req.body.professionalname,"number":req.body.professionalnumber,"address":req.body.professionaladdress,"password":hash,"mail":req.body.professionalmail,"domain":req.body.professionaldomainnew,"status":"pending"}
              dbCon.collection("professionalusers").insertOne(details,(err1,res1)=>{
                  if (err1) throw err1;
                  else{
                      res.redirect('/professional/response')
                  }
              })
          })
      }
})


  router.get('/response',(req,res)=>{
    res.render('response')
  })
  

  router.get('/logout',(req,res)=>{
    const token=createToken(req.body.loginname)
    res.cookie('jwt',token,{maxAge:1,httpOnly:true});
    req.session.destroy(function(){
    res.redirect('/users/userlogin');
  })
})

  //------------------------------------------------    Professional Routes    ---------------------------------------



// router.use((req,res,next)=>{
//   if(req.session.professionalauth){
//     next()
//   }
//   else
//   {
//     res.redirect('/users/login')
//   }
// })


const jwtmiddleware=require('../public/middleware/auth')
router.use(jwtmiddleware)


  router.get('/professionaluserhome',(req,res)=>{
    
        async function home(){
        try
        {
            var user=await dbCon.collection("professionalusers").findOne({"name":req.session.professionalname})    
            var order=await dbCon.collection("orders").find({"domain":user.domain,"status":"pending"}).toArray()
            res.render('professionaluserhome',{"key":order,"user":req.session.professionalname,"statuscheck":user})
        }
        catch(e)
        {
            console.log(e)
        }
        }
        home()
  })



  router.get('/acceptedorder/:id',(req,res)=>{
    
       var id=req.params.id

        async function order(){
        try
        {
            var order=await dbCon.collection("orders").findOne({"_id":ObjectId(id)})
            var profdetails=await dbCon.collection("professionalusers").findOne({"name":req.session.professionalname})

            var a=order._id
            var details={"professional":req.session.professionalname,"professionalnumber":profdetails.number,"professionalmail":profdetails.mail,"orderid":a,"username":order.username,"domain":order.domain,"subdomain":order.subdomain,"address":order.address,"number":order.number,"cost":order.cost}

            var accept=await dbCon.collection("acceptedorders").insertOne(details)    
            var order2=await dbCon.collection("orders").updateOne({"_id":ObjectId(id)},{$set:{"status":"accepted"}})
                    
            var prostatus=await dbCon.collection("acceptedorders").find({"professional":req.session.professionalname})
            if(prostatus)
            {
                var status=await dbCon.collection("employeestatus").updateOne({"name":req.session.professionalname},{$set:{"status":"work"}})
            }      
                    res.redirect('/professional/professionaluserhome')   
        }
        catch(e)
        {
            console.log(e)
        }
    }
        order()
    
  })
  
router.get('/professionalacceptedorders',(req,res)=>{
     
        dbCon.collection("acceptedorders").find({"professional":req.session.professionalname}).toArray((err,result)=>{
            if(err) throw err;
              res.render('professionalacceptedorders',{"key":result,"user":req.session.professionalname})
        })
})

router.get('/deliverorder/:id',(req,res)=>{
   
        var id=req.params.id

        async function deliver(){
        try
        {

            var accept=await dbCon.collection("acceptedorders").findOne({"_id":ObjectId(id)})
            var comp=await dbCon.collection("completedorders").insertOne(accept)
            var ord=await dbCon.collection("orders").deleteOne({"username":accept.username,"domain":accept.domain,"subdomain":accept.subdomain})
            var accept2=await dbCon.collection("acceptedorders").deleteOne({"_id":ObjectId(id)})
                 
            var prostatus=await dbCon.collection("acceptedorders").findOne({"professional":req.session.professionalname})
            if(prostatus==null)
            {
            var status=await dbCon.collection("employeestatus").updateOne({"name":req.session.professionalname},{$set:{"status":"free"}})
            }            
                res.redirect('/professional/professionalacceptedorders')
        }
        catch(e)
        {
            console.log(e)
        }
    }
        deliver()
})

router.get('/professionaldeliveredorders',(req,res)=>{
   
        dbCon.collection("completedorders").find({"professional":req.session.professionalname}).toArray((err,result)=>{
            if(err) throw err;
                res.render('professionaldeliveredorders',{"key":result,"user":req.session.professionalname})
        })
})


module.exports = router;