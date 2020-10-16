const AppError = require('../utilities/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const message = `Duplicate field Value: "${err.keyValue.name}". please use another value`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  //   const allErrors = Object.keys(err.errors);
  //   const allMessages = allErrors.map((el, ind) => {
  //     if (ind === allErrors.length - 1 && allErrors.length > 1) {
  //       return `lastOne${err.errors[el].message}`;
  //     }
  //     return err.errors[el].message;
  //   });

  //   const message = `Invalid data input. ${allMessages
  //     .join(', ')
  //     .replace(', lastOne', ' and ')}`;

  const message = `Invalid data input: ${Object.values(err.errors)
    .map((el, ind) => {
      if (
        ind === Object.keys(err.errors).length - 1 &&
        Object.keys(err.errors).length > 1
      ) {
        return `last${el.message}`;
      }

      return el.message;
    })
    .join(', ')
    .replace(', last', ' and ')}.`;

  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token, please log in again.', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token expired, Please log in again', 401);

const sendErrorDev = (err, req, res) => {
  // a) API
  // Quick fix. will improve later.
  if (req.originalUrl.startsWith('/api') || req.originalUrl.endsWith('html')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });

    // b) RENDERED WEBSITE
  }
  console.error('Error 😫', err);

  res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message,
  });
};

const sendErrorProd = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    // a) Operational, trusted error: Send message to client.
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    // b) Programming or other Unknown error: We don't want to leak the error details.
    // 1) log error
    console.error('Error 😫', err);
    // 2) Send generic message.
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }

  // B) RENDERED WEBSITE
  // a) Operational, trusted error: Send message to client.
  if (err.isOperational) {
    if (res.locals.reAuth) {
      console.log('hellllllll');
    }
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  }
  // b) Programming or other Unknown error: We don't want to leak the error details.
  // 1) log error
  console.error('Error 😫', err);
  // 2) Send generic message.
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later.',
  });
};

module.exports = (err, req, res, next) => {
  //   console.log(err.stack);
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = Object.assign({}, err);
    error.message = err.message;

    if (err.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError(error);
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};
