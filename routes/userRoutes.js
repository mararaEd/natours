const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');
const bookingRouter = require('./bookingRoutes');

const router = express.Router({ mergeParams: true });

// users/:userId/bookings
router.use('/:userId/bookings', bookingRouter);

router.post('/signup', authController.checkEmail);
router.post('/login', authController.checkBanned, authController.login);
router.get('/logout', authController.logout);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);
router.post(
  '/refresh',
  authController.verifyRefresh,
  authController.issueAccessToken
);

router.post('/myRegular', authController.sendRegularToken);

router.get('/sendEmail/:email', authController.sendVerificationEmail);

// Protect all routes after this middleware.
router.use(authController.protect);

router.patch('/updateMyPassword', authController.updatePassword);

router.get('/me', userController.getMe, userController.getUser);

router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);
router.delete('/deleteMe', userController.deleteMe);

router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
