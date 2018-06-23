import { Node } from '../types';
import { NodeStorage } from '../storage';

export function AbstractRouter(constructor: any) {
  const node: Node = {
    name: constructor.name,
    isAbstract: true
  } as Node;

  NodeStorage.getInstance().upsertNode(node);
}