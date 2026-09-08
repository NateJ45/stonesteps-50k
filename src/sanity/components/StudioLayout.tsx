import type { LayoutProps } from 'sanity';
import { StudioTour } from './StudioTour';

// =============================================================================
// StudioLayout — the hook that lets the first-visit tour exist
// =============================================================================
// Sanity gives no "run something once when the Studio opens" hook, so the tour
// rides the layout: it renders after the default chrome, so its dialog stacks
// above everything.
//
// Deliberately thin. WCP's version also loads brand fonts here, because its
// Studio theme names a display face that has to be fetched. This Studio's theme
// bakes its fonts in at build time (see sanity.config.ts), so there is nothing
// to load and adding anything else here would be putting weight on a file whose
// only job is to mount one component.
// =============================================================================

export function StudioLayout(props: LayoutProps) {
  return (
    <>
      {props.renderDefault(props)}
      <StudioTour />
    </>
  );
}
