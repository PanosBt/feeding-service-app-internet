const querystring = require('querystring');
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
var myParser = require("body-parser");

const app = express();
const http = require('http');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('login', {title: 'StudentServiceApp'})
});

//authentication method
app.post('/login', (req, res) => {
    //stringify the params
    const postData = querystring.stringify({
        'username': req.param('username'),
        'password' : req.param('password')
    });
    //object with url info and params
    let options = {
        hostname: 'localhost',
        port: 8080,
        path: '/api/authorize?' + postData,
        method: 'GET',
        headers: {
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    let responseBody = [];
    //create and send request to API
    let apirequest = http.request(options, (apiRes) =>{
        console.log(`STATUS: ${apiRes.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(apiRes.headers)}`);
        apiRes.setEncoding('utf8');
        apiRes.on('data', (body) => {
            responseBody = JSON.parse(body);
            if (responseBody.authenticated === true) {
                console.log('YAY');
                res.redirect('/userfound/' + responseBody.username);
            } else {
                console.log('nah');
                res.render('login', {title: 'StudentServiceApp', authorize: false});
            }
        });
        //print when there is no more data in response
        apiRes.on('end', () => {
            console.log('No more data in response.');
        });
    });

    apirequest.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });
    //end request
    apirequest.end();
    //console.log(responseBody.authenticated);

    //res.send('Hey!');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
