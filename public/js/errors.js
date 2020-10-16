import { showAlert } from './alerts';
import axios from 'axios';

export default async (type, err, func, ...neededData) => {
  if (err.response.data.message === 'You are not logged in! please login.') {
    // 1) request access token again.
    try {
      await axios({
        url: 'http://127.0.0.1:3000/api/v1/users/refresh',
        method: 'POST',
      });
    } catch (err) {
      console.log(err);
      showAlert('error', err.response.data.message);
    }

    // 2) retry the request again.
    return await func(...neededData, true);
  } else {
    showAlert('error', err.response.data.message);
  }
};
