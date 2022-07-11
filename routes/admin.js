'use strict'
const express = require('express');
const router = express.Router(); //new router object and handle multiple requests
const { v4: uuidv4 } = require('uuid'); // generate a unique session id
const session=require('express-session');
const { check,validationResult } = require('express-validator');
const saltRounds = 10;
const cookieparser=require('cookie-parser');

const mongocon = require( '../public/utils/mongocon');
const dbCon = mongocon.getDb();
const ObjectId=mongocon.getObjectId();

const myCache=function(req,res,next){
  res.set('Cache-Control','no-Cache,private,no-store,must-revalidate,max-stale=0,post-checked,pre-checked');
      next()
  }
router.use(myCache)


//session
router.use(session({
  genid: function(req) {
      return uuidv4();         
    },
  secret: 'keyboard cat', //  encrypt the session cookie 
  resave: false, // no modification is performed on session 
  saveUninitialized: true, // session object will be stored in the session store
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

//-------------------------------------------    Admin login and register    -----------------------------------

router.get('/adminlogin',(req,res)=>{
    // req.session.adminauth=false;
    res.render('adminlogin',{"alert":{}})
})

router.post('/validateadmin',[
  check('adminloginname')
      .notEmpty().withMessage('Enter Login Name')
      .custom((adminloginname,{req})=>{
        return new Promise((resolve,reject)=>{
          if (req.body.adminloginname=="Admin" & req.body.adminpassword=="admin" )
          {
            resolve(true)
          }
          else
          {
            reject(new Error('Invalid Credentials'))
          }
        })
      }),
  check('adminpassword','Enter Password')
      .notEmpty()

],(req,res)=>{
  const errors = validationResult(req)
  if(!errors.isEmpty()) {
    const alert = errors.array()
    res.render('adminlogin', {alert})
  }
  else
  {
      if (req.body.adminloginname=="Admin" & req.body.adminpassword=="admin" )
      {

        const token=createToken(req.body.adminloginname)
        res.cookie('jwt',token,{maxAge:300000,httpOnly:true});

          // req.session.adminauth=true;
          res.redirect('/admin/adminhome')
     }
  }
})


router.get('/adminlogout',(req,res)=>{
  const token=createToken(req.body.adminloginname)
  res.cookie('jwt',token,{maxAge:1,httpOnly:true});
  req.session.destroy(function(){
  res.redirect('/admin/adminlogin');
})
})


//--------------------------------------------  Admin Routes    -----------------------------------------------


// router.use((req,res,next)=>{
//   if(req.session.adminauth){
//     next()
//   }
//   else
//   {
//     res.redirect('/admin/adminlogin')
//   }
// })

const jwtmiddleware=require('../public/middleware/auth')
router.use(jwtmiddleware)

router.get('/adminhome',(req,res)=>{

  async function chart()
  {
    try
    {
    const[result1,result2,result3,result4,result5,result6]=await Promise.all([

      dbCon.collection("orders").aggregate([{'$match':{'status':'pending'}},{'$count':'PendingCount'}]).toArray(),
      dbCon.collection("acceptedorders").aggregate([{'$count':'AcceptCount'}]).toArray(),
      dbCon.collection("completedorders").aggregate([{'$count':'CompleteCount'}]).toArray(),
      dbCon.collection("professionalusers").aggregate([{'$match':{'status':'accepted'}},{'$count':'acceptpro'}]).toArray(),
      dbCon.collection("professionalusers").aggregate([{'$match':{'status':'declined'}},{'$count':'declinepro'}]).toArray(),
      dbCon.collection("professionalusers").aggregate([{'$match':{'status':'pending'}},{'$count':'pendingpro'}]).toArray()    
    ])
      res.render('adminhome',{"pending":result1,"accepted":result2,"completed":result3,"acceptprof":result4,"declineprof":result5,"pendingprof":result6})
  }
    catch(e)
    {
      console.log(e)
    }
  }
  chart()
    
})

router.get('/vieworders/:username',(req,res)=>{
 
  var username=req.params.username

      dbCon.collection("orders").find({"username":username}).toArray((err,result)=>{
        if(err) throw err;
        res.render('adminorders',{"key":result})
      })
})

router.get('/viewcompletedorders/:username',(req,res)=>{
  
      var username=req.params.username

      dbCon.collection("completedorders").find({"username":username}).toArray((err,result)=>{
        if(err) throw err;
        res.render('userdeliveredorders',{"key":result})
      })
})


router.get('/addservice',(req,res)=>{
 
    dbCon.collection("domain").find({}).toArray((err,result)=>{
    if(err) throw err
      res.render('addservice',{"domain":result,"alert":{}})
    })
})

router.post('/saveservice',upload.single("domainimage"),[
  check('cost','Enter Cost')
      .notEmpty(),
  check('subdomain')
    .custom((subdomain)=>{
      return new Promise((resolve,reject)=>{
          dbCon.collection('services').findOne({"subdomain":subdomain},(err,result)=>{
            if(result)
            {
              reject(new Error('Sub Service Already Exists'))
            }
            else
            {
              resolve(true)
            }
          })
      })
    })
],(req,res)=>{
  const errors = validationResult(req)
  if(!errors.isEmpty()) {
    const alert = errors.array()
    dbCon.collection("domain").find({}).toArray((err,result)=>{
      if(err) throw err;
    res.render('addservice', {alert,"domain":result})
    })
  }
  else
  {
        var service=req.body.adddomainexist
        var subservice=req.body.subdomain
        var cost=parseInt(req.body.cost)
        var image=req.file.filename

          dbCon.collection("services").insertOne({"domain":service,"subdomain":subservice,"cost":cost,"image":image},(err,result)=>{
           if(err) throw err;
           res.redirect('/admin/servicedashboard')  
        })
  }
})


router.post('/saveservicenew',upload.single("domainimage"),[
  check('cost','Enter Cost')
      .notEmpty(),
  check('adddomain')
    .custom((adddomain)=>{
    return new Promise((resolve,reject)=>{
      dbCon.collection("domain").findOne({"domain":adddomain},(err,result)=>{
        if(result)
        {
          reject(new Error('Service Already Exists'))
        }
        else
        {
          resolve(true)
        }
      })
    })
  }),
  check('subdomain')
      .custom((subdomain)=>{
        return new Promise((resolve,reject)=>{
            dbCon.collection('services').findOne({"subdomain":subdomain},(err,result)=>{
              if(result)
              {
                reject(new Error('Sub Service Already Exists'))
              }
              else
              {
                resolve(true)
              }
            })
        })
      })

],(req,res)=>{
  const errors = validationResult(req)
  if(!errors.isEmpty()) {
    const alert = errors.array()
    dbCon.collection("domain").find({}).toArray((err,result)=>{
      if(err) throw err;
    res.render('addservice', {alert,"domain":result})
    })
  }
  else
  {
        var service=req.body.adddomain
        var subservice=req.body.subdomain
        var cost=parseInt(req.body.cost)
        var image=req.file.filename
          async function save(){ 
          try
          {
            var domain=await dbCon.collection("domain").insertOne({"domain":service})
            var services=await dbCon.collection("services").insertOne({"domain":service,"subdomain":subservice,"cost":cost,"image":image})
            res.redirect('/admin/servicedashboard')
          }
          catch(e)
          {
             console.log(e)
          }
        }
        save()
  }
})

router.get('/servicedashboard',(req,res)=>{

  dbCon.collection("domain").find({}).toArray((err,result1)=>{
    if(err) throw err
      res.render('addservice',{"domain":result1,"alert":{},"alertmsg":true})
    })
})

router.get('/adminpendingorders',(req,res)=>{
 
  async function penord()
  {
    try
    {
        const[temp1,temp2]=await Promise.all([
 
        dbCon.collection("orders").find({}).toArray(),    
        dbCon.collection("acceptedorders").find({}).toArray()
      ])
        res.render('adminpendingorders',{"key":temp1,"acceptdetails":temp2})
    }
    catch(e)
    {
      console.log(e)
    }
  }
  penord()
})


router.get('/admincompletedorders',(req,res)=>{
  
    dbCon.collection("completedorders").find({}).toArray((err,result)=>{
      if(err) throw err;
        res.render('admincompletedorders',{"key":result})
    })
})

router.get('/ordersdata',(req,res)=>{
  
    async function data()
    {
      try
      {
        const [temp1,temp2]=await Promise.all([

        dbCon.collection("completedorders").aggregate([{$group:{_id:"$subdomain",count:{$sum:1}}}]).toArray(),
        dbCon.collection("services").find({}).toArray()
      ])
        res.render('ordersdata',{"services":temp2,"key":temp1})
      }
  
    catch(e)
    {
      console.log(e)
    }
  }
    data() 
})


router.get('/professionalapplications',(req,res)=>{
 
    dbCon.collection("professionalusers").find({"status":"pending"}).toArray((err,result)=>{
      if(err) throw err;
        res.render('viewapplications',{"key":result,"alertmsg":'a'})
    })
  
})


router.get('/acceptapplication/:name',(req,res)=>{
 
    var user=req.params.name

      async function accept(){
      try
      {
          var user1=await dbCon.collection("professionalusers").updateOne({"name":user},{$set:{"status":"accepted"}}) 
          var user2=await dbCon.collection("professionalusers").findOne({"name":user})
          var status=await dbCon.collection("employeestatus").insertOne({"name":user,"number":user2.number,"domain":user2.domain,"status":"free"})
          res.redirect('/admin/appdashboard1')
      }
      catch(e)
      {
          console.log(e)
      }
    }
    accept()
})


router.get('/declineapplication/:name',(req,res)=>{
 
    var user=req.params.name
    dbCon.collection("professionalusers").updateOne({"name":user},{$set:{"status":"declined"}},(err,result)=>{
        if(err) throw err;
        res.redirect('/admin/appdashboard2')
    })
})

router.get('/appdashboard1',(req,res)=>{

  dbCon.collection("professionalusers").find({"status":"pending"}).toArray((err,result)=>{
    if(err) throw err;
      res.render('viewapplications',{"key":result,"alertmsg":true})
  })
})

router.get('/appdashboard2',(req,res)=>{

  dbCon.collection("professionalusers").find({"status":"pending"}).toArray((err,result)=>{
    if(err) throw err;
      res.render('viewapplications',{"key":result,"alertmsg":false})
  })
})

router.get('/employeeinfo',(req,res)=>{
 
      dbCon.collection("employeestatus").find({"status":"free"}).toArray((err,result)=>{
        if(err) throw err;
          res.render('employeeinfo',{'key':result})
      })
})

router.get('/employeework',(req,res)=>{
 
      dbCon.collection("employeestatus").find({"status":"work"}).toArray((err,result)=>{
        if(err) throw err;
          res.render('employeework',{'key':result})
      })
})

router.get('/usersdetails',(req,res)=>{

  dbCon.collection("users").find().toArray((err,result)=>{
    if(err) throw err;
    res.render('usersdetails',{"key":result})
  })

})

module.exports=router;