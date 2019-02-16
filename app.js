const querystring = require('querystring');
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
var myParser = require("body-parser");

const app = express();
const http = require('http');

const session = require('express-session');


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//session initialization
app.use(session({
        secret: 'secretpotato',
        resave: false,
        saveUninitialized: true
    }
));

let sess;

app.get('/', (req, res) => {
    // get current session
    sess = req.session;

    // if student is already logged in
    // redirect them to /student
    if (typeof sess.username !== 'undefined')
        res.redirect('/student');
    res.render('login', {title: 'StudentServiceApp'})
});

//authentication method
app.post('/login', (req, res) => {

    sess = req.session;

    //stringify the params
    const postData = querystring.stringify({
        username: req.body.username,
        password: req.body.password
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
                sess.username = responseBody.username;
                // res.redirect('/userfound/' + responseBody.username);
                res.redirect('/student');
            } else {
                console.log('User not authorized');
                // this would be wrong in production, js
                // u know reloading the whole page just for a message
                // this is what js is for... :P
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

    app.get('/student',(req, res) => {

    sess = req.session;

    console.log('Session object: ' + sess);
    console.log('Session username ' + sess.username);

    // if user hasn't log in or if session has expired
    // redirect them to login page
    if (typeof sess.username === 'undefined')
        res.redirect('/');

    let options = {
        hostname: '83.212.102.58',
        port: 8080,
        path: '/api/students?username=' + sess.username,
        method: 'GET',
        headers: {
            'Content-Length': Buffer.byteLength(sess.username)
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
                // let pugVar = {'responseBody': responseBody};
                res.render('student-page', {
                    'student': responseBody
                });


                // console.log('!!!!!!\n' + JSON.stringify(obj.locals));
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

app.post('/updatestudent/:id', (req, res) => {

    sess = req.session;

    if (typeof sess.username === 'undefined')
        res.redirect('/');

    const studentModification = {
        'email' : req.body.email,
        'phone': req.body.phone
    };

    let options = {
        hostname: '83.212.102.58g',
        port: 8080,
        path: '/api/students/' + req.params.id,
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
    };

    let apiRequest = http.request(options, (apiRes) =>{
        console.log(`STATUS: ${apiRes.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(apiRes.headers)}`);
        apiRes.setEncoding('utf8');
        apiRes.on('data', (body) => {
            let responseBody = JSON.parse(body);
            console.log(responseBody);
            let updated = apiRes.statusCode === 200;
            res.render('student-page.pug', {
                student: responseBody,
                dataUpdated: updated

            });


        });
        //print when there is no more data in response
        apiRes.on('end', () => {
            console.log('No more data in response.');
        });
    });
    apiRequest.write(JSON.stringify(studentModification));

    apiRequest.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });

    //end request
    apiRequest.end();
    console.log(studentModification);
    // res.render('unimplemented');
});

// logout router
app.post('/logout', (req, res) => {
    req.session.destroy(function (err) {
        if (err)
            console.log(err);
        else
            res.redirect('/');
    });
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
