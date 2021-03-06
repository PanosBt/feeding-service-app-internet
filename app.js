const querystring = require('querystring');
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const theReqWeNeed = require('request');
const multer  = require('multer');
const fs = require('fs');

const app = express();

// const baseDir = __dirname;

const tmpPath = 'tmp/uploads';

const maxSize = 1000000;
const upload = multer({dest: tmpPath,
    limits: {
        fileSize: maxSize
    }
});
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


const apiHostname = '83.212.102.58';
const apiPort = 8080;
const apiStaticPath = '/api';
const apiStaticUrl = 'http://' + apiHostname + ':' + apiPort + '/api';

let sess;
// '/' router (login page or student page if user already logged in)
app.get('/', (req, res) => {
    // get current session
    sess = req.session;

    // if student is already logged in
    // redirect them to /student
    if (typeof sess.username !== 'undefined')
        res.redirect('/student');
    res.render('login')
});

//authentication method
app.post('/login', (req, res) => {

    sess = req.session;

    //stringify the params
    const authData = querystring.stringify({
        username: req.body.username,
        password: req.body.password
    });
    //object with url call options
    let authAPIReqOptions = {
        hostname: apiHostname,
        port: apiPort,
        path: apiStaticPath + '/authorize?' + authData,
        method: 'GET',
        headers: {
            'Content-Length': Buffer.byteLength(authData)
        }
    };

    //create and send request to API
    let authAPIReq = http.request(authAPIReqOptions, (authAPIResp) =>{
        console.log(`STATUS: ${authAPIResp.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(authAPIResp.headers)}`);
        authAPIResp.setEncoding('utf8');
        authAPIResp.on('data', (body) => {
            let authAPIResponseBody = JSON.parse(body);
            if (authAPIResponseBody.authenticated && authAPIResponseBody.student) {
                console.log('User authorized');
                sess.username = authAPIResponseBody.username;
                res.redirect('/student');
            } else {
                console.log('User not authorized');
                // this would be wrong in production, js
                // u know reloading the whole page just for a message
                // this is what js is for... :P
                res.render('login', {authorize: false});
            }
        });
        //print when there is no more data in response
        authAPIResp.on('end', () => {
            console.log('No more data in response.');
        });
    });

    authAPIReq.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });
    //end request
    authAPIReq.end();
});

app.get('/student',(req, res) => {

    sess = req.session;

    console.log('Session object: ' + sess);
    console.log('Session username ' + sess.username);

    console.log(req.query.fileSizeExc);

    // if user hasn't log in or if session has expired
    // redirect them to login page
    if (typeof sess.username === 'undefined')
        res.redirect('/');

    let studentsAPIReqOptions = {
        hostname: apiHostname,
        port: apiPort,
        path: apiStaticPath + '/students?username=' + sess.username,
        method: 'GET',
        headers: {
            'Content-Length': Buffer.byteLength(sess.username)
        }
    };

    let studentsAPIReq = http.request(studentsAPIReqOptions, (studentsAPIResp) =>{
        console.log(`STATUS: ${studentsAPIResp.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(studentsAPIResp.headers)}`);
        studentsAPIResp.setEncoding('utf8');
        studentsAPIResp.on('data', (body) => {
            let studentsAPIResponseBody = JSON.parse(body);
            console.log(studentsAPIResponseBody);
            //checks if the students data is initialized
            if (!studentsAPIResponseBody.data_init) {
                console.log('No data for this student');
                res.render('login', {data_nit: false});
            }
            else {
                let applStatusAPIReqOptions = {
                    hostname: apiHostname,
                    port: apiPort,
                    path: apiStaticPath + '/students/' + studentsAPIResponseBody.id + '/appl_status/' + (new Date()).getFullYear(),
                    method: 'GET'
                };

                // get application data from API
                let applDataAPIReq = http.request(applStatusAPIReqOptions, (applDataAPIResp) => {
                    applDataAPIResp.setEncoding('utf8');
                    applDataAPIResp.on('data', (body) => {
                        let applDataAPIResponseBody = JSON.parse(body);
                        console.log(applDataAPIResponseBody);

                        // when both APIs have returned data
                        // pass them to student-page
                        res.render('student-page', {
                            'student': studentsAPIResponseBody,
                            'applStatus': applDataAPIResponseBody,
                            'fileSizeExc': req.query.fileSizeExc
                        });

                    });
                });

                applDataAPIReq.on('error', (e) => {
                    console.error(`problem with request: ${e.message}`);
                });

                applDataAPIReq.end();
            }
        });
        //print when there is no more data in response
        studentsAPIResp.on('end', () => {
            console.log('No more data in response.');
        });
    });

    studentsAPIReq.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });

    //end request
    studentsAPIReq.end();

});

