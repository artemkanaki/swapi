export function normalizePath(path: string) {
  if (path === '//' || path === '/') {
    return path;
  }

  path = path.indexOf('/') === 0 ? path.slice(1, path.length) : path;
  path = path.lastIndexOf('/') === (path.length - 1) ? path.slice(0, path.length - 1) : path;

  return path;
}
