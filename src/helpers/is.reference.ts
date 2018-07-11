export function isReference(type: string) {
  return type.indexOf('#/') === 0;
}