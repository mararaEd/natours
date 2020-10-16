const AppError = require('./appError');

let limitingData = {
  limit: 5,
  listOfnumberOfAttempts: [],
  listOfUserEmails: [],
  listOfExpiryDates: [],
  listOfbannedUsers: [],
  tryAfter: 1,
  recyclingRate: 1,
  recyclingTime: Date.now() + 1 * 60 * 60 * 1000,
};

exports.limitingDataE = limitingData;

exports.limitingLogic = (email, next) => {
  // Check if the recyclingTime has reached. if Reached remove emails having numberOfAttempts less.
  if (Date.now() >= limitingData.recyclingTime) {
    // Filter indexes of email having less no. of tries.
    const indexes = [];

    limitingData.listOfnumberOfAttempts.forEach((el, ind) => {
      if (el < 4) {
        indexes.push(ind);
      }
    });
    // If indexes are/is found, remove emails and no. of tries having the above indexes.
    if (indexes) {
      indexes.reverse();
      indexes.forEach((el) => {
        limitingData.listOfUserEmails.splice(el, 1);
        limitingData.listOfnumberOfAttempts.splice(el, 1);
      });
    }

    // finally set the recycling Time.
    limitingData.recyclingTime =
      Date.now() + limitingData.recyclingRate * 60 * 60 * 1000;
  }

  // Check if the email is already in the list of user Emails.If not push it to the list.
  if (!limitingData.listOfUserEmails.includes(email)) {
    limitingData.listOfUserEmails.push(email);
    limitingData.listOfnumberOfAttempts.push(0);
  }

  // Identify the position of the current email.
  const index = limitingData.listOfUserEmails.findIndex((el) =>
    el.includes(email)
  );

  // Increment the numberOfAttempts for the current email.
  limitingData.listOfnumberOfAttempts[index]++;
  //   console.log(limitingData.listOfnumberOfAttempts);
  //   console.log(limitingData);

  // If the limit has reached
  if (limitingData.listOfnumberOfAttempts[index] > limitingData.limit) {
    // the current user won't be able to try logging in until the tryAfter time have passed.
    limitingData.listOfbannedUsers.push(email);
    limitingData.listOfExpiryDates.push(
      Date.now() + limitingData.tryAfter * 60 * 1000
    );
    return next(new AppError('login attempt limit reached', 403));
  }
};
