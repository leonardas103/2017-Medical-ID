var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var crypto = require('crypto');
var algorithm = 'aes256';

var User = require('../models/user');

var bcrypt = require('bcryptjs');
var async = require('async');
var nodemailer = require('nodemailer');

// Login
router.get('/login', function(req, res){
	res.render('login');
});

router.get('/newcode', function(req, res) {
	if (req.user) {
		req.user.code = genCode();
		// this function is separated to allow handling code uniqueness errors
		updateUser(req, res);
	}
});

// Register User
router.post("/register", function(req,res){
	var name = req.body.name;
	var email = req.body.email.toLowerCase();
	var password = req.body.password;
	var password2 = req.body.password2;

	// Validation
	req.checkBody('name', 'Name is required').notEmpty();
	req.checkBody('email', 'Email is required').notEmpty();
	req.checkBody('email', 'Email is not valid').isEmail();
	req.checkBody('password', 'Password is required').notEmpty();
	req.checkBody('password2', 'Passwords do not match').equals(req.body.password);

	var errors = req.validationErrors();

	if(errors){
		res.render('login',{ errors: errors });
	} else {
		var newUser = new User({
			name: name,
			email: email,
			password: password,
			code: genCode(),
			verified: false,
			cardNum: 7,
			picture: "img/placeholder.png",
			fields: [
				{"label": "Name", "field": name, "inprofile": true},
				{"label": "Date of Birth", "field": "", "inprofile": true},
				{"label": "Blood type", "field": "", "inprofile": true},
				{"label": "Donor", "field": "", "inprofile": true},
				{"label": "Insurance", "field": "", "inprofile": true}
			]
		});

		// this function is separated to allow handling code uniqueness errors
		createUser(req, res, newUser);
		
		// send new user an email to verify their email address
		async.waterfall([
			function(done) {
			  crypto.randomBytes(20, function(err, buf) {
			//Generate our reset token	
				var token = buf.toString('hex');
				done(err, token);
			  });
			},
			//Find user with email, save token value and expiry time:
			function(token, done) {
				user.resetPasswordToken = token;
				user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

				user.save(function(err) {
				  done(err, token, user);
				});
			},
			//Logs in to gmail via nodemailer using SMTP and sends the email containing the reset token
			//TODO: use a configuration file (added to .gitignore) and add the file to the server manually. 
			function(token, user, done) {
			  var transporter = nodemailer.createTransport({
				service: 'Gmail',
				auth: {
					user: 'medicalid17@gmail.com',
					pass: 'enterpasswordhere'
				}
				});
			  var mailOptions = {
				to: user.email,
				from: 'passwordreset@medid.herokuapp.com',
				subject: 'Node.js Password Reset',
				text: 'You are receiving this email because you (or someone else) need to verify the email adress used for your account.\n\n' +
				  'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
				   'http://'+req.headers.host + '/verify/' + token + '\n\n' +
				  'If you did not request this, please ignore this email and this email adress will not be verified.\n'
			  };
			  
			  transporter.sendMail(mailOptions, function(err) {
				req.flash('info', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
				done(err, 'done');
			  });
			  req.flash('success_msg', 'An e-mail has been sent to you');
			}
		  ], function(err) {
			if (err) return next(err);
			res.redirect('/forgot');
			req.flash('error_msg', 'Error');
		  });
	}
});

passport.use(new LocalStrategy(
  function(email, password, done) {
   User.getUserByEmail(email.toLowerCase(), function(err, user){
   	if(err) throw err;
   	if(!user){
   		return done(null, false, {message: 'Unknown user'});
   	}

   	User.comparePassword(password, user.password, function(err, isMatch){
   		if(err) throw err;
   		if(isMatch){
   			return done(null, user);
   		} else {
   			return done(null, false, {message: 'Invalid password'});
   		}
   	});
   	
   	if (!User.verified) {
		//TODO: return to verify page
		return done(null, false, {message: 'Email needs to be verified'});
	}
   });
  })
);

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.getUserById(id, function(err, user) {
    done(err, user);
  });
});

router.post('/login',
  passport.authenticate('local', {successRedirect:'/create', failureRedirect:'/users/login',failureFlash: true}),
  function(req, res) {
    res.redirect('/');
  });

router.get('/logout', function(req, res){
	req.logout();
	req.flash('success_msg', 'You are logged out');
	res.redirect('/users/login');
});

function genCode() {
	var LENGTH = 12;
	var ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

	var result = '';
  for (var i = LENGTH; i > 0; --i) result += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return result;
}

// attempts to create a new user entry into the database
function createUser(req, res, newUser){
	User.createUser(newUser, function(err, user){
		if(err){
			if (err.errors.kind === 'unique'){
				if(err.errors.email){
					// same e-mail
					req.flash('error_msg', 'Email address is already in use');
				}
				else if(err.errors.code){
					// existing code, generate new one and try again
					newUser.code = genCode();
					createUser(req, res, newUser);
				}
				else
					throw err;
			}
			else
				throw err;
		}
		else
			req.flash('success_msg', 'You are registered and can now login');

		res.redirect('/users/login');
	});
}

function updateUser(req, res){
	User.updateUser(req.user, function(err){
		if(err){
			if (err.errors.code && err.errors.kind === 'unique')
			{
				// existing code, generate new one and try again
				req.user.code = genCode();
				updateUser(req, res);
			}
			else
				throw err;
		}

		req.flash('success_msg', "Your personal code is now updated. All old references to your profile, including your cards, are now deprecated and will no longer work.");
		res.redirect('/create');
	});
}

module.exports = router;
