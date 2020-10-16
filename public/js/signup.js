import axios from 'axios';
import { color } from 'jimp';
import { showAlert } from './alerts';
import error from './errors';
import eve from 'events';

export const myEventEmitter = new eve();

// export const login = async (email, password) => {
//   try {
//     const res = await axios({
//       method: 'POST',
//       url: 'http://127.0.0.1:3000/api/v1/users/login',
//       data: {
//         email,
//         password,
//       },
//     });

//     if (res.data.status === 'success') {
//       showAlert('success', 'Logged in succesfully');
//       window.setTimeout(() => {
//         location.assign('/');
//       }, 1500);
//     }
//   } catch (err) {
//     error('error', err);
//   }
// };

export const signup = async (name, email, password, passwordConfirm) => {
  try {
    document.querySelector('.btn--green').textContent = 'Please wait...';
    const res = await axios({
      method: 'POST',
      url: 'http://127.0.0.1:3000/api/v1/users/signup',
      data: {
        name,
        email,
        password,
        passwordConfirm,
      },
    });

    if (res.data.status === 'success') {
      showAlert('success', 'Check your email please.');
      // document.querySelector('.login-form').classList.add('f7-greyish__color');
      document.querySelector(
        '.main'
      ).innerHTML = `<div class='form__group form--signup__text'><h2 class='heading-secondary ma-bt-lg'>Sign Up Form</h2><label class='signup_label'>We have sent an email to your email address so that we can verify your email address.<br> Didn't get email? Check it in your Spam or <button id='resendEmail' data-email=${email} class='btn btn--green btn_small'>Resend email</button></label></div>`;
      myEventEmitter.emit('check');
    }
  } catch (err) {
    document.querySelector('.btn--green').textContent = 'signup';
    showAlert('error', err.response.data.message);
  }
};

export const resendEmail = async (email) => {
  try {
    document.querySelector('.btn--green').textContent = 'Sending...';
    const res = await axios(
      `http://127.0.0.1:3000/api/v1/users//sendEmail/${email}`
    );

    if (res.data.status === 'success') {
      showAlert('success', 'Check your email please.');
      document.querySelector('.btn--green').textContent = 'Resend email';
    }
  } catch (err) {
    error('error', err);
  }
};
