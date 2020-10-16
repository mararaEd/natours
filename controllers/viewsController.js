const pug = require('pug');
const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const Review = require('../models/reviewModel');
const AppError = require('../utilities/appError');
const catchAsync = require('../utilities/catchAsync');

exports.getOverview = catchAsync(async (req, res) => {
  // 1) Get tour data from collection.
  const tours = await Tour.find();
  // 2) Build template.

  // 3) Render that template Using the data from step 1.

  res.status(200).render('overview', {
    title: 'All tours',
    tours,
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // 1) Get the data,  for the requested data. (including reviews and guides).
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    select: 'review user rating',
  });

  if (!tour) {
    return next(new AppError('There is no tour with that name'));
  }

  // 2) Build template
  // 3) Render template Using the data from step 1.

  res.status(200).render('tour', {
    title: `${tour.name} tour`,
    tour,
  });
});

exports.getLoginForm = (req, res) => {
  res.status(200).render('login', {
    title: 'Login to your account',
  });
};

exports.getSignupForm = (req, res) => {
  res.status(200).render('signup', {
    title: 'Signup to your account',
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account',
  });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  // 1) Find all bookings.
  const bookings = await Booking.find({ user: req.user.id });

  // 2) Find tours with the returned IDs.
  const tourIDs = bookings.map((el) => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.status(200).render('overview', {
    title: 'Your tours',
    tours,
  });
});

exports.getMyReviews = catchAsync(async (req, res, next) => {
  // 1) Find reviews assosciated with that user.
  const reviews = await Review.find({ user: req.user._id }).populate({
    path: 'tour',
    select: 'name imageCover',
  });

  // 2) Render the reviews.
  res.status(200).render('reviewOverv', {
    title: 'My Reviews',
    reviews,
  });
});

exports.updateUserData = catchAsync(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      name: req.body.name,
      email: req.body.email,
    },
    {
      new: true,
      runValidators: true,
    }
  );
  res.status(200).render('account', {
    title: 'Your account',
    user: updatedUser,
  });
});

exports.getAdminTours = catchAsync(async (req, res, next) => {
  // 1) Get tour data from collection.
  const tours = await Tour.find();
  // 2) Build template.

  // 3) Render that template Using the data from step 1.

  res.status(200).render('manageTours', {
    title: 'All tours',
    tours,
  });
});

exports.sendHtml = catchAsync(async (req, res, next) => {
  // 1) Get tour with the given id.
  const tour = await Tour.findById(req.body.id);

  // 2) change pug template to html.
  const html = pug.renderFile(`${__dirname}/../views/adminTour.pug`, {
    tour,
  });

  // 3) send it along with res.
  res.status(200).json({
    status: 'success',
    data: {
      html,
    },
  });
});
