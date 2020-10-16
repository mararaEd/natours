export default (allStars) =>
  allStars.forEach((el) => {
    el.addEventListener('click', (e) => {
      // 1) remove the active and special class from all if any.
      allStars.forEach((el) => {
        el.classList.remove('reviews__star--active');
        el.classList.add('reviews__star--inactive');
        el.classList.remove('actual_rating');
      });

      // 2) add the special class to only the current star.
      e.target.classList.add('actual_rating');

      // 3) add the active class starting from the current start in descending order.
      // current element index.
      const currentIn = parseInt(e.target.dataset.rating - 1);

      allStars.forEach((el, i) => {
        if (i <= currentIn) {
          el.classList.remove('reviews__star--inactive');
          el.classList.add('reviews__star--active');
        }
      });
    });
  });
