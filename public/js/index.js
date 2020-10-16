import '@babel/polyfill';
import axios from 'axios';
import { login, logout } from './login';
import { myEventEmitter, resendEmail, signup } from './signup';
import displayMap from './mapbox';
import { updateSettings } from './updateSettings';
import { bookTour } from './stripe';
import { showAlert } from './alerts';
import { createReview } from './review';
import { deleteReview, toTextArea, updateReview } from './userReviews';
import manageStars from './Utils/manageStars';
import error from './errors';
import { createTour, deleteTour, getHtml, updateTour } from './tours';
import events from 'events';

// DOM ELEMENTS
const mapBox = document.getElementById('map');
const loginForm = document.querySelector('.form--login');
const signupForm = document.querySelector('.form--signup');
let logoutBtn = document.querySelector('.nav__el--logout');
const userDataForm = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-password');
const buttons = Array.from(document.querySelectorAll('.btn--small'));
const bookBtn = document.getElementById('book-tour');
const signupText = document.getElementById('mySignupText');
const reviewBoxTour = document.getElementById('myWriteTextarea');
const reviewBtnTour = document.querySelector('.btn-review_hidden');
const userReviewsBtn = document.querySelector('.edit-buttons');
const adminToursBtn = document.querySelector('.manage-tours_button');
const allStars = Array.from(document.querySelectorAll('.reviews_add'));
const replacable = document.querySelector('.nav--user');
const retryIndicator = document.getElementById('justaRetry');
const closeBtn = document.querySelector('.close-container');
const popupCont = document.querySelector('.popup_container');
const protectedLinks = Array.from(document.querySelectorAll('.protected'));

const emitter = class extends events {
  constructor() {
    super();
  }
};

export const myEmitter = new emitter();

const preRequest = async () => {
  try {
    // 1) send a request to know status of a user.
    await axios({
      url: 'http://127.0.0.1:3000/my-stats',
      method: 'POST',
    });
  } catch (err) {
    try {
      await axios({
        url: 'http://127.0.0.1:3000/api/v1/users/refresh?isLoggedIn=yeah',
        method: 'POST',
      });
    } catch (err) {}
  }
};

const retryMe = document.querySelector('.retry-me');
if (retryMe) {
  window.addEventListener('DOMContentLoaded', async () => {
    await preRequest();
    location.assign(`${location.href}?noCheck='no'`);
  });
}

// protect the protected links.
if (protectedLinks[0]) {
  protectedLinks.forEach((el) => {
    el.addEventListener('click', async (e) => {
      let url;
      e.preventDefault();
      await preRequest();
      if (!e.target.href) url = e.target.parentElement.href;
      location.assign(e.target.href || url);
    });
  });
}

const manageClasses = (add, rem) => {
  popupCont.classList.remove(rem);
  popupCont.classList.add(add);
};

// VALUES
if (document.getElementById('reCheck')) {
  (async () => {
    try {
      const res = await axios({
        url: 'http://127.0.0.1:3000/api/v1/users/refresh?isLoggedIn=yeah',
        method: 'POST',
      });
      if (res.data.status === 'success') {
        replacable.innerHTML = ` <a class="nav__el nav__el--logout" href="">Log Out</a>
          <a class="nav__el" href="/me">
            <img src="/img/users/${
              res.data.data.photo
            }" class="nav__user-img old-photo" alt= "photo of ${
          res.data.data.name
        }">
            <span>${res.data.data.name.split(' ')[0]}</span>
          </a>`;
        logoutBtn = document.querySelector('.nav__el--logout');
        myEventEmitter.emit('logoutYes');
      }
    } catch (err) {
      replacable.innerHTML = `
      <a class='nav__el' href='/login'>Log in</a>
      <a class='nav__el nav__el--cta' id='signUp' href='/signup'>Sign up</a>`;
      try {
        await axios({
          method: 'POST',
          url: 'http://127.0.0.1:3000/api/v1/users/myRegular',
        });
      } catch (err) {
        error('error', err);
      }
    }
  })();
}
if (retryIndicator) {
  (async () => {
    try {
      const res = await axios({
        url: 'http://127.0.0.1:3000/api/v1/users/refresh?isLoggedIn=yeah',
        method: 'POST',
      });
      location.reload();
    } catch (err) {
      location.assign(retryIndicator.dataset.url);
    }
  })();
}

