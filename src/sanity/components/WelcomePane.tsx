import { Box, Button, Card, Flex, Stack, Text } from '@sanity/ui';
import { ToolHeading } from './ToolHeading';
import { useStudioLink, type StudioTarget } from './studioLink';
import { OPEN_EVENT } from './StudioTour';

// =============================================================================
// WelcomePane — the Studio landing screen
// =============================================================================
// The first thing the race director sees: a short hello and a grid of TASK
// cards that go straight to the thing he came to do, instead of a menu he has
// to decode. Ported from west-chester-preschool.
//
// The cards are the jobs, in the order they come up across a year, not the
// order the data happens to sit in. Somebody arriving in January wants the
// date and the prices; somebody arriving in November wants the results.
// =============================================================================

interface Task {
  emoji: string;
  title: string;
  blurb: string;
  target: StudioTarget;
}

const TASKS: Task[] = [
  {
    emoji: '📅',
    title: 'Change the race date',
    blurb: 'Next year’s date and edition number. Moves the countdown, the footer and Google.',
    target: { doc: 'race', field: 'raceDate' },
  },
  {
    emoji: '⏱️',
    title: 'Race-day schedule',
    blurb: 'The start times and the course close, as printed on the home page.',
    target: { pane: 'this-years-race;orderable-scheduleItem' },
  },
  {
    emoji: '💵',
    title: 'Entry fees and caps',
    // The prices live on each distance, not on the race document: see the note
    // in src/lib/raceYearSteps.ts. This card opened a screen with nothing on it
    // to change.
    blurb: 'The prices on the two tickets, and how many entries each distance takes.',
    target: { pane: 'this-years-race;orderable-distance' },
  },
  {
    emoji: '🩺',
    title: 'Checkup',
    blurb: 'What needs attention right now: stale dates, unconfirmed details, missing results.',
    target: { pane: 'checkup' },
  },
  {
    emoji: '🗓️',
    title: 'Start a new race year',
    blurb: 'The rollover list, with what is already done ticked off.',
    target: { pane: 'race-year' },
  },
  {
    emoji: '🏁',
    title: 'This year’s results',
    blurb: 'Every finisher, by year. They import themselves; this is where to look.',
    target: { pane: 'this-years-race;results' },
  },
  {
    emoji: '❔',
    title: 'Help & Guide',
    blurb: 'How all of this works, in plain language. Start here if anything is unclear.',
    target: { pane: 'help-and-guide' },
  },
];

function TaskCard({ task }: { task: Task }) {
  const linkTo = useStudioLink();
  const link = linkTo(task.target);
  return (
    <Card
      as="a"
      padding={4}
      radius={3}
      border
      href={link.href}
      onClick={link.onClick}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      <Flex align="flex-start" gap={3}>
        <span
          aria-hidden
          style={{
            background: '#f6e7e2',
            color: '#8f3323',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: 10,
            fontSize: 17,
            flexShrink: 0,
          }}
        >
          {task.emoji}
        </span>
        <Stack space={2} style={{ flex: 1 }}>
          <Text size={2} weight="semibold">
            {task.title}
          </Text>
          <Text size={1} muted style={{ lineHeight: 1.5 }}>
            {task.blurb}
          </Text>
        </Stack>
      </Flex>
    </Card>
  );
}

export function WelcomePane() {
  return (
    <Box padding={4}>
      <Stack space={5} style={{ maxWidth: 720, margin: '0 auto' }}>
        <Stack space={3}>
          <ToolHeading emoji="👋">Welcome</ToolHeading>
          <Text size={2} muted style={{ lineHeight: 1.6 }}>
            This is the control room for the Stone Steps 50K website. Nothing you do here reaches
            the public site until you press Publish, so it is safe to look around. Pick a job below,
            or use the menu on the left.
          </Text>
        </Stack>

        <Stack space={3}>
          {TASKS.map((t) => (
            <TaskCard key={t.title} task={t} />
          ))}
        </Stack>

        <Card padding={4} radius={3} tone="primary" border>
          <Stack space={2}>
            <Text size={1} weight="semibold">
              The results look after themselves.
            </Text>
            <Text size={1} style={{ lineHeight: 1.5 }}>
              You do not upload them. The site checks RunSignUp every day through October and
              November and pulls in whatever your timer has posted, then rebuilds itself.
            </Text>
          </Stack>
        </Card>

        {/* The tour greets you once per browser and then never again, so this
            is the only way back to it. Cheap to offer, and the alternative is
            an editor who half-remembers it and cannot find it. */}
        <Flex>
          <Button
            text="Show the welcome tour again"
            mode="ghost"
            onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
          />
        </Flex>
      </Stack>
    </Box>
  );
}
