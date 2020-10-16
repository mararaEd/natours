import axios from 'axios';
import { showAlert } from './alerts';
import error from './errors';

export const bookTour = async (tourId, pos, cease) => {
  const stripe = Stripe(
    'pk_test_51HWB35G28dd3SVQuB4aMSftfKizY2ACmTTeZ8VcO7cXusgeVNYlinK1gwFnCgDgq1Bk1FcWu0RvunyrAyXBCR9uX00CYssYvMg'
  );

  try {
    // 1) Get checkout session from API.
    const session = await axios(
      `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}/${pos}`
    );

    // 2) Create checkout form + charge credit card.
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
    // 3)
  } catch (err) {
    if (!cease) return error('error', err, bookTour, tourId);
    console.log(err);
  }
};
