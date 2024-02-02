const express = require('express');
const passport = require('passport');
const bcrypt = require('bcrypt');
const User = require('../models/User'); // Adjust the path accordingly
const router = express.Router();

// ... (your existing auth.js code)



// Render login form
router.get('/login', (req, res) => {
  res.render('login');
});

// Handle login
router.post('/login', passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/login',
  failureFlash: true,
}));

// Render signup form
router.get('/signup', (req, res) => {
  res.render('signup');
});

// Handle user registration
router.post('/signup', async (req, res) => {
  const { username, password, email } = req.body;

  // Validate input
  if (!username || !password || !email) {
    req.flash('error', 'Invalid input');
    return res.redirect('/signup');
  }

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      req.flash('error', 'User already exists');
      return res.redirect('/signup');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({
      username,
      password: hashedPassword,
      email,
    });

    // Save the user to the database
    await newUser.save();

    req.flash('success', 'Registration successful! You can now log in.');
    res.redirect('/login');
  } catch (error) {
    console.error('Error during user registration:', error);
    req.flash('error', 'Internal Server Error');
    res.redirect('/signup');
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

module.exports = router;
