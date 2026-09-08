import { useCallback, useEffect, useState } from 'react';
import { Box, Button, Card, Dialog, Flex, Heading, Stack, Text } from '@sanity/ui';

// =============================================================================
// StudioTour — the first-visit welcome
// =============================================================================
// A stepped dialog that greets the editor the FIRST time this browser opens the
// Studio, then never again. Ported from west-chester-preschool (PORTS.md card
// 31), trimmed: that site has two workspaces and a dozen document types to
// explain, this one has a race.
//
// WHY IT EXISTS ALONGSIDE THE WELCOME PANE. The Welcome pane has to be found;
// this arrives. This site is edited about twice a year by one person who did
// not ask for a website, and six months is long enough to forget that a draft
// is private and that publishing takes a couple of minutes to appear. Those two
// facts are the whole difference between confidence and a support email.
//
// It rides StudioLayout, so it needs no Sanity feature beyond a custom layout.
// Nothing here mutates anything: Escape, the close button and the last step
// all close it for good, device-locally.
//
// BUMP SEEN_KEY when the steps change enough that a returning editor should see
// them again. Do not bump it for a typo fix; being greeted by the same dialog
// twice is its own small insult.
// =============================================================================

const SEEN_KEY = 'stone-steps-studio-tour-v1';

/** The Welcome pane dispatches this to replay the tour on demand. */
export const OPEN_EVENT = 'stone-steps-studio-tour-open';

interface Step {
  emoji: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    emoji: '👋',
    title: 'Welcome to the Studio',
    body: 'This is where the Stone Steps website gets edited: the date, the times, the prices, the words and the photographs. Nothing you type is visible to anyone until you press Publish, so it is safe to look around and click things.',
  },
  {
    emoji: '🚀',
    title: 'How a change reaches the website',
    body: 'Edit the boxes, then press the Publish button at the bottom right. The website rebuilds itself in the background, so wait two or three minutes and refresh the page you changed. It does not appear the instant you publish, and that is normal.',
  },
  {
    emoji: '🖱️',
    title: 'You can edit the page by clicking the page',
    body: 'Open Presentation in the bar at the top to see the real site beside the Studio. Click any words on the page and the box that holds them opens next to it. What you see there is your unpublished draft, which is the point: you see the change before anyone else does.',
  },
  {
    emoji: '🏁',
    title: 'The results look after themselves',
    body: 'You do not upload them. The site checks RunSignUp every day through October and November, pulls in whatever your timer has posted, and rebuilds. The records, the age groups and every runner’s own page recalculate from those times, so nothing on the site can disagree with the results.',
  },
  {
    emoji: '🩺',
    title: 'Two pages that tell you what to do',
    body: 'Checkup lists anything that needs attention right now: a date that has passed, prices that are last year’s, details nobody has confirmed. Start a new race year is the rollover list, with whatever is already done ticked off. Both are in the menu on the left.',
  },
  {
    emoji: '❔',
    title: 'Everything else is in Help & Guide',
    body: 'Twelve short pages covering the jobs you would actually do, in plain language. If something here is unclear, it is worth telling Nathan: a confusing Studio is a fixable problem, not something to work around.',
  },
];

export function StudioTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // First visit on this device only. A private window or blocked storage
    // means the tour shows again, which is a much better failure than throwing.
    try {
      if (!localStorage.getItem(SEEN_KEY)) setOpen(true);
    } catch {
      /* storage unavailable: leave the tour closed rather than nag */
    }
  }, []);

  useEffect(() => {
    const replay = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, replay);
    return () => window.removeEventListener(OPEN_EVENT, replay);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* nothing to remember it with; the tour will greet them again */
    }
  }, []);

  if (!open) return null;
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <Dialog
      id="studio-tour"
      header="Getting started"
      width={1}
      onClose={close}
      footer={
        <Box padding={3}>
          <Flex align="center" gap={3}>
            <Text size={1} muted style={{ flex: 1 }}>
              {step + 1} of {STEPS.length}
            </Text>
            {step > 0 && <Button text="Back" mode="bleed" onClick={() => setStep((s) => s - 1)} />}
            <Button
              text={last ? 'Got it' : 'Next'}
              tone="primary"
              onClick={() => (last ? close() : setStep((s) => s + 1))}
            />
          </Flex>
        </Box>
      }
    >
      <Box padding={4}>
        <Stack space={4}>
          <Flex align="center" gap={3}>
            <span
              aria-hidden
              style={{
                background: '#f6e7e2',
                color: '#8f3323',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: 12,
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              {current.emoji}
            </span>
            <Heading size={2}>{current.title}</Heading>
          </Flex>
          <Text size={2} style={{ lineHeight: 1.6 }}>
            {current.body}
          </Text>
          <Card padding={3} radius={2} tone="transparent">
            <Text size={1} muted>
              You can close this at any time. It only appears on your first visit.
            </Text>
          </Card>
        </Stack>
      </Box>
    </Dialog>
  );
}
