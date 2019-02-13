
const querystring = require('querystring');
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

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
    path: '/feeding-service-app/api/authorize?' + postData,
    method: 'GET',
    headers: {
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  //create the request on API
  let apirequest = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    res.on('data', (body) => {
      //TODO save body to a json object
      console.log(`BODY: ${body}`);
    });
    res.on('end', () => {
      console.log('No more data in response.');
    });
  });

  apirequest.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
  });
  apirequest.end();

  res.send('Hey!');
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
