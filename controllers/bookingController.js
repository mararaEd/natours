const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utilities/catchAsync');
const factory = require('../controllers/handlerFactory');
const AppError = require('../utilities/appError');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour.
  const tour = await Tour.findById(req.params.tourID);

  // 2) Create Checkout Session.
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${req.protocol}://${req.get('host')}/?tour=${
      req.params.tourID
    }&user=${req.user.id}&price=${tour.price}&tourDate=${
      tour.startDates[req.params.pos].date
    }`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourID,
    line_items: [
      {
        name: `${tour.name} Tour`,
        description: tour.summary,
        images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
        amount: tour.price * 100,
        currency: 'usd',
        quantity: 1,
      },
    ],
  });

  // 3) assign the created session to req.session
  req.session = session;

  next();
});

exports.manageDates = catchAsync(async (req, res, next) => {
  // 1) Increment the number of participants in the tour Date by 1.
  const tour = await Tour.findById(req.params.tourID);
  tour.startDates[req.params.pos].participants++;

  // 2) if The NO. of participants is greater or equal to the maxGroupSize set the soldOut field to true.
  if (tour.startDates[req.params.pos].participants >= tour.maxGroupSize) {
    tour.startDates[req.params.pos].soldOut = true;
  }
  // 3) Save to Database.
  tour.save({
    validateBeforeSave: false,
  });

  // 4) Send session as response.
  res.status(200).json({
    status: 'success',
    session: req.session,
  });
});

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  // This is only temporary. because it's UNSECURE: everyone can make bookings without paying.
  const { tour, user, price, tourDate } = req.query;

  if (!tour && !user && !price && !tourDate) return next();

  await Booking.create({ tour, user, price, tourDate });

  res.redirect(req.originalUrl.split('?')[0]);
});

exports.getAllBookings = factory.getAll(Booking, 'Bookings');
exports.createBooking = factory.createOne(Booking, 'Booking');
exports.getBooking = factory.getOne(Booking, 'Booking');
exports.updateBooking = factory.updateOne(Booking, 'Booking');
exports.deleteBooking = factory.deleteOne(Booking);