// DELEGATION
if (mapBox) {
  const locations = JSON.parse(
    document.getElementById('map').dataset.locations
  );
  displayMap(locations);
}

if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
  });
}

if (logoutBtn) logoutBtn.addEventListener('click', logout);
myEventEmitter.on('logoutYes', () => {
  logoutBtn.addEventListener('click', logout);
});

if (userDataForm)
  buttons[0].addEventListener('click', (e) => {
    e.preventDefault();

    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]);
    updateSettings(form, 'data', form.get('photo') ? true : false);
  });

if (userPasswordForm)
  buttons[1].addEventListener('click', async (e) => {
    buttons[1].textContent = 'Updating...';
    e.preventDefault();
    const currentPassword = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    await updateSettings(
      { currentPassword, password, passwordConfirm },
      'password'
    );

    buttons[1].textContent = 'save password';
    document.getElementById('password-current').value = '';
    document.getElementById('password-confirm').value = '';
    document.getElementById('password').value = '';
  });

let allowed;
let isOnce;
let isOnlyOnce;

const addPopupEvent = (showBtn, close, newTour, ...others) => {
  myEmitter.on('re', () => {
    isOnce = true;
    isOnlyOnce = true;
    allowed = false;
  });

  myEmitter.on('set', () => {
    allowed = true;
  });

  if (newTour && others[0]) {
    return others.forEach((el) => {
      el.addEventListener('click', async () => {
        if (!isOnlyOnce) return 'hey';
        isOnlyOnce = false;

        let mainObj = {
          startDates: [],
          locations: [],
        };

        const oneWays = Array.from(document.querySelectorAll('.one-way_input'));
        const arrays = Array.from(document.querySelectorAll('.arrays'));

        // Direct input
        oneWays.forEach((el) => {
          if (el.value) {
            if (el.id === 'guides') {
              let myA = el.value.split(',');
              return (mainObj[el.id] = myA);
            }
            mainObj[el.id] = el.value;
          }
        });

        // Array input.
        arrays.forEach((el) => {
          const name = el.parentElement.dataset.type;
          let tempObj = {};
          Array.from(el.children).forEach((el) => {
            let nameI = el.children[0].textContent.split(' ')[0];
            if (nameI === 'coordinates') {
              const myVall = el.children[1].value
                .split(',')
                .map((el) => parseInt(el));

              return (tempObj[nameI] = myVall);
            }
            tempObj[el.children[0].textContent.split(' ')[0]] =
              el.children[1].value;
          });

          const check = Object.values(tempObj);

          if (tempObj.date) {
            const date = tempObj.date;
            tempObj = {
              date,
            };
          } else {
            for (const el of check) {
              if (!el) {
                tempObj = undefined;
                break;
              }
            }
          }

          if (tempObj) {
            if (name === 'startLocation') {
              return (mainObj[name] = tempObj);
            }

            mainObj[name].push(tempObj);
          }
        });

        // 4) filtering the mainObj.
        const filterMe = () => {
          let finalObj = {};
          const keys = Object.keys(mainObj);
          Object.values(mainObj).forEach((el, i) => {
            if (keys[i] === 'startDates') {
              finalObj[keys[i]] = el;
            } else if (Array.isArray(el) && el[0]) {
              finalObj[keys[i]] = el;
            } else if (typeof el === 'string' || keys[i] === 'startLocation')
              finalObj[keys[i]] = el;
          });

          if (Object.keys(finalObj)[0]) {
            return finalObj;
          }
          return false;
        };

        const theFinal = filterMe();

        if (theFinal) {
          await createTour(theFinal);

          if (allowed) {
            manageClasses('hide_popup', 'show_popup');
            location.reload();
          }
        }
      });
    });
  }

  if (others[0]) {
    const id = others.pop();
    const myForm = new FormData();

    return others.forEach((el, i) => {
      el.addEventListener('click', async (e) => {
        if (!isOnce) return 'hey';
        isOnce = false;
        const dta = Array.from(document.querySelectorAll('.manage_hidden'));

        for (const el of dta) {
          const value = el.files[0];
          if (!value) continue;
          myForm.append(el.classList[1], value);
        }

        // updateTheData
        let sendFormData = false;
        if (myForm.get('imageCover') || myForm.get('images'))
          sendFormData = true;

        const key = Object.keys(parentObj);

        if (key[0] || myForm.get('imageCover') || myForm.get('images')) {
          let howMany;
          if (e.target.classList.contains('fa')) {
            e.target.classList.remove('fa-check');
            e.target.textContent = 'wait...';
            howMany = true;
          } else {
            e.target.children[0].textContent = 'wait...';
            e.target.children[0].classList.remove('fa-check');
            howMany = false;
          }

          await updateTour(
            id,
            parentObj,
            sendFormData === true ? myForm : false
          );

          if (howMany) {
            e.target.classList.remove('fa-check');
            return (e.target.textContent = 'wait...');
          }
          e.target.children[0].textContent = 'wait...';
          e.target.children[0].classList.remove('fa-check');
        }

        if (allowed) {
          manageClasses('hide_popup', 'show_popup');
          location.reload();
        }
      });
    });
  }

  if (close) {
    return closeBtn.addEventListener('click', () => {
      manageClasses('hide_popup', 'show_popup');
    });
  }

  showBtn.addEventListener('click', (e) => {
    manageClasses('show_popup', 'hide_popup');
  });
};

