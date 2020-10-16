const { promisify } = require('util');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const AppError = require('../utilities/appError');
const { limitingDataE, limitingLogic } = require('../utilities/limitAttempts');
const catchAsync = require('../utilities/catchAsync');
const Email = require('../utilities/email');
const EmailToCheck = require('../utilities/emailCheck');
const Tour = require('../models/tourModel');

const signToken = (id, refresh) => {
  let secret, expire;
  if (refresh) {
    secret = process.env.JWT_REFRESH_SECRET;
    expire = process.env.JWT_REFRESH_EXPRIRES_IN;
  } else {
    secret = process.env.JWT_ACCESS_SECRET;
    expire = process.env.JWT_ACCESS_EXPRIRES_IN;
  }

  return jwt.sign({ id }, secret, {
    expiresIn: expire,
  });
};

const sendRemoveRegular = (res, set = true) => {
  const cookieOptions = {
    expires: new Date(
      Date.now() +
        process.env.JWT_REFRESH_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    sameSite: 'lax',
  };
  const cookieName = 'reglrUse';

  if (!set) return res.clearCookie(cookieName, cookieOptions);

  const myRandom = crypto.randomBytes(18).toString('hex');

  res.cookie(cookieName, myRandom, cookieOptions);
};

const sendCookie = (res, id, refresh, value) => {
  let token, cookieOptions, cookieName;
  if (refresh) {
    token = signToken(id, true);

    cookieName = 'jwtR';
    cookieOptions = {
      expires: new Date(
        Date.now() +
          process.env.JWT_REFRESH_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      path: '/api/v1/users/refresh',
    };
  } else if (value || refresh) {
    res.cookie('reglrUse', crypto.randomBytes(18).toString('hex'), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' ? true : false,
      expires: new Date(
        Date.now() +
          process.env.JWT_REFRESH_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
      ),
    });
  } else {
    token = signToken(id, false);
    cookieName = 'jwtA';
    cookieOptions = {
      expires: new Date(
        Date.now() + process.env.JWT_ACCESS_COOKIE_EXPIRES_IN * 60 * 1000
      ),
      httpOnly: true,
    };
  }

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie(cookieName, token, cookieOptions);

  return token;
};

const sendCookieTokenResponse = async (
  res,
  statusCode,
  id,
  refresh,
  newUser = false,
  api = true,
  isLoggedIn
) => {
  let accToken, refToken;
  if (refresh === 'accessOnly') {
    accToken = sendCookie(res, id, false);
    refToken = undefined;
  } else if (refresh === 'both') {
    accToken = sendCookie(res, id, false);
    refToken = sendCookie(res, id, true);
  }

  let data;

  if (newUser) {
    // Remove the password from the Output.
    newUser.password = undefined;

    data = {
      user: newUser,
    };
  } else if (isLoggedIn) {
    data = {
      photo: isLoggedIn.photo,
      name: isLoggedIn.name,
    };
  } else {
    data = undefined;
  }

  if (!api) {
    return res.status(200).render('signupVer', {
      title: 'Signed up successfully!',
    });
  }

  return res.status(statusCode).json({
    status: 'success',
    accToken,
    refToken,
    data,
  });
};

const sendVerEmail = async (next, user, req, token) => {
  const url = `${req.protocol}://${req.get('host')}/signup/${token}`;

  try {
    await new Email(user, url).sendSignUp();
  } catch (err) {
    return next(new AppError('something went wrong sending email.'));
  }
};

// Email verification
exports.checkEmail = catchAsync(async (req, res, next) => {
  // I) Check and delete users with expired tokens.
  await User.deleteMany({
    expiresOn: { $lte: Date.now() },
  });

  // II) If the email is already registered send error message.
  if (await User.findOne({ email: req.body.email })) {
    return next(
      new AppError(
        `This email has already been registered. use /login instead.`,
        400
      )
    );
  }

  // 1) Create a new Email OBJ.
  const newEmail = new EmailToCheck(req.body.email, 15, req.body.name);

  // 2) Create a new token and attach it to the Email OBJ.
  const token = newEmail.createToken();

  // 3) Create user.
  await User.create({
    name: newEmail.name,
    email: newEmail.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    signUpToken: newEmail.token,
    expiresOn: newEmail.expiresOn,
  });

  // 4) Send token via email.
  await sendVerEmail(next, newEmail, req, token);

  // 5) send response.
  res
    .status(200)
    .json({ status: 'success', message: 'Check your email.', token });
});

exports.signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.findOne({
    signUpToken: new EmailToCheck().createToken(req.params.token),
    expiresOn: { $gte: Date.now() },
  });

  if (!newUser) {
    return next(new AppError('Invalid or Expired token.', 401));
  }

  // 2) Normal Sign up.
  newUser.expiresOn = undefined;
  newUser.signUpToken = undefined;

  await newUser.save({
    validateBeforeSave: false,
  });

  const url = `${req.protocol}://${req.get('host')}/me`;

  try {
    await new Email(newUser, url).sendWelcome();
  } catch (err) {
    return next(new AppError(`Something went wrong! try again.`, 500));
  }

  if (req.cookies.reglrUse) sendRemoveRegular(res, false);
  sendCookieTokenResponse(res, 201, newUser._id, 'both', false, false);
});

