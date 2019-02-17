const querystring = require('querystring');
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
var myParser = require("body-parser");


const app = express();
const multer  = require('multer');
var storage = multer.memoryStorage();
var upload = multer({ storage: storage });
//const upload = multer({ dest: 'uploads/' })
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
    const authData = querystring.stringify({
        username: req.body.username,
        password: req.body.password
    });
    //object with url info and params
    let authAPIReqOptions = {
        // hostname: '83.212.102.58',
        hostname: apiHostname,
        // port: 8080,
        port: apiPort,
        // path: '/api/authorize?' + authData,
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
                //req.param(authAPIResponseBody.username);
                sess.username = authAPIResponseBody.username;
                // res.redirect('/userfound/' + authAPIResponseBody.username);
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
            // if (studentsAPIResponseBody.data_init === false) {
            if (!studentsAPIResponseBody.data_init) {
                console.log('No data for this student');
                res.render('no-data');
            }
            else {
                // let pugVar = {'studentsAPIResponseBody': studentsAPIResponseBody};
                // prepare request to get appldata
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
                        console.log(applDataAPIResponseBody); //DEBUG

                        // when both APIs have returned data
                        // pass them to student-page
                        res.render('student-page', {
                            'student': studentsAPIResponseBody,
                            'applStatus': applDataAPIResponseBody
                        });

                    });
                });

                applDataAPIReq.on('error', (e) => {
                    console.error(`problem with request: ${e.message}`);
                });

                applDataAPIReq.end();


                // console.log('!!!!!!\n' + JSON.stringify(obj.locals));
                //res.render('student-page');
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
            // let updated = updateStudentAPIResp.statusCode === 200;
            res.status(updateStudentAPIResp.statusCode);
            let bodyStr = updateStudentAPIResp.statusCode === 200 ?
                'Student data updated':
                'Student data update failed';
            res.send(bodyStr);
            // res.render('student-page.pug', {
            //     student: responseBody
            //
            // });
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
    // res.render('unimplemented');
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

function uploadDocAPI(file, applicationId) {

    let docUploadAPIReqOptions = {
        hostname: apiHostname,
        port: apiPort,
        path: apiStaticPath + '/application/' + applicationId + '/documents/' + file.fieldname,
        method: 'POST',
        headers: {
            'Content-Type': 'multipart/form-data'
        },
    };

    let docUploadReq = http.request(docUploadAPIReqOptions, (docUploadRes) =>{
        console.log(`STATUS: ${docUploadRes.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(docUploadRes.headers)}`);
        docUploadRes.setEncoding('utf8');
        docUploadRes.on('data', (body) => {
            let responseBody = JSON.parse(body);
            console.log(responseBody);
        });
        //print when there is no more data in response
        docUploadRes.on('end', () => {
            console.log('No more data in response.');
        });
    });
    docUploadReq.write(file.buffer);

    docUploadReq.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });

    //end request
    docUploadReq.end();

}

app.post('/createapplication/:id', docUpload,  (req, res) => {
    sess = req.session;

    if (typeof sess.username === 'undefined')
        res.redirect('/');

    //first create application JSON
    const application = {
        'student_id' : req.params.id,
        'familyIncome' : req.body.income,
        'num_siblings' : req.body.numOfSiblings,
        'origin_city' : req.body.city,
        'mother_employeed' : req.body.mother_employed,
        'father_employeed' : req.body.father_employed
    }

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
        console.log(`STATUS: ${createApplicationResp.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(createApplicationResp.headers)}`);
        createApplicationResp.setEncoding('utf8');
        createApplicationResp.on('data', (body) => {
            let responseBody = JSON.parse(body);
            console.log(responseBody.appl_id);
            console.log(req.files['EKK'][0].fieldname);
             if (createApplicationResp.statusCode===201) {
                 //Application created with success
                 uploadDocAPI(req.files['EKK'][0], responseBody.appl_id);
             }
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
    res.render('unimplemented');
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
