import axios from 'axios';
import { showAlert } from './alerts';
import error from './errors';

const changeBtns = (pos, from, to, btnF, btnT, text) => {
  let btn, i;
  if (text) {
    btn = Array.from(document.querySelectorAll(`.${btnF}`))[pos];
    i = Array.from(document.querySelectorAll(`.${from}`))[pos];
  } else {
    btn = document.querySelector(`.${btnF}`);
    i = document.querySelector(`.${from}`);
  }

  i.classList.add(to);
  i.classList.remove(from);
  btn.classList.add(btnT);
  btn.classList.remove(btnF);
};

const createElement = (e, howMany, elm, classes, review, id, text) => {
  // 1) Create the new elm.
  const element = document.createElement(elm);

  // classes
  classes.forEach((el) => {
    element.classList.add(el);
  });

  // attribs
  if (text) {
    const values = [27, 7, 'myReviewsText', false];
    const attrb = ['cols', 'rows', 'id', 'spellCheck'];
    attrb.forEach((el, i) => {
      element.setAttribute(el, values[i]);
    });
    const allParas = Array.from(
      document.querySelectorAll('.card__text-review')
    );

    allParas[review].parentElement.removeChild(allParas[review]);
    review = allParas[review].textContent;

    element.value = review;
  } else {
    const area = document.querySelector('.add_reviews');
    review = area.value;
    area.parentElement.removeChild(area);
    element.appendChild(document.createTextNode(review));
  }

  // Append the newElm
  let appElm = e.target.parentElement;
  if (howMany === 2) appElm = appElm.parentElement;

  appElm.previousSibling.previousSibling.appendChild(element);
};

export const toTextArea = (pos, e, howMany, id, ...classes) => {
  // 1) Change elm.
  createElement(e, howMany, 'textarea', classes, pos, id, true);

  // 2) Change the edit button to right.
  changeBtns(
    pos,
    'fa-pencil',
    'fa-check',
    'btn-review_edit',
    'btn-review_right',
    true
  );
};

export const updateReview = async (
  pos,
  e,
  howMany,
  rating,
  review,
  id,
  cease
) => {
  // updating review
  if (!review) {
    return showAlert('error', 'Review  is missing.');
  }

  if (rating || review) {
    // 1) Check review.
    try {
      const res = await axios(`http://127.0.0.1:3000/api/v1/reviews/${id}`);
      if (review && res.data.data.review.review === review && !rating)
        review = false;
    } catch (err) {
      if (!cease)
        return error(
          'error',
          err,
          updateReview,
          pos,
          e,
          howMany,
          rating,
          review,
          id
        );
      console.log(err);
    }

    if (review) {
      // 2) Update review.
      try {
        const res = await axios({
          method: 'PATCH',
          url: `http://127.0.0.1:3000/api/v1/reviews/${id}`,
          data: {
            rating,
            review,
          },
        });
        console.log(res.data);

        if (res.data.status === 'success') {
          showAlert('success', 'Review updated successfully!');
        }
      } catch (err) {
        return showAlert('error', err.response.data.message);
      }
    }
  }

  // 1) Change elm.
  createElement(e, howMany, 'p', ['card__text-review'], pos);

  // 2) change buttons.
  changeBtns(
    pos,
    'fa-check',
    'fa-pencil',
    'btn-review_right',
    'btn-review_edit'
  );
};

export const deleteReview = async (parent, child, id, cease) => {
  // Remove review from backEnd.
  try {
    await axios({
      method: 'DELETE',
      url: `http://127.0.0.1:3000/api/v1/reviews/${id}`,
    });
  } catch (err) {
    if (!cease) return error('error', err, deleteReview, parent, child, id);
    console.log(err);
  }

  // Revmove review from frontEnd
  parent.removeChild(child);
};