exports.sendVerificationEmail = catchAsync(async (req, res, next) => {
  if (!req.params.email) {
    return next(new AppError('No email provided!', 400));
  }

  // Find the user.
  const newUser = await User.findOne({
    email: req.params.email,
  });

  // Create new email object and token.
  const newEmail = new EmailToCheck(false, 15);
  const token = newEmail.createToken();

  // Update the tokens in Database.
  newUser.signUpToken = newEmail.token;
  newUser.expiresOn = newEmail.expiresOn;
  newUser.save({
    validateBeforeSave: false,
  });

  // Send email
  await sendVerEmail(next, newUser, req, token);

  // Send response
  res.status(200).json({ status: 'success', message: 'Check your email' });
});

// Prevent Users with many failed attempts from logging in.
exports.checkBanned = (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if the email and password exists.
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // 2) Check if the Timer has expired for a banned user if he's trying to log in.
  if (limitingDataE.listOfbannedUsers.includes(email)) {
    // 1) identify the position of the email in banned lists.
    const index = limitingDataE.listOfbannedUsers.findIndex((el) =>
      el.includes(email)
    );
    // 2) Check if the expiryTime for that user is expired. and if not send the error message.
    if (!(Date.now() >= limitingDataE.listOfExpiryDates[index])) {
      return next(new AppError('timeout reached for this email.'));
    }

    // 3) If the timer has Expired, then remove both the email and expiryTime for the user.

    // find the index of that email in the listOfUserEmails list.
    const ind = limitingDataE.listOfUserEmails.findIndex((el) =>
      el.includes(email)
    );
    // reset the numberOfAttempts to 0.
    limitingDataE.listOfnumberOfAttempts[ind] = 0;
    // the above number 3 terms.
    limitingDataE.listOfbannedUsers.splice(index, 1);
    limitingDataE.listOfExpiryDates.splice(index, 1);
  }

  // 3) If everything is Ok visit the next middleWare.
  next();
};

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if the user exists and the password is correct.
  const user = await User.findOne({ email }).select('+password');

  if (
    !user ||
    user.expiresOn ||
    !(await user.correctPassword(password, user.password))
  ) {
    limitingLogic(email, next);
    return next(new AppError('Incorrect email or password', 401));
  }

  // 2) If the User has successfully logged in set his numberOfAttempts to 0.
  // 2) a. get the position of that email.
  const index = limitingDataE.listOfUserEmails.findIndex((el) =>
    el.includes(email)
  );

  // 2) b. set numberOfAttempts
  limitingDataE.listOfnumberOfAttempts[index] = 0;

  // 3) if everythink is ok, send the token to the client.
  if (req.cookies.reglrUse) sendRemoveRegular(res, false);
  sendCookieTokenResponse(res, 200, user._id, 'both');
});

exports.logout = catchAsync(async (req, res) => {
  res.cookie('jwtA', 'loggedOut', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  const cookieOptions = {
    expires: new Date(
      Date.now() +
        process.env.JWT_REFRESH_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    path: '/api/v1/users/refresh',
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.clearCookie('jwtR', cookieOptions);
  if (!req.cookies.reglrUse) sendRemoveRegular(res);

  res.status(200).json({ status: 'success' });
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it's there.
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwtA) {
    token = req.cookies.jwtA;
  }

  console.log(token);
  if (!token) {
    if (req.fromOther && !req.query.noCheck) res.locals.pleaseWait = true;
    return next(new AppError('You are not logged in! please login.', 401));
  }

  // 2) verification.
  const decoded = await promisify(jwt.verify)(
    token,
    process.env.JWT_ACCESS_SECRET
  );
  // 3) Check if the User still exists
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token does not exist.', 401)
    );
  }
  // 4) Check if the User changed password after the token was issued.
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401)
    );
  }

  // GRANT access to protected route.
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwtA) {
    try {
      // 1) verification.
      console.log('from jwtA');
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwtA,
        process.env.JWT_ACCESS_SECRET
      );
      // 2) Check if the User still exists
      const currentUser = await User.findById(decoded.id);

      if (!currentUser) {
        return next();
      }
      // 3) Check if the User changed password after the token was issued.
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER.
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  } else if (!req.cookies.reglrUse) {
    res.locals.recheck = true;
    return next();
  }
  next();
};

