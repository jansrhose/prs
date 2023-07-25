const express = require('express');
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const Joi = require('joi');
const multer = require('multer');
const upload = multer().single('photo');
const fs = require('fs');
const flash = require('express-flash');
const session = require('express-session');
const cron = require('node-cron');

// Add session middleware
router.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

// Use express-flash middleware
router.use(flash());

// Middleware to validate user session
function validateSession(req, res, next) {
  if (req.session.adminId) {
    // User is logged in
    next();
  } else {
    // User is not logged in, redirect to login page
    res.redirect('/');
  }
}
// Schedule the yearly task to update the birthdates
cron.schedule('0 0 1 1 *', async () => {
  try {
    // Retrieve all personnel records from the database
    const allPersonnel = await prisma.personnel.findMany();

    // Update the birthdate for each personnel record
    for (const personnel of allPersonnel) {
      const currentYear = new Date().getFullYear();
      const birthdateWithoutYear = new Date(personnel.birthdate).toISOString().slice(5);
      const updatedBirthdate = new Date(`${currentYear}-${birthdateWithoutYear}`);

      // Update the birthdate in the database
      await prisma.personnel.update({
        where: { id: personnel.id },
        data: { birthdate: updatedBirthdate },
      });
    }
  } catch (error) {
    console.error('Error updating birthdates:', error);
  }
});


// Function to calculate age based on birthdate
function calculateAge(birthdate) {
  const birthdateDate = new Date(birthdate);
  const currentDate = new Date();
  const age = currentDate.getFullYear() - birthdateDate.getFullYear();

  // Check if the birthday has occurred this year or not
  const hasBirthdayOccurredThisYear =
    currentDate.getMonth() > birthdateDate.getMonth() ||
    (currentDate.getMonth() === birthdateDate.getMonth() && currentDate.getDate() >= birthdateDate.getDate());

  return hasBirthdayOccurredThisYear ? age : age - 1;
}


// Define the validation schema using Joi
const personnelSchema = Joi.object({
  id: Joi.string(),
  photo: Joi.string().allow(''),
  employeeNumber: Joi.string().required(),
  rank: Joi.string().required(),
  firstName: Joi.string().required(),
  middleName: Joi.string().allow(''),
  lastName: Joi.string().required(),
  gender: Joi.string().required(),
  birthdate: Joi.date().required(),
  age: Joi.number().integer().min(0).required(),
  mobileNumber: Joi.string().allow(''),
  emailAddress: Joi.string().email().allow(''),
  homeAddress: Joi.string().allow(''),
  civilStatus: Joi.string().allow(''),
  degree: Joi.string().allow(''),
  specialOrderNumber: Joi.string().allow(''),
  entranceToDutyDate: Joi.date().allow(null),
  assignToCIWDate: Joi.date().allow(null),
  coreUnit: Joi.string().allow(''),
  preAssigned: Joi.string().required(),
  concurrent: Joi.string().allow(''),
  remarks: Joi.string().allow(''),
});

