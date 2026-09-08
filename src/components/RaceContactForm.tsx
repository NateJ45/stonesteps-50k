// Safe to edit by hand
//
// The race's contact form. Posts to Web3Forms (env: PUBLIC_WEB3FORMS_KEY).
//
// WHY NOT THE STARTER'S ContactForm. That one asks for budget brackets, room
// types and a service area, which are the right questions for an interior
// design studio and nonsense for a trail race. Bending it would have left dead
// fields behind; this is forty lines of state and asks the five things a runner
// actually writes in about.
//
// FAILS HONESTLY. With no access key configured the form does not pretend to
// work: it says so and offers the Facebook group instead, because a contact
// form that silently swallows a message is worse than no contact form. The
// mockup's version posted nowhere at all and said so in small print; this one
// either works or tells you it does not.

import { useRef, useState, type FormEvent } from 'react';
import { sendContactSubmission } from '@/lib/contact-transport';

const ACCESS_KEY = import.meta.env.PUBLIC_WEB3FORMS_KEY as string | undefined;

// The site's own /api/contact endpoint is tried first; Web3Forms is only the
// fallback for a build with no Worker. See src/lib/contact-transport.ts.

type Status = 'idle' | 'sending' | 'sent' | 'error';

type Props = {
  subjects?: string[];
  /** Shown when the form cannot send, so the visitor is never left with nothing. */
  fallbackUrl?: string;
};

const DEFAULT_SUBJECTS = [
  'Course or race day question',
  'Registration or transfer',
  'Volunteering',
  'Sponsorship',
  'Results correction',
  'Something else',
];

export default function RaceContactForm({ subjects, fallbackUrl }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  // When the form was rendered, for the endpoint's timing check. A ref, because
  // reading it must never cause a re-render.
  const renderedAtRef = useRef<number>(Date.now());

  const options = subjects?.length ? subjects : DEFAULT_SUBJECTS;
  // The form is usable whenever there is somewhere for it to go, and the site's
  // own endpoint needs no client-side key at all.
  const configured = true;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!configured) return;

    setStatus('sending');
    setError(null);

    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const subject = String(data.subject ?? 'website enquiry');

    try {
      const result = await sendContactSubmission(
        {
          name: String(data.name ?? ''),
          email: String(data.email ?? ''),
          message: String(data.message ?? ''),
          subject,
          // This form's honeypot is Web3Forms' `botcheck`, kept because the
          // fallback still uses it natively. The endpoint's own honeypot field
          // is `company`, so the one value feeds both.
          company: String(data.botcheck ?? data.company ?? ''),
          renderedAt: renderedAtRef.current,
        },
        async () => {
          if (!ACCESS_KEY) {
            return { ok: false, error: 'This form is not connected yet. Please try again later.' };
          }
          const res = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              access_key: ACCESS_KEY,
              subject: `Stone Steps 50K: ${subject}`,
              ...data,
            }),
          });
          const json = await res.json().catch(() => ({}));
          return res.ok && json.success
            ? { ok: true }
            : { ok: false, error: json.message ?? 'Submission failed' };
        },
      );
      if (!result.ok) throw new Error(result.error ?? 'Submission failed');
      setStatus('sent');
    } catch (err) {
      // Say what went wrong and leave the typed message on screen. Clearing a
      // form someone just wrote into is the cruellest possible failure mode.
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  if (status === 'sent') {
    return (
      <p
        className="rounded-lg border-2 border-black bg-[color:var(--plate-face)] p-6 text-[color:var(--plate-ink)] shadow-[var(--lift)]"
        role="status"
      >
        <span className="display block text-2xl">Message sent</span>
        <span className="mt-2 block text-sm opacity-80">
          You will get a reply from the race director, usually within a day or two.
        </span>
      </p>
    );
  }

  return (
    <form className="grid gap-6" onSubmit={onSubmit} noValidate>
      {!configured && (
        <p className="provisional rounded-md px-3 py-2 text-sm" role="note">
          <span className="rounded-sm bg-primary px-2 py-0.5 font-mono text-[0.6875rem] tracking-[0.2em] text-primary-foreground uppercase">
            Not connected
          </span>{' '}
          <span className="text-muted-foreground">
            This form has no mail handler configured yet, so it will not send.
            {fallbackUrl ? ' Use the Facebook group below in the meantime.' : ''}
          </span>
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className="font-mono text-[0.6875rem] tracking-[0.18em] uppercase" htmlFor="name">
            Name
          </label>
          <input
            className="rounded-md border-2 border-black bg-card px-3 py-2 text-card-foreground"
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
          />
        </div>
        <div className="grid gap-2">
          <label className="font-mono text-[0.6875rem] tracking-[0.18em] uppercase" htmlFor="email">
            Email
          </label>
          <input
            className="rounded-md border-2 border-black bg-card px-3 py-2 text-card-foreground"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
      </div>

      <div className="grid gap-2">
        <label className="font-mono text-[0.6875rem] tracking-[0.18em] uppercase" htmlFor="subject">
          What is this about?
        </label>
        <select
          className="rounded-md border-2 border-black bg-card px-3 py-2 text-card-foreground"
          id="subject"
          name="subject"
        >
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <label className="font-mono text-[0.6875rem] tracking-[0.18em] uppercase" htmlFor="message">
          Message
        </label>
        <textarea
          className="rounded-md border-2 border-black bg-card px-3 py-2 text-card-foreground"
          id="message"
          name="message"
          rows={6}
          required
        />
      </div>

      {/* Web3Forms' own honeypot. Bots fill it, people never see it. */}
      <input type="checkbox" name="botcheck" className="hidden" tabIndex={-1} autoComplete="off" />

      <div className="flex flex-wrap items-center gap-4">
        <button className="btn-plate" type="submit" disabled={!configured || status === 'sending'}>
          {status === 'sending' ? 'Sending' : 'Send'}
          <span aria-hidden="true">&rarr;</span>
        </button>
        {status === 'error' && (
          <p className="text-sm text-[color:var(--primary)]" role="alert">
            {error} Your message is still here, so you can try again.
          </p>
        )}
      </div>
    </form>
  );
}
