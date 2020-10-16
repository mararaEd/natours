const multer = require('multer');
const jimp = require('jimp');
// const sharp = require('sharp');
const User = require('../models/userModel');
const AppError = require('../utilities/appError');
const catchAsync = require('../utilities/catchAsync');
const factory = require('./handlerFactory');

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     // user-4kjh44445jj-34343555.jpeg
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user._id}-${Date.now()}.${ext}`);
//   },
// });

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();
  req.file.filename = `user-${req.user._id}-${Date.now()}.jpeg`;

  const img = await jimp.read(req.file.buffer);
  img
    .resize(500, 500)
    .quality(90)
    .write(`public/img/users/${req.file.filename}`);

  next();
});

const filterObj = (...fields) => {
  let obj = { ...fields[0] };
  fields.shift();

  const newObj = {};

  //  const allKeys = Object.keys(obj).forEach((el) => {
  //   if (fields.includes(el)) {
  //     newObj[el] = obj[el];
  //   }
  // });

  // OR
  fields.forEach((el) => {
    if (obj[el]) {
      newObj[el] = obj[el];
    }
  });

  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create an Error if User tries to POST password releated data.
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        `This route is not for password Updates. please use /updateMyPassword`,
        400
      )
    );
  }

  // 2) Filter out any unwanted items from the req.body
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;
  // 3) Update User document.
  const updatedUser = await User.findByIdAndUpdate(req.user._id, filteredBody, {
    new: true,
    runValidators: true,
  });

  // 4) Send response.
  res.status(200).json({
    status: 'success',
    user: updatedUser,
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user._id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.createUser = async (req, res, next) => {
  // let newUser = new User(req.body);
  // newUser = await newUser.save();
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined! Please use /signUP instead.',
  });
};

exports.getAllUsers = factory.getAll(User, 'Users');
exports.getUser = factory.getOne(User, 'User');
exports.deleteUser = factory.deleteOne(User);
// Don't UPDATE passwords here.
exports.updateUser = factory.updateOne(User, 'User');
