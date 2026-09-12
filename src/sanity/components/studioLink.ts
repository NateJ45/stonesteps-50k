import { useWorkspace } from 'sanity';
import { useRouter } from 'sanity/router';

// =============================================================================
// studioLink — turn "the race document" into something a card can navigate to
// =============================================================================
// Shared by WelcomePane, RaceYearTool and GuideView's PathCard, so all three
// deep-link the same way and only one of them can be wrong.
//
// THE ROUTING RULE, which cost WCP a real bug: the deployed embedded Studio is
// HASH-routed. A plain <a href="/studio/structure/..."> leaves the Studio and
// 404s, so the click has to go through the router. The href is still built as a
// best-effort real URL, so middle-click and open-in-new-tab keep working.
// =============================================================================

export type StudioTarget =
  /**
   * A document's editor, by id. `type` defaults to the id (the singleton
   * convention). `field` scrolls to and focuses one field once it opens, which
   * is the difference between "here is the race document" and "here is the
   * date": a guide that says "set Race date" should not then ask the reader to
   * find it. Use the field's schema name, dotted for something nested.
   */
  | { doc: string; type?: string; field?: string }
  /** A structure pane by its id path, ';'-separated for nesting. */
  | { pane: string };

export function useStudioLink() {
  const router = useRouter();
  const { basePath } = useWorkspace();

  return function linkTo(target: StudioTarget) {
    const path =
      'doc' in target
        ? `${basePath}/intent/edit/id=${target.doc};type=${target.type ?? target.doc}` +
          // Sanity's own parameter for "open on this field".
          (target.field ? `;path=${encodeURIComponent(target.field)}` : '')
        : `${basePath}/structure/${target.pane}`;
    const isHashRouted = typeof window !== 'undefined' && window.location.hash.startsWith('#/');
    const href = isHashRouted ? `${window.location.pathname}#${path}` : path;
    return {
      href,
      onClick: (event: { preventDefault: () => void; metaKey?: boolean; ctrlKey?: boolean }) => {
        // Let the browser handle a deliberate new-tab click.
        if (event.metaKey || event.ctrlKey) return;
        event.preventDefault();
        router.navigateUrl({ path });
      },
    };
  };
}