exports.verifyRefresh = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it's there.
  let token;
  if (req.cookies.jwtR) {
    token = req.cookies.jwtR;
  }

  if (!token) {
    return next(new AppError('You are not logged in! please log in.', 401));
  }

  // 2) verification: if it's from isLoggedIn don't send any error.
  const decoded = await promisify(jwt.verify)(
    token,
    process.env.JWT_REFRESH_SECRET
  );

  // 3) Check if the User still exists
  const user = await User.findOne({ _id: decoded.id });

  if (!user) {
  }

  // 4) Checking if user didn't change password recently.
  if (user.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('Invalid token.', 401));
  }

  // GRANT access to protected route.
  req.user = user;
  next();
});

exports.issueAccessToken = catchAsync(async (req, res, next) => {
  // 1) send both the refresh and access tokens for that user and retry the user's request.
  let user = undefined;
  if (req.query.isLoggedIn) user = req.user;
  sendCookieTokenResponse(res, 200, req.user._id, 'both', false, true, user);
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles: ['admin','lead-guide']. role= 'user'.
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action.', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on posted email.
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('There is no user with that email', 404));
  }
  // 2) generate the random token.
  const resetToken = user.createPasswordResetToken();

  await user.save({
    validateBeforeSave: false,
  });

  // 3) send it back as an email.
  try {
    const resetURl = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURl).sendPassword();

    res.status(200).json({
      status: 'success',
      message: 'email sent...',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save({
      validateBeforeSave: false,
    });

    return next(
      new AppError('There was an Error sending email.Please try again', 500)
    );
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get User based on token.
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token is not expired and there is User, Update the new password.
  if (!user) {
    return next(new AppError('Token is invalid or Expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();
  // 3) Update passwordChangedAt property.

  // 4) log in the User.
  sendCookieTokenResponse(res, 200, user._id, 'both');
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get User from collection.
  const user = await User.findOne({ _id: req.user._id }).select('+password');

  const { currentPassword, password, passwordConfirm } = req.body;

  // 2) Check if posted current Password is correct.

  if (!(await user.correctPassword(currentPassword, user.password))) {
    return next(new AppError(`Your current password is not correct!`, 401));
  }

  // 3) If the password is correct Update the Password.
  user.password = password;
  user.passwordConfirm = passwordConfirm;

  await user.save();
  // User.findByIdandUpdate() will not work as intended.

  // 4) Log user in, send JWT.
  sendCookieTokenResponse(res, 200, user._id, 'accessOnly');
});

exports.bookedTour = catchAsync(async (req, res, next) => {
  // 1) Check if the User has booked the tour. if not send an error message.
  if (!(await Booking.findOne({ user: req.body.user, tour: req.body.tour }))) {
    return next(new AppError('You must book a tour before reviewing it!', 403));
  }
  next();
});

exports.hasBookedTour = catchAsync(async (req, res, next) => {
  // 1) Check if the user is logged in.
  if (!res.locals.user) return next();

  const tour = await Tour.findOne({ slug: req.params.slug });

  const booking = await Booking.findOne({
    user: res.locals.user._id,
    tour: tour._id,
  });

  // 2) Check if the User has booked the tour. if not simply call next.
  if (booking) {
    res.locals.hasBookedTour = true;
    res.locals.datePassed = Date.now() > booking.tourDate ? true : false;
    return next();
  }

  next();
});

exports.sendRegularToken = catchAsync(async (req, res, next) => {
  sendRemoveRegular(res);
  res.status(200).json({ status: 'success' });
});

exports.setProtectOther = (req, res, next) => {
  req.fromOther = true;
  next();
};

exports.checkStatus = catchAsync(async (req, res, next) => {
  // 1) if there is access token send 'success' if not send error.
  if (req.cookies.jwtA) {
    return res.status(200).json({ status: 'success' });
  }
  res.status(401).json({ status: 'fail' });
});
