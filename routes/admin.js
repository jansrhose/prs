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
router.get('/admin/records', validateSession, async function (req, res, next) {
  try {
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
router.post('/admin/records/:id', validateSession, upload, async function (req, res, next) {
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
    } = value;

    const photoData = req.file ? req.file.buffer : null;

    await prisma.personnel.update({
      where: { id: personnelId },
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

    req.flash('success', 'Personnel record updated successfully.');
    res.redirect('/admin/records');
  } catch (error) {
    console.error(error);
    req.flash('error', 'An error occurred.');
    res.redirect('/admin/records');
  }
});

// DELETE personnel record
router.delete('/admin/records/:id', validateSession, async (req, res, next) => {
  try {
    const personnelId = req.params.id;

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

module.exports = router;
