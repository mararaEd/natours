const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

// router.use(csurf({ cookie: true }));

router.get(
  '/',
  bookingController.createBookingCheckout,
  authController.isLoggedIn,
  viewsController.getOverview
);
router.get(
  '/tour/:slug',
  authController.isLoggedIn,
  authController.hasBookedTour,
  viewsController.getTour
);
router.get('/login', authController.isLoggedIn, viewsController.getLoginForm);
router.get('/signup', authController.isLoggedIn, viewsController.getSignupForm);
router.get('/signup/:token', authController.signUp);


router.post(
  '/html',
  authController.protect,
  authController.restrictTo('admin'),
  viewsController.sendHtml
);

router.post(
  '/submit-user-data',
  authController.protect,
  viewsController.updateUserData
);

router.post('/my-stats', authController.checkStatus);

router.use(authController.setProtectOther);

router.get('/me', authController.protect, viewsController.getAccount);
router.get('/my-tours', authController.protect, viewsController.getMyTours);
router.get('/my-reviews', authController.protect, viewsController.getMyReviews);

// Admins administration page.
router.get(
  '/our-tours',
  authController.protect,
  authController.restrictTo('admin'),
  viewsController.getAdminTours
);

module.exports = router;
