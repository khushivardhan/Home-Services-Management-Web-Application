const express = require('express');
const path = require('path');
const logger = require('morgan');
const mongocon = require( './public/utils/mongocon' );
const app = express();
const cookieparser=require('cookie-parser');

mongocon.connectToServer( function( err) {
    if (err) console.log(err);
    const usersRouter = require('./routes/users');
    const adminRouter = require('./routes/admin');
    const professionalRouter =require('./routes/professional');

    app.use('/users', usersRouter);
    app.use('/admin', adminRouter);
    app.use('/professional',professionalRouter);   
});

app.use(logger('dev'));
app.use(express.json()); //  to recognize the incoming Request Object as a JSON Object 
app.use(express.urlencoded({ extended: false })); //  to recognize the incoming Request Object as strings or arrays ( parsed with querystring library(cannot post nested objects))

app.use(express.static(path.join(__dirname, 'public'))); // join static files in public to project
app.use(cookieparser())
app.set('view engine','ejs')

module.exports = app;
