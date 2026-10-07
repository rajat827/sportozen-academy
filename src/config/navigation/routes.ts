const routePatterns = [
  /^\/owner\/(dashboard|sessions|attendance|fees|communication|analytics|staff|settings)\/?$/,
  /^\/owner\/academy(?:\/(branches|programs))?\/?$/,
  /^\/(owner|coach)\/players(?:\/[^/]+)?\/?$/,
  /^\/coach\/(dashboard|sessions|squads|messages)\/?$/,
  /^\/coach\/development\/[^/]+\/?$/,
  /^\/coach\/sessions\/new\/?$/,
  /^\/coach\/sessions\/[^/]+\/(personalise|desk)\/?$/,
  /^\/coach\/(drills|evidence|reports)(?:\/[^/]+)?\/?$/,
  /^\/parent\/(home|schedule|progress|reports|fees|messages|profile)\/?$/,
];
export function isSupportedRoute(pathname: string): boolean {
  return routePatterns.some((pattern) => pattern.test(pathname));
}
