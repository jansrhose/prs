const express = require('express');
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const session = require('express-session');
const threeDays = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
const prisma = new PrismaClient();

// Initialize the session middleware
router.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: threeDays
  }
}));

/* GET Login */
router.get('/', async function (req, res, next) {
  // Check if the admin or manager is logged in
  if (req.session.adminId) {
    // Redirect to the admin dashboard
    return res.redirect('/admin/records');
  }

  // Render the login page
  res.render('login', { title: 'Express' });
});

/* POST login */
router.post('/', async function (req, res, next) {
  try {
    const { username, password } = req.body;
    const admin = await prisma.admin.findUnique({
      where: { username },
      select: { id: true, password: true },
    });

    if (admin) {
      if (admin.password === password) {
        // Admin login successful
        req.session.adminId = admin.id; // Store admin ID in session
        return res.redirect('/admin/records'); // Redirect to records.ejs
      }
    }

    // Incorrect username or password
    return res.render('login', { error: 'Incorrect username or password' });
  } catch (error) {
    console.error(error);
    return res.render('login', { error: 'An error occurred' });
  }
});

router.get('/admin/logout', function (req, res, next) {
  // Clear admin ID from session
  req.session.adminId = null;
  res.redirect('/');
});

module.exports = router;
