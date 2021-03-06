var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var exphbs = require('express-handlebars');
var expressValidator = require('express-validator');
var flash = require('connect-flash');
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongo = require('mongodb');
var mongoose = require('mongoose');
var serverSettings = require('./serverSettings.js');
var forceHttps = require('express-force-https');

mongoose.connect(serverSettings.parameters.db || 'mongodb://root:toor@med-shard-00-00-mgwxu.mongodb.net:27017,med-shard-00-01-mgwxu.mongodb.net:27017,med-shard-00-02-mgwxu.mongodb.net:27017/loginapp?ssl=true&replicaSet=med-shard-0&authSource=admin');
if (serverSettings.parameters.db) {
	console.log("Connected to custom database '" + serverSettings.parameters.db + "'.");
}

//mongoose.connect('mongodb://localhost/loginapp');
var db = mongoose.connection;

var routes = require('./routes/index');
var users = require('./routes/users');
var create = require('./routes/create');
var save = require('./routes/save');
var profile = require('./routes/profile');
var forgot = require('./routes/forgot');


// Init App
var app = express();

// View Engine
app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', exphbs({defaultLayout:'layout'}));
app.set('view engine', 'handlebars');

// BodyParser Middleware
app.use(bodyParser.json({limit: '1mb'}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Set Static Folder
app.use(express.static(path.join(__dirname, 'public')));

// Express Session
app.use(session({
    secret: 'secret',
    saveUninitialized: true,
    resave: true
}));

// Force HTTPS when not connecting to localhost
if (!serverSettings.parameters.http) {
	app.use(forceHttps);
} else {
	console.log("Warning: running in (unsecure) HTTP mode.");
}

// Passport init
app.use(passport.initialize());
app.use(passport.session());

// Express Validator
app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
      var namespace = param.split('.')
      , root    = namespace.shift()
      , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));

// Connect Flash
app.use(flash());

// Global Vars
app.use(function (req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  next();
});



app.use('/', routes);
app.use('/users', users);
app.use('/create', create);
app.use('/save', save);
app.use('/profile', profile);
app.use('/forgot', forgot);


// Set Port
app.set('port', (process.env.PORT || 3000));

app.listen(app.get('port'), function(){
	console.log("Server started on port " + app.get('port') + ".");
});