if (bookBtn) {
  const closeBtn = document.querySelector('.close-container');
  const popupCont = document.querySelector('.popup_container');
  const dateCont = Array.from(document.querySelectorAll('.book_tour'));

  // bookBtn.addEventListener('click', (e) => {
  // e.target.textContent = 'processing...';
  // const { tourId, datePos } = e.target.dataset;
  // bookTour(tourId, datePos);
  // });
  closeBtn.addEventListener('click', () => {
    manageClasses('hide_popup', 'show_popup');
  });
  addPopupEvent(bookBtn);

  dateCont.forEach((el) => {
    el.addEventListener('click', (e) => {
      popupCont.classList.remove('show_popup');
      popupCont.classList.add('hide_popup');

      bookBtn.textContent = 'processing...';
      let { tourId, datePos } = e.target.parentElement.dataset;

      if (!tourId) {
        tourId = e.target.dataset.tourId;
        datePos = e.target.dataset.datePos;
      }

      bookTour(tourId, datePos);
    });
  });
}

if (signupForm) {
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const allValues = [
      document.getElementById('username').value,
      document.getElementById('email').value,
      document.getElementById('password').value,
      document.getElementById('passwordConfirm').value,
    ];

    console.log(allValues);
    signup(...allValues);
  });
}

myEventEmitter.on('check', () => {
  handleEvent();
});

const handleEvent = () => {
  document
    .getElementById('resendEmail')
    .addEventListener('click', async (e) => {
      console.log(e.target.dataset.email);
      await resendEmail(e.target.dataset.email);
    });
};

if (signupText) {
  setTimeout(() => {
    location.assign('/');
  }, 5000);
}

if (reviewBoxTour) {
  reviewBoxTour.addEventListener('focus', () => {
    reviewBtnTour.style.display = 'block';
  });

  reviewBtnTour.addEventListener('click', (e) => {
    const value = reviewBoxTour.value;
    const rating = document.querySelector('.actual_rating');

    if (!value || !rating || !rating.dataset.rating) {
      return showAlert('error', 'The review or rating is missing!');
    }

    let { tourId } = e.target.dataset;
    if (!tourId) tourId = e.target.parentElement.dataset.tourId;
    createReview(tourId, rating.dataset.rating, value);
  });

  manageStars(allStars);
}

