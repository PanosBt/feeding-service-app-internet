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
        hostname: '83.212.102.58',
        port: 8080,
        path: '/api/authorize?' + postData,
        method: 'GET',
        headers: {
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    //create and send request to API
    let apiRequest = http.request(options, (apiRes) =>{
        console.log(`STATUS: ${apiRes.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(apiRes.headers)}`);
        apiRes.setEncoding('utf8');
        apiRes.on('data', (body) => {
            let responseBody = JSON.parse(body);
            if (responseBody.authenticated && responseBody.student) {
                console.log('User authorized');
                //req.param(responseBody.username);
                res.redirect('/userfound/' + responseBody.username);
            } else {
                console.log('User not authorized');
                res.render('login', {title: 'StudentServiceApp', authorize: false});
            }
        });
        //print when there is no more data in response
        apiRes.on('end', () => {
            console.log('No more data in response.');
        });
    });

    apiRequest.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });
    //end request
    apiRequest.end();
});

app.get('/userfound/:username',(req, res) => {

    let options = {
        hostname: '83.212.102.58',
        port: 8080,
        path: '/api/students?username=' + req.params.username,
        method: 'GET',
        headers: {
            'Content-Length': Buffer.byteLength(req.params.username)
        }
    };

    let apiRequest = http.request(options, (apiRes) =>{
        console.log(`STATUS: ${apiRes.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(apiRes.headers)}`);
        apiRes.setEncoding('utf8');
        apiRes.on('data', (body) => {
            let responseBody = JSON.parse(body);
            console.log(responseBody);
            //checks if the students data is initialized
            if (responseBody.data_init === false) {
                console.log('No data for this student');
                res.render('no-data');
            }
            else {
                let pugVar = {'responseBody': responseBody};
                res.render('student-page', pugVar);
                //res.render('student-page');
            }
        });
        //print when there is no more data in response
        apiRes.on('end', () => {
            console.log('No more data in response.');
        });
    });

    apiRequest.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });

    //end request
    apiRequest.end();
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
