const express = require('express');
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const session = require('express-session');
const threeDays = 3 * 24 * 60 * 60 * 1000; // 3 DAYS IN MILLISECONDS
const prisma = new PrismaClient();

// INITIALIZE THE SESSION MIDDLEWARE
router.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: threeDays
  }
}));

// GET LOGIN 
router.get('/', async function (req, res, next) {
  // Check if the admin or manager is logged in
  if (req.session.adminId) {
    // Redirect to the admin dashboard
    return res.redirect('/admin/records');
  }

  // Render the login page
  res.render('login', { title: 'Express' });
});

// POST LOGIN
router.post('/', async function (req, res, next) {
  try {
    const { username, password } = req.body;
    const admin = await prisma.admin.findUnique({
      where: { username },
      select: { id: true, password: true },
    });

    if (admin) {
      if (admin.password === password) {
        // ADMIN LOGIN SUCCESSFUL
        req.session.adminId = admin.id; // STORE ADMIN ID IN SESSION
        return res.redirect('/admin/records'); // REDIRECT TO RECORDS.EJS
      }
    }

    // INCORRECT USERNAME OR PASSWORD (ERROR MESSAGE)
    return res.render('login', { error: 'Incorrect username or password' });
  } catch (error) {
    console.error(error);
    return res.render('login', { error: 'An error occurred' });
  }
});

// LOG OUT
router.get('/admin/logout', function (req, res, next) {
  // CLEAR ADMIN ID FROM SESSION
  req.session.adminId = null;
  res.redirect('/');
});

module.exports = router;
