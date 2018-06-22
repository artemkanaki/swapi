import { NodeStorage } from '../storage';
import { Node } from '../types';
import { normalizePath } from '../helpers/normalize.path';

export function BaseUrl(path: string, relatedTo?: { new (...args: any[]): any }, pathCombiner: string = null) {
  path = normalizePath(path);

  return function(constructor: any) {
    const node: Node = {
      name: constructor.name,
      path,
      relatedTo: relatedTo ? relatedTo.name : null,
      combiner: pathCombiner
    } as Node;
    NodeStorage.getInstance().upsertNode(node);
  }
}

