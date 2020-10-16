// updateData
import axios from 'axios';
import { showAlert } from './alerts';
import error from './errors';

const updateFunction = () => {
  return async (data, type, updatePhoto, cease = false) => {
    const url =
      type === 'password'
        ? 'http://127.0.0.1:3000/api/v1/users/updateMyPassword'
        : 'http://127.0.0.1:3000/api/v1/users/updateMe';

    try {
      const res = await axios({
        method: 'PATCH',
        url,
        data,
      });

      if (updatePhoto) {
        Array.from(document.querySelectorAll('.old-photo')).forEach((el) => {
          el.src = `/img/users/${res.data.user.photo}`;
        });
      }

      if (res.data.status === 'success')
        showAlert('success', `${type.toUpperCase()} updated succesfully!`);
    } catch (err) {
      if (!cease)
        return error('error', err, updateSettings, data, type, updatePhoto);
      showAlert('error', err.response.data.message);
    }
  };
};

// type is either 'password' of 'data'
export const updateSettings = updateFunction();
