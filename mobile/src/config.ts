// While building, the app talks to STAGING so tests never touch real customers.
// For a production build, set EXPO_PUBLIC_API_URL=https://api.eworksocial.com/api
export const API_URL: string = (
  process.env.EXPO_PUBLIC_API_URL || 'https://api-staging-769c.up.railway.app/api'
).replace(/\/+$/, '');
