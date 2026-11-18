import { parseCaptureBody } from './capture-parse.util';

describe('parseCaptureBody', () => {
  it('reads common field names', () => {
    const p = parseCaptureBody({ name: 'Ada Obi', email: 'ADA@Acme.com', phone: '+2348000000', company: 'Acme', message: 'Need help' });
    expect(p).toMatchObject({ spam: false, name: 'Ada Obi', email: 'ada@acme.com', phone: '+2348000000', company: 'Acme', message: 'Need help', emailInvalid: false });
  });

  it('understands Contact Form 7 style names and first/last name', () => {
    const p = parseCaptureBody({ 'your-name': 'Bola', 'your-email': 'b@x.com', 'your-message': 'Hi' });
    expect(p.name).toBe('Bola');
    expect(p.email).toBe('b@x.com');
    expect(p.message).toBe('Hi');
    expect(parseCaptureBody({ first_name: 'Chi', last_name: 'Eze', email: 'c@x.com' }).name).toBe('Chi Eze');
  });

  it('hoists nested form shapes (Elementor-style and bracket keys)', () => {
    const p = parseCaptureBody({ fields: { name: { value: 'Dayo' }, email: { value: 'd@x.com' } } });
    expect(p.name).toBe('Dayo');
    expect(p.email).toBe('d@x.com');
    expect(parseCaptureBody({ fields: { email: 'e@x.com' } }).email).toBe('e@x.com');
  });

  it('flags honeypot submissions as spam', () => {
    expect(parseCaptureBody({ email: 'a@b.com', _gotcha: 'I am a bot' }).spam).toBe(true);
    expect(parseCaptureBody({ email: 'a@b.com', 'bot-field': 'x' }).spam).toBe(true);
    expect(parseCaptureBody({ email: 'a@b.com', _gotcha: '' }).spam).toBe(false);
  });

  it('reports an invalid email instead of storing it', () => {
    const p = parseCaptureBody({ name: 'X', email: 'not-an-email' });
    expect(p.email).toBeUndefined();
    expect(p.emailInvalid).toBe(true);
  });

  it('keeps other answers as extras but never tokens, passwords or underscore fields', () => {
    const p = parseCaptureBody({
      email: 'a@b.com', budget: '$5k', service: 'SEO', _wpnonce: 'zzz', csrf_token: 'abc', password: 'hunter2', 'g-recaptcha-response': 'x',
    });
    expect(p.extras).toEqual([['budget', '$5k'], ['service', 'SEO']]);
  });

  it('survives garbage input', () => {
    for (const b of [null, undefined, 'text', 42, [], {}]) {
      const p = parseCaptureBody(b as any);
      expect(p.spam).toBe(false);
      expect(p.email).toBeUndefined();
    }
  });
});