// Serve personnel photos
router.get('/personnel/photo/:id', async function (req, res, next) {
  try {
    const personnel = await prisma.personnel.findUnique({
      where: { id: req.params.id },
    });

    if (personnel && personnel.photo) {
      const imageBuffer = Buffer.from(personnel.photo, 'base64');
      res.set('Content-Type', 'image/jpeg');
      res.send(imageBuffer);
    } else {
      const defaultImage = fs.readFileSync('path/to/default/image.jpg');
      res.set('Content-Type', 'image/jpeg');
      res.send(defaultImage);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// GET personnel records
router.get('/admin/records', async function (req, res, next) {
  try {
    // Function to calculate age from birthdate
    function calculateAge(birthdate) {
      const birthdateDate = new Date(birthdate);
      const now = new Date();

      let ageYears = now.getFullYear() - birthdateDate.getFullYear();
      let ageMonths = now.getMonth() - birthdateDate.getMonth();
      let ageDays = now.getDate() - birthdateDate.getDate();

      if (ageMonths < 0 || (ageMonths === 0 && ageDays < 0)) {
        ageYears--;
      }

      return ageYears;
    }

    // Retrieve all personnel records from the database
    const allPersonnel = await prisma.personnel.findMany();

    // Update the age for each personnel record
    for (const personnel of allPersonnel) {
      const age = calculateAge(personnel.birthdate);

      // Update the age in the database
      await prisma.personnel.update({
        where: { id: personnel.id },
        data: { age: age },
      });
    }

    // Fetch the personnel records with updated ages
    const personnels = await prisma.personnel.findMany();

    res.render('admin/records', { title: 'Express', personnels });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});



// POST add personnel record
router.post('/admin/records', validateSession, upload, async function (req, res, next) {
  try {
    // Validate the request body against the defined schema
    const { error, value } = personnelSchema.validate(req.body);
    if (error) {
      req.flash('error', error.details[0].message);
      return res.redirect('/admin/records');
    }

    const {
      employeeNumber,
      rank,
      firstName,
      middleName,
      lastName,
      gender,
      birthdate,
      age,
      mobileNumber,
      emailAddress,
      homeAddress,
      civilStatus,
      degree,
      specialOrderNumber,
      entranceToDutyDate,
      assignToCIWDate,
      coreUnit,
      concurrent,
      remarks,
      preAssigned
    } = value;

    const photoData = req.file ? req.file.buffer : null;

    await prisma.personnel.create({
      data: {
        photo: photoData,
        employeeNumber,
        rank,
        firstName,
        middleName,
        lastName,
        gender,
        birthdate,
        age,
        mobileNumber,
        emailAddress,
        homeAddress,
        civilStatus,
        degree,
        specialOrderNumber,
        entranceToDutyDate,
        assignToCIWDate,
        coreUnit,
        preAssigned,
        concurrent,
        remarks,
      },
    });

    res.redirect('/admin/records');
  } catch (error) {
    console.error(error);
    req.flash('error', 'An error occurred.');
    res.redirect('/admin/records');
  }
});

// POST update personnel record
router.post('/admin/records/:id', upload, async function (req, res, next) {
  try {
    const personnelId = req.params.id;

    const existingPersonnel = await prisma.personnel.findUnique({
      where: { id: personnelId },
    });

    if (!existingPersonnel) {
      req.flash('error', 'Personnel not found.');
      return res.redirect('/admin/records');
    }

    // Validate the request body against the defined schema
    const { error, value } = personnelSchema.validate(req.body);
    if (error) {
      req.flash('error', error.details[0].message);
      return res.redirect(`/admin/records/${personnelId}`);
    }

    const {
      employeeNumber,
      rank,
      firstName,
      middleName,
      lastName,
      gender,
      birthdate,
      age,
      mobileNumber,
      emailAddress,
      homeAddress,
      civilStatus,
      degree,
      specialOrderNumber,
      entranceToDutyDate,
      assignToCIWDate,
      coreUnit,
      concurrent,
      remarks,
      preAssigned,
    } = value;

    // Check if the image is uploaded (req.file is present)
    let photoData;
    if (req.file) {
      photoData = req.file.buffer;
    }

    await prisma.personnel.update({
      where: { id: personnelId },
      data: {
        // Conditionally update the photo field
        ...(photoData && { photo: photoData }),
        employeeNumber,
        rank,
        firstName,
        middleName,
        lastName,
        gender,
        birthdate,
        age,
        mobileNumber,
        emailAddress,
        homeAddress,
        civilStatus,
        degree,
        specialOrderNumber,
        entranceToDutyDate,
        assignToCIWDate,
        coreUnit,
        concurrent,
        remarks,
        preAssigned,
      },
    });

    req.flash('success', 'Personnel record updated successfully.');
    res.redirect('/admin/records');
  } catch (error) {
    console.error(error);
    req.flash('error', 'An error occurred.');
    res.redirect('/admin/records');
  }
});

// DELETE personnel record
router.post('/admin/records/delete/:id', validateSession, async (req, res, next) => {
  try {
    const personnelId = req.params.id; // Extract personnelId from the URL parameter

    const existingPersonnel = await prisma.personnel.findUnique({
      where: {
        id: personnelId,
      },
    });

    if (!existingPersonnel) {
      req.flash('error', 'Personnel not found.');
      return res.redirect('/admin/records');
    }

    await prisma.personnel.delete({
      where: {
        id: personnelId,
      },
    });

    req.flash('success', 'Personnel record deleted successfully.');
    res.redirect('/admin/records');
  } catch (error) {
    console.error(error);
    req.flash('error', 'An error occurred.');
    res.redirect('/admin/records');
  }
});

// Server-side route to check if the employee number exists
router.get('/check-employee-number/:employeeNumber', validateSession, async function (req, res, next) {
  try {
    const { employeeNumber } = req.params;

    // Query the database to check if the employee number exists
    const existingPersonnel = await prisma.personnel.findMany({
      where: {
        employeeNumber: employeeNumber,
      },
    });

    const exists = existingPersonnel.length > 0;
    res.json({ exists });
  } catch (error) {
    console.error(error);
    res.status(500).json({ exists: false });
  }
});
 
// Server-side route to check if the Special Order Number exists
router.get('/check-special-order/:specialOrderNumber', async function (req, res, next) {
  try {
    const { specialOrderNumber } = req.params;

    // Query the database to check if the Special Order Number exists
    const existingPersonnel = await prisma.personnel.findMany({
      where: {
        specialOrderNumber: specialOrderNumber,
      },
    });

    const exists = existingPersonnel.length > 0;
    res.json({ exists });
  } catch (error) {
    console.error(error);
    res.status(500).json({ exists: false });
  }
});
 
// Define a new route for the print view
router.get('/admin/records/print/:id', async function (req, res, next) {
  try {
    const personnelId = req.params.id;

    // Retrieve the personnel record from the database
    const personnel = await prisma.personnel.findUnique({
      where: { id: personnelId },
    });

    if (!personnel) {
      // If personnel not found, redirect back to the main records page
      return res.redirect('/admin/records');
    }

    // Render the print view template with the personnel data
    res.render('admin/print', { title: 'Print Record', personnel });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// GET master list for printing
router.get('/admin/masterlist', async function (req, res, next) {
  try {
    // Retrieve all personnel records from the database
    const allPersonnel = await prisma.personnel.findMany();

    // Filter out personnel records that are not transferred (preAssigned is not "Transfer")
    const notTransferredPersonnels = allPersonnel.filter(
      (personnel) => personnel.preAssigned !== "Transfer"
    );

    res.render('admin/masterlist', { title: 'Master List', personnels: notTransferredPersonnels });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;