if (userReviewsBtn) {
  let isEditing = false;

  document.querySelector('.card-container').addEventListener('click', (e) => {
    let myPos, howMany;
    myPos = e.target.parentElement.parentElement.dataset.pos;
    howMany = 2;
    if (!myPos) {
      myPos = e.target.parentElement.dataset.pos;
      howMany = 1;
    }

    if (
      e.target.classList.contains('btn-review_right') ||
      e.target.classList.contains('fa-check')
    ) {
      let baseElm = e.target.parentElement;
      if (howMany === 2) baseElm = baseElm.parentElement;

      let value, rating, index;

      value = document.getElementById('myReviewsText').value;

      // rating
      const allStars = Array.from(
        baseElm.previousSibling.previousSibling.previousSibling.children[2]
          .children
      );

      allStars.forEach((el) => {
        if (el.classList.contains('actual_rating')) {
          rating = el.dataset.rating;
        }
      });

      console.log(rating);
      const id = baseElm.dataset.id;

      updateReview(myPos, e, howMany, rating, value, id);
      isEditing = false;
    } else if (
      e.target.classList.contains('btn-review_edit') ||
      e.target.classList.contains('fa-pencil')
    ) {
      if (isEditing)
        return showAlert('error', 'please finish updating the current review.');

      let baseElm = e.target.parentElement;
      if (howMany === 2) baseElm = baseElm.parentElement;

      const id = baseElm.dataset.id;

      const allStars = Array.from(
        baseElm.previousSibling.previousSibling.previousSibling.children[2]
          .children
      );

      manageStars(allStars);

      toTextArea(
        myPos,
        e,
        howMany,
        id,
        'myReviewsText',
        'add_reviews',
        'card__text-review'
      );
      isEditing = true;
    } else if (
      e.target.classList.contains('fa-trash-o') ||
      e.target.classList.contains('btn-review_delete')
    ) {
      if (isEditing) return;

      let baseElm = e.target.parentElement;
      if (howMany === 2) baseElm = baseElm.parentElement;
      const id = baseElm.dataset.id;

      const check = prompt(
        `Are you sure, Do you want to delete this review? reply 'yes' if you want so.`
      );
      if (check === 'yes')
        deleteReview(
          baseElm.parentElement.parentElement,
          baseElm.parentElement,
          id
        );
    }
  });
}

const manageDrops = (e) => {
  console.log('hello');
  const { next, oneParent } = e.target.dataset;
  let elm;

  if (next) elm = e.target.nextElementSibling;
  if (oneParent) elm = e.target.parentElement.nextElementSibling;
  if (!elm) elm = e.target.parentElement.parentElement.nextElementSibling;

  e.target.classList.toggle('rotateMe');
  elm.classList.toggle('hide-me');
  elm.classList.toggle('show-me');
};

let parentObj;

const handler = (root, name, multi) => {
  const newObj = {};
  const childArr = Array.from(root.children);

  childArr.forEach((el) => {
    let myVal;
    const childArr = Array.from(el.children);
    const name = childArr[0].textContent.split(' ')[0];

    myVal = childArr[1].value;
    if (name === 'coordinates') myVal = myVal.split(',');
    newObj[name] = myVal;
  });
  if (multi) {
    parentObj[`${name} ${root.dataset.pos}`] = newObj;
    parentObj[
      `${name} ${root.dataset.pos} info`
    ] = `${name} ${root.dataset.pos}`;

    return;
  }

  parentObj[name] = newObj;
};

