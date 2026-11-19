/**
 * Plain-language options for the new-business onboarding. Served by the API so the
 * wording can be improved without a new app release. No jargon: owners should never
 * see words like pillars, agent or automation.
 */

export const TONES = ['FRIENDLY', 'PROFESSIONAL', 'BOLD', 'PLAYFUL'] as const;
export type Tone = (typeof TONES)[number];

export const FREQUENCIES = ['FEW_PER_WEEK', 'DAILY', 'ON_DEMAND'] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const PLATFORMS = ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'TWITTER', 'TIKTOK', 'YOUTUBE', 'THREADS', 'BLUESKY'] as const;

export const FREQUENCY_OPTIONS: Array<{ id: Frequency; label: string; hint: string }> = [
  { id: 'FEW_PER_WEEK', label: 'A few times a week', hint: 'About 3 posts a week. A good start for most businesses.' },
  { id: 'DAILY', label: 'Every day', hint: 'Stay in front of your customers daily.' },
  { id: 'ON_DEMAND', label: 'Only when I have news', hint: 'You decide when. We help you write it.' },
];

export const TONE_LABELS: Record<Tone, string> = {
  FRIENDLY: 'Friendly',
  PROFESSIONAL: 'Professional',
  BOLD: 'Bold',
  PLAYFUL: 'Playful',
};

export type CategoryOption = {
  id: string;
  label: string;
  audienceExamples: string[];
  contentTypes: string[];
  ideaChips: string[];
  toneSamples: Record<Tone, string>;
};

