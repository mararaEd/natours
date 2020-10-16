const mongoose = require('mongoose');
const Review = require('../models/reviewModel');
// const catchAsync = require('../utilities/catchAsync');
const factory = require('../controllers/handlerFactory');

exports.setUserTourIds = async (req, res, next) => {
  // Allow nested routes.
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user._id;
  next();
};

exports.getAllReviews = factory.getAll(Review, 'Reviews');
exports.getReview = factory.getOne(Review, 'Review');
exports.createReview = factory.createOne(Review, 'Review');
exports.updateReview = factory.updateOne(Review, 'Review');
exports.deleteReview = factory.deleteOne(Review);
