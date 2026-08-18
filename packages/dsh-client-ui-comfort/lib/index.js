/**
 * Comfort layer for the DSH Web UI — node half.
 *
 * Pure client plugin: the empty apply exists only so the package appears in
 * the host Loader tree (the client-modules scan walks host Loader entries for
 * `dsh.client` declarations). The browser half ships via exports["./client"].
 *
 * All visual changes are gated on <html data-dsh-comfort>; disabling the
 * plugin (or flipping its in-UI pill) returns the stock UI exactly.
 */
export const name = 'dsh-client-ui-comfort'
export const inject = []
export function apply() {}