export const CATEGORIES: CategoryOption[] = [
  {
    id: 'FOOD',
    label: 'Food and restaurant',
    audienceExamples: ['Families and office workers nearby', 'Young people who love good food'],
    contentTypes: ["Today's special", 'Offers and deals', 'Behind the scenes', 'Customer reviews', 'New menu items'],
    ideaChips: ["Today's special", 'A new dish', 'Weekend offer'],
    toneSamples: {
      FRIENDLY: 'Our jollof is ready and the table is waiting. Come hungry!',
      PROFESSIONAL: 'Our chef-prepared lunch menu is now available, Monday to Friday.',
      BOLD: 'The best jollof in town. Come taste the difference.',
      PLAYFUL: 'Warning: this jollof may cause second helpings.',
    },
  },
  {
    id: 'FASHION_BEAUTY',
    label: 'Fashion and beauty',
    audienceExamples: ['Women who like to look good on a budget', 'Brides and event guests'],
    contentTypes: ['New arrivals', 'Styling tips', 'Before and after', 'Customer love', 'Offers'],
    ideaChips: ['New arrivals', 'Styling tip', 'Customer photo'],
    toneSamples: {
      FRIENDLY: 'Fresh pieces just landed. Come and find your next favourite!',
      PROFESSIONAL: 'Our new collection is now available, made with quality fabrics.',
      BOLD: 'Stand out. Our new collection is here.',
      PLAYFUL: 'New drop, who dis? Your wardrobe called, it wants these.',
    },
  },
  {
    id: 'REAL_ESTATE',
    label: 'Real estate',
    audienceExamples: ['First-time home buyers', 'Investors and landlords'],
    contentTypes: ['New listings', 'Market tips', 'Sold and let', 'Client testimonials', 'Neighbourhood spotlight'],
    ideaChips: ['New listing', 'Buying tip', 'Just sold'],
    toneSamples: {
      FRIENDLY: 'Found a lovely 3-bedroom that feels like home. Come and see it!',
      PROFESSIONAL: 'New listing: 3-bedroom apartment, fully serviced. Viewing by appointment.',
      BOLD: 'Prime location. Great price. This one will not last.',
      PLAYFUL: 'This kitchen is so nice you will want to cook. Yes, really.',
    },
  },
  {
    id: 'HEALTH_WELLNESS',
    label: 'Health and wellness',
    audienceExamples: ['People who want to feel better and stay active', 'Busy professionals'],
    contentTypes: ['Health tips', 'Class or session times', 'Client stories', 'Offers', 'Behind the scenes'],
    ideaChips: ['Wellness tip', 'This week\'s classes', 'Client story'],
    toneSamples: {
      FRIENDLY: 'A small step today makes a big difference. We are here to help.',
      PROFESSIONAL: 'Our new group sessions begin Monday. Book your place today.',
      BOLD: 'No more excuses. Your healthiest year starts now.',
      PLAYFUL: 'Stretching is just a hug for your muscles. Join us!',
    },
  },
  {
    id: 'EDUCATION',
    label: 'Education and training',
    audienceExamples: ['Parents looking for good schools or lessons', 'Adults upgrading their skills'],
    contentTypes: ['Course announcements', 'Student wins', 'Learning tips', 'Enrolment reminders', 'Events'],
    ideaChips: ['New course', 'Student success', 'Enrolment open'],
    toneSamples: {
      FRIENDLY: 'Enrolment is open! Come and learn something new with us.',
      PROFESSIONAL: 'Registration is now open for our next certificate programme.',
      BOLD: 'Upgrade your skills. Upgrade your income. Start today.',
      PLAYFUL: 'Homework that you actually want to do? We have that.',
    },
  },
  {
    id: 'PROFESSIONAL_SERVICES',
    label: 'Professional services',
    audienceExamples: ['Small business owners', 'Families who need trusted advice'],
    contentTypes: ['Helpful tips', 'Client results', 'Service updates', 'Team and behind the scenes', 'Events'],
    ideaChips: ['Helpful tip', 'Client result', 'Book a call'],
    toneSamples: {
      FRIENDLY: 'Not sure where to start? Let us have a quick chat, no pressure.',
      PROFESSIONAL: 'We help growing businesses stay compliant and organised. Book a consultation.',
      BOLD: 'Stop guessing. Get clear answers from people who know.',
      PLAYFUL: 'Paperwork is nobody\'s favourite. Good thing it is ours.',
    },
  },
  {
    id: 'SHOPS_ECOMMERCE',
    label: 'Shops and e-commerce',
    audienceExamples: ['Online shoppers who like a good deal', 'Local customers who prefer to buy from us'],
    contentTypes: ['New products', 'Offers and discounts', 'Customer reviews', 'How to use it', 'Delivery updates'],
    ideaChips: ['New product', 'Flash sale', 'Customer review'],
    toneSamples: {
      FRIENDLY: 'Just restocked your favourites. Come take a look!',
      PROFESSIONAL: 'New stock now available. Free delivery on orders above a set amount.',
      BOLD: 'Limited stock. Big savings. Get yours before it is gone.',
      PLAYFUL: 'Your cart called. It is feeling a little empty.',
    },
  },
  {
    id: 'EVENTS_ENTERTAINMENT',
    label: 'Events and entertainment',
    audienceExamples: ['People planning weddings and parties', 'Fans who love live events'],
    contentTypes: ['Upcoming events', 'Photos and highlights', 'Ticket and booking reminders', 'Behind the scenes', 'Testimonials'],
    ideaChips: ['Upcoming event', 'Event highlights', 'Booking open'],
    toneSamples: {
      FRIENDLY: 'Tickets are going fast. Come celebrate with us!',
      PROFESSIONAL: 'Booking is now open for our next event. Reserve your place today.',
      BOLD: 'The night everyone will talk about. Do not miss it.',
      PLAYFUL: 'Dancing shoes on? Good. See you at the party.',
    },
  },
  {
    id: 'OTHER',
    label: 'Something else',
    audienceExamples: ['People in my local area', 'Customers who found me by word of mouth'],
    contentTypes: ['Updates and news', 'Offers', 'Behind the scenes', 'Customer stories', 'Tips'],
    ideaChips: ['Business update', 'Special offer', 'Customer story'],
    toneSamples: {
      FRIENDLY: 'Thank you for supporting us. We have something new to share!',
      PROFESSIONAL: 'We are pleased to announce an update to our services.',
      BOLD: 'Big news. You will want to see this.',
      PLAYFUL: 'Guess what we have been working on? Surprise!',
    },
  },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export function getOptions() {
  return {
    categories: CATEGORIES,
    tones: TONES.map((id) => ({ id, label: TONE_LABELS[id] })),
    frequencies: FREQUENCY_OPTIONS,
    platforms: PLATFORMS,
  };
}
