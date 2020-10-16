const catchAsync = require('../utilities/catchAsync');
const AppError = require('../utilities/appError');
const ApiFeautures = require('../utilities/apiFeautures');
const { model } = require('../models/tourModel');

const addNameAndSend = (name, doc) => {
  let data = {};

  data[name.toLowerCase()] = doc;

  return data;
};

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError(`No document found with that ID.`, 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

exports.updateOne = (Model, name = 'Tour') =>
  catchAsync(async (req, res, next) => {
    // Filtering.
    let filteredObj = false;
    let myKeys = [];

    if (name === 'Tour') {
      filteredObj = {};
      let filtered = Object.assign({}, req.body);
      const keys = Object.keys(filtered);

      Object.values(filtered).forEach((el, i) => {
        if (typeof el !== 'object' || Array.isArray(el)) {
          filteredObj[keys[i]] = el;
        } else {
          myKeys.push(keys[i]);
        }
      });
    }

    console.log('///////////////////////////////////////');
    console.log(filteredObj);
    console.log(myKeys);

    let doc = await Model.findByIdAndUpdate(
      req.params.id,
      filteredObj ? filteredObj : req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    // location 1 info.
    if ((name = 'Tour')) {
      myKeys.forEach((el) => {
        const values = el.split(' ');

        if (el === 'startLocation') {
          doc[el] = req.body[el];
        } else {
          doc[values[0]][parseInt(values[1])] = req.body[values.join(' ')];
        }
      });

      await doc.save();
    }

    if (!doc) {
      return next(new AppError(`No ${name} found with that ID.`, 404));
    }

    const data = addNameAndSend(name, doc);

    res.status(200).json({
      status: 'success',
      data,
    });
  });

exports.createOne = (Model, name = 'Tour') =>
  catchAsync(async (req, res, next) => {
    const data = addNameAndSend(name, await Model.create(req.body));

    res.status(201).json({
      status: 'success',
      data,
    });
  });

exports.getOne = (Model, name) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);

    if (name === 'Tour') query = query.populate('reviews');

    const doc = await query;

    const data = addNameAndSend(name, doc);

    if (!doc) {
      return next(new AppError(`No ${name} found with that ID.`, 404));
    }

    res.status(200).json({
      status: 'success',
      data,
    });
  });

exports.getAll = (Model, name) =>
  catchAsync(async (req, res, next) => {
    // To Allow for nested GET reviews on tour
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };
    if (req.params.userId) filter = { user: req.params.userId };

    const features = new ApiFeautures(Model.find(filter), req.query)
      .filter()
      .sort()
      .fieldLimiting()
      .pagination();

    // const doc = await features.query.explain();
    const doc = await features.query;

    const data = addNameAndSend(name, doc);
    // Send response
    res.status(200).json({
      status: 'success',
      results: doc.length,
      data,
    });
  });