app.post('/updatestudent/:id', (req, res) => {

    sess = req.session;

    if (typeof sess.username === 'undefined')
        res.redirect('/');

    let studentModification = {
        // if email or phone is an empty string, send null to the API to prevent possible overwrite
        'email' : req.body.email?req.body.email:null,
        'phone': req.body.phone?req.body.phone:null
    };

    let updateStudentAPIReqOptions = {
        hostname: apiHostname,
        port: apiPort,
        path: apiStaticPath + '/students/' + req.params.id,
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
    };

    let updateStudentAPIReq = http.request(updateStudentAPIReqOptions, (updateStudentAPIResp) =>{
        console.log(`STATUS: ${updateStudentAPIResp.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(updateStudentAPIResp.headers)}`);
        updateStudentAPIResp.setEncoding('utf8');
        updateStudentAPIResp.on('data', (body) => {
            let responseBody = JSON.parse(body);
            console.log(responseBody);
            res.status(updateStudentAPIResp.statusCode);
            let bodyStr = updateStudentAPIResp.statusCode === 200 ?
                'Student data updated':
                'Student data update failed';
            res.send(bodyStr);

        });
        //print when there is no more data in response
        updateStudentAPIResp.on('end', () => {
            console.log('No more data in response.');
        });
    });
    updateStudentAPIReq.write(JSON.stringify(studentModification));

    updateStudentAPIReq.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
        res.status(500);
        res.send('Internal server error');
    });

    //end request
    updateStudentAPIReq.end();
    console.log(studentModification);
});

let docUpload = upload.fields([{
    name: 'EKK', maxCount: 1
}, {
    name: 'POK', maxCount: 1
}, {
    name: 'PK', maxCount: 1
}, {
    name:'BAM', maxCount: 1
}, {
    name: 'BAP', maxCount: 1
}]);

// create application router
app.post('/createapplication/:student_id', docUpload,  (req, res) => {
    sess = req.session;

    if (typeof sess.username === 'undefined')
        res.redirect('/');

    //first create application JSON
    const application = {
        'student_id' : req.params.student_id,
        'familyIncome' : req.body.income,
        'num_siblings' : req.body.numOfSiblings,
        'origin_city' : req.body.city,
        'mother_employeed' : req.body.mother_employed,
        'father_employeed' : req.body.father_employed
    };

    console.log(application);
    let createApplicationAPIReqOptions = {
        hostname: apiHostname,
        port: apiPort,
        path: apiStaticPath + '/application',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
    };

    //API call to create an application
    let createApplicationReq = http.request(createApplicationAPIReqOptions, (createApplicationResp) =>{
        console.log(`createApplicationReq STATUS: ${createApplicationResp.statusCode}`);
        console.log(`createApplicationReq HEADERS: ${JSON.stringify(createApplicationResp.headers)}`);
        createApplicationResp.setEncoding('utf8');
        createApplicationResp.on('data', (body) => {
            let responseBody = JSON.parse(body);

            //Application created with success
            if (createApplicationResp.statusCode === 201) {
                let completedRequests = 0;

                console.log('beginning loop for application with id ' + responseBody.appl_id);

                let fileTypes = Object.keys(req.files);

                // send (async) each document to the API
                let baseReqUrl = apiStaticUrl + '/application/' + responseBody.appl_id + '/documents/';

                for (let key in req.files) {
                    let file = req.files[key][0];

                    // API call to send document
                    let docUploadAPIReq = theReqWeNeed.post(baseReqUrl + file.fieldname, function (err, resp, body) {
                        fs.unlink(file.path, function (err) {
                            if (err)
                                console.log(err);
                            else
                                console.log('file in ' + file.path + ' deleted!');
                        });
                        if (err)
                            console.log(resp.status());
                        else {
                            if(++completedRequests === fileTypes.length)
                                //Uploading finished!
                                res.redirect('/student');
                            else
                                console.log('Completed ' + completedRequests + ' so far');
                            console.log(body);
                        }
                    });

                    let form = docUploadAPIReq.form();
                    form.append('document', fs.createReadStream(file.path), {
                        filename: file.fieldname,
                        contentType: 'application/pdf'
                    });
                }
            }
            else
                console.log('createApplicationResp.statusCode is ' + createApplicationResp.statusCode);
        });
        //print when there is no more data in response
        createApplicationResp.on('end', () => {
            console.log('No more data in response.');
        });
    });
    createApplicationReq.write(JSON.stringify(application));

    createApplicationReq.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });

    //end request
    createApplicationReq.end();
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
app.use(function (err, req, res, next) {

    if (err.code === 'LIMIT_FILE_SIZE') {
        console.log(err.message);
        // this is a bad hack for when u don't have enough time...
        res.redirect('/student?fileSizeExc=true');
    } else {
        // set locals, only providing error in development
        res.locals.message = err.message;
        res.locals.error = req.app.get('env') === 'development' ? err : {};

        // render the error page
        res.status(err.status || 500);
        res.render('error');
    }
});

module.exports = app;