const insertMe = (html) => {
  const popup = document.querySelector('.popup_manage');
  const htmlP = document.querySelector('.manage-overflow');
  if (htmlP) {
    popup.removeChild(htmlP);
    document.querySelector('.manage-heading').remove();
  }

  if (!html)
    html = `
    <h2 class="manage-heading">Create a new Tour</h2>
    <div class="add-items">
      <div class="add-items_cont">
      <i style="font-size: 16px;" class="fa fa-plus"></i>
        <div class="add-items_it">
          <p class="add-me"><i data-for="location" class="fa fa-plus-circle btn-plus-circle add-spe"></i>location</p>
          <p class="add-me"><i data-for="startDate" class="fa fa-plus-circle btn-plus-circle add-spe"></i>startDate</p>
        </div>
      </div>
    </div>
  <div class="manage-overflow">
    <form class="manage-form my-border">
      <div class="manage-form__group">
        <label class="manage-label" for="name">name</label>:
        <input class="one-way_input" type="text" id="name" required />
      </div>
      <div class="manage-form__group">
        <label class="manage-label" for="difficulty">Difficulty</label>:
        <input class="one-way_input" class="manage_input" type="text" id="difficulty" required />
      </div>
      <div class="manage-form__group">
        <label class="manage-label" for="duration">Duration</label>:
        <input class="one-way_input" type="number" id="duration" required />
      </div>
      <div class="manage-form__group">
        <label class="manage-label" for="price">Price</label>:
        <input class="one-way_input" type="number" id="price" id="price" required />
      </div>
      <div class="manage-form__group">
        <label class="manage-label" for="summary">Summary</label>:
        <input class="one-way_input" type="text" id="summary"  required />
      </div>
      <div class="manage-form__group">
        <label class="manage-label" for="maxGroupSize">maxGroupSize</label>:
        <input class="one-way_input" type="number" id="maxGroupSize"  id="price" required />
      </div>
      <div class="manage-form__group">
        <label class="manage-label" for="description">Description</label>:
        <input
          class="one-way_input"
          type="text"
          id="description"
        />
      </div>
      
      <div class="manage-form__group">
        <label class="manage-label" for="image-cover">imageCover</label>:
        <input class="one-way_input" type="text" id="imageCover" />
      </div>
      <div class="manage-form__group">
        <label class="manage-label" for="guides">guides</label>:
        <input class="one-way_input" type="text" id="guides" />
      </div>
    
      <div data-type="startLocation" class="manage-form__group">
        <p class="manage-label">startLocation <i class="fa fa-caret-down manage-dropdown" data-one-parent='yeah' ></i></p>
        <ul class="unordered-list arrays">
          <li>
            <label for="type">type :</label>
            <input type="text" id="type"> 
          </li>
          <li class="start-location">
            <label for="desc">description :</label>
            <input type="text" id="desc" >
          </li>
          <li>
            <label for="Coordinates">coordinates :</label>
            <input type="text" id="Coordinates" >
          </li>
          <li>
            <label for="address">address :</label>
            <input type="text" id="address" >
          </li>
        </ul>
      </div>
      <div class="manage-form__group">
        <p class="manage-label">Locations <i class="fa fa-caret-down manage-dropdown"></i></p>
        <ul data-count="1" class="unordered-list locations">
          <li data-type="locations"><i class="fa fa-caret-down manage-dropdown"></i> location 1
            <ul class="location-unordered-list arrays">
              <li>
                <label for="lType">type :</label>
                <input type="text" id="lType">
              </li>
              <li>
                <label for="lDesc">description :</label>
                <input type="text" id="lDesc">
              </li>
              <li>
                  <label for="lCoor">coordinates :</label>
                  <input type="text" id="lCoor">
              </li> 
              <li>
                  <label for="lday">day :</label>
                  <input type="number" id="lday">
              </li>
            </ul>
          </li>
        </ul>
      </div>
      <div class="manage-form__group">
        <p class="manage-label">StartDates <i class="fa fa-caretzz-down manage-dropdown"></i></p>
        <ul data-count="1" class="unordered-list startDates">
          <li data-type="startDates"><i class="fa fa-caret-down manage-dropdown"></i> startDate 1
            <ul class="location-unordered-list arrays">
              <li>
                <label for="participants">participants :</label>
                <input type="number"  id="participants">
              </li>
              <li>
                <label for="soldOut">soldOut :</label>
                <input type="text" id="soldOut">
              </li>
              <li>
                <label for="date">date :</label>
                <input type="text" id="date">
              </li>
            </ul>
          </li>
        </ul>
      </div>
      </div>
  `;

  popup.insertAdjacentHTML('beforeend', html);
};

