import axios from 'axios';
import { showAlert } from './alerts';
import error from './errors';

export const createReview = async (tourId, rating, review, cease) => {
  try {
    const res = await axios({
      method: 'POST',
      url: `http://127.0.0.1:3000/api/v1/tours/${tourId}/reviews`,
      data: {
        review,
        rating,
      },
    });

    if (res.data.status === 'success') {
      showAlert('success', 'You have succesfully reviewed the tour.');
      window.setTimeout(() => {
        location.reload(true);
      }, 1500);
    }
  } catch (err) {
    if (!cease)
      return error('error', err, createReview, tourId, rating, review);
    showAlert('error', err.response.data.message);
  }
};
