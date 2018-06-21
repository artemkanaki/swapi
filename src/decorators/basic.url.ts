import { NodeStorage } from '../storage';
import { Node } from '../types';
import { normalizePath } from '../helpers/normalize.path';

export function BaseUrl(path: string, relatedTo?: string | { new (...args: any[]): any }) {
  path = normalizePath(path);

  return function(constructor: any) {
    const relatedToName = !relatedTo || typeof relatedTo === 'string' ? relatedTo : relatedTo.name;

    const node: Node = {
      name: constructor.name,
      path,
      relatedTo: relatedToName
    } as Node;
    NodeStorage.getInstance().upsertNode(node);
  }
}