if (adminToursBtn) {
  allowed = true;
  document
    .querySelector('.card-container')
    .addEventListener('click', async (e) => {
      let myPos, howMany;
      myPos = e.target.parentElement.parentElement.dataset.pos;
      howMany = 2;
      if (!myPos) {
        myPos = e.target.parentElement.dataset.pos;
        howMany = 1;
      }
      if (
        e.target.classList.contains('fa-trash-o') ||
        e.target.classList.contains('btn-manage_delete')
      ) {
        let baseElm = e.target.parentElement;
        if (howMany === 2) baseElm = baseElm.parentElement;
        const id = baseElm.dataset.id;

        const check = prompt(
          `Are you sure, Do you want to delete this review? reply 'yes' if you want so.`
        );

        const child = baseElm.parentElement.parentElement;

        if (check === 'yes') deleteTour(child.parentElement, child, id);
      } else if (
        e.target.classList.contains('fa-pencil') ||
        e.target.classList.contains('btn-manage_edit')
      ) {
        let id = e.target.parentElement.dataset.id;
        if (!id) id = e.target.parentElement.parentElement.dataset.id;
        isOnce = true;
        parentObj = {};

        manageClasses('show_popup', 'hide_popup');
        addPopupEvent(false, true);
        addPopupEvent(
          false,
          false,
          false,
          document.querySelector('.popup_right'),
          document.querySelector('.fa-check'),
          id
        );

        const html = await getHtml(id);

        insertMe(html);

        document
          .querySelector('.manage-form')
          .addEventListener('click', (ev) => {
            if (ev.target.classList.contains('manage-dropdown')) {
              return manageDrops(ev);
            }

            if (ev.target.classList.contains('fa-plus')) {
              let { cur } = ev.target.dataset;
              cur = cur * 1;
              let html = `
                          <label class="manage-choose image-cover" for="images ${
                            cur + 1
                          }">choose New</label>
                          {
                            <label><i class="fa fa-plus" style="font-size: 13px;" data-cur = ${
                              cur + 1
                            }></i></label>
                          }
                          <input class="manage_hidden images" type="file" accept="img/*", id="images ${
                            cur + 1
                          }"></input>
                          `;

              if (cur >= 2) {
                html = html.replace(/\s?\{[^}]+\}/g, '');
              } else {
                html = html.replace(/[{()}]/g, '');
              }
              ev.target.remove();

              document
                .querySelector('.images_parent')
                .insertAdjacentHTML('beforeend', html);

              document
                .querySelector('.images-second')
                .insertAdjacentHTML('beforeend', '<label>img name</label>');
            }

            if (!ev.target.type) return;

            ev.target.addEventListener('keypress', (e) => {
              if (e.keyCode === 13 || e.which === 13) {
                const root = e.target.parentElement.parentElement;
                const { type, pos } = root.dataset;

                if (type === 'startLocation') {
                  handler(root, type);

                  return;
                }

                if (pos) return handler(root, type, true);

                // test Data.
                let myVal = e.target.value;
                const name = e.target.previousElementSibling.textContent;

                if (name === 'guides')
                  myVal = myVal.split(',').map((el) => parseInt(el));
                parentObj[name] = myVal;
              }
            });
          });
      } else if (
        e.target.classList.contains('create-tour') ||
        e.target.classList.contains('create-para') ||
        e.target.classList.contains('fa-plus-circle')
      ) {
        isOnlyOnce = true;
        manageClasses('show_popup', 'hide_popup');
        addPopupEvent(false, true);
        addPopupEvent(
          false,
          false,
          true,
          document.querySelector('.popup_right'),
          document.querySelector('.fa-check')
        );

        insertMe();
        const addButtons = Array.from(document.querySelectorAll('.add-me'));
        const addIcons = Array.from(document.querySelectorAll('.add-spe'));
        addButtons.concat(...addIcons);

        // locations and startDates.
        addButtons.forEach((el) => {
          el.addEventListener('click', (e) => {
            // 1) necessary steps.
            let name;
            if (e.target.classList.contains('add-me')) {
              name = e.target.textContent;
            } else {
              name = e.target.dataset.for;
            }

            const parentElm = document.querySelector(`.${name}s`);
            let { count } = parentElm.dataset;

            // 2) Construct the bare html.
            let html = `
                <li><i class="fa fa-caret-down manage-dropdown"></i> ${name} ${
              count * 1 + 1
            }
            )
                    <ul class="location-unordered-list arrays">
                        <li>
                            <label for="(LABEL1)">(LABEL1) :</label>
                            <input type="(TYPE1)" id="(LABEL1)">
                        </li>
                        <li>
                            <label for="(LABEL2)">(LABEL2) :</label>
                            <input type="text" id="(LABEL2)">
                        </li>
                        <li>
                            <label for="(LABEL3)">(LABEL3) :</label>
                            <input type="text" id="(LABEL3)">
                        </li>
                        {
                        <li>
                            <label for="day">day :</label>
                            <input type="number" id="day">
                        </li>
                        }
                    </ul>
                </li>`;
            parentElm.dataset.count = count * 1 + 1;

            // 3) replace values with actual data.
            if (name.endsWith('tion')) {
              html = html
                .replace(/(LABEL1)/g, 'type')
                .replace('(TYPE1)', 'text')
                .replace(/(LABEL2)/g, 'description')
                .replace(/(LABEL3)/g, 'coordinates')
                .replace(/[{()}]/g, '');
            } else {
              html = html
                .replace(/(LABEL1)/g, 'participants')
                .replace('(TYPE1)', 'number')
                .replace(/(LABEL2)/g, 'soldOut')
                .replace(/(LABEL3)/g, 'date')
                .replace(/\s?\{[^}]+\}/g, '')
                .replace(/[(())]/g, '');
            }

            // 4) Render the html.
            parentElm.insertAdjacentHTML('beforeend', html);
          });
        });
      }
    });
}
