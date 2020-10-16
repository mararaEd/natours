import axios from 'axios';
import { myEmitter } from '.';
import { showAlert } from './alerts';
import error from './errors';

export const getHtml = async (id, cease) => {
  try {
    // 1) Get the html.
    const res = await axios({
      method: 'POST',
      url: 'http://127.0.0.1:3000/html',
      data: {
        id,
      },
    });

    // 2) return the html.
    if (res.data.status === 'success') {
      return res.data.data.html;
    }
  } catch (err) {
    if (!cease) return error('error', err, getHtml, id);
    console.log(err);
  }
};

export const updateTour = async (id, data, formData, cease) => {
  // const key = Object.keys(data);

  // if (key && key[0]) {
  //   try {
  //     const res = await axios({
  //       method: 'PATCH',
  //       url: `http://127.0.0.1:3000/api/v1/tours/${id}`,
  //       data,
  //     });

  //     if (res.data.status === 'success') {
  //       myEmitter.emit('set');
  //       showAlert('success', `Tour data updated succesfully!`);
  //     }
  //   } catch (err) {
  //     if (
  //       err.response.data.message !== 'You are not logged in! please login.'
  //     ) {
  //       myEmitter.emit('re');
  //     }
  //     if (!cease) return error('error', err, updateTour, id, data, formData);
  //     showAlert('error', err.response.data.message);
  //   }
  // }

  if (formData) {
    try {
      const res = await axios({
        method: 'PATCH',
        url: `http://127.0.0.1:3000/api/v1/tours/${id}`,
        data: formData,
      });

      if (res.data.status === 'success') {
        myEmitter.emit('set');
        showAlert('success', `Tour Image[s] updated succesfully!`);
      }
    } catch (err) {
      if (
        err.response.data.message !== 'You are not logged in! please login.'
      ) {
        myEmitter.emit('re');
      }
      if (!cease) return error('error', err, updateTour, id, data, formData);
      showAlert('error', err.response.data.message);
    }
  }
};

export const createTour = async (data, cease) => {
  try {
    const res = await axios({
      method: 'POST',
      url: `http://127.0.0.1:3000/api/v1/tours`,
      data,
    });

    if (res.data.status === 'success') {
      myEmitter.emit('set');
      showAlert('success', `Tour created succesfully!`);
    }
  } catch (err) {
    if (err.response.data.message !== 'You are not logged in! please login.') {
      myEmitter.emit('re');
    }
    if (!cease) return error('error', err, updateTour, data);
    showAlert('error', err.response.data.message);
  }
};

export const deleteTour = async (parent, child, id, cease) => {
  // Remove tour from backEnd.
  try {
    await axios({
      method: 'DELETE',
      url: `http://127.0.0.1:3000/api/v1/tours/${id}`,
    });
  } catch (err) {
    if (!cease) return error('error', err, deleteTour, parent, child, id);
  }

  // Revmove tour from frontEnd
  parent.removeChild(child);
};
