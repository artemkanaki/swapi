import { Endpoint, HttpMethods } from '../types';
import { pullOutParamsFromUrl, urlResolve } from '../helpers';
import { NodeStorage } from '../storage';
import { normalizePath } from '../helpers/normalize.path';

export function Get(path: string, description: string = '') {
  return BasicHttpMethodDecorator(path, HttpMethods.GET, description);
}

export function Post(path: string, description: string = '') {
  return BasicHttpMethodDecorator(path, HttpMethods.POST, description);
}

export function Put(path: string, description: string = '') {
  return BasicHttpMethodDecorator(path, HttpMethods.PUT, description);
}

export function Patch(path: string, description: string = '') {
  return BasicHttpMethodDecorator(path, HttpMethods.PATCH, description);
}

export function Delete(path: string, description: string = '') {
  return BasicHttpMethodDecorator(path, HttpMethods.DELETE, description);
}

function BasicHttpMethodDecorator(
  path: string,
  method: HttpMethods,
  description: string = ''
) {
  path = normalizePath(path);
  const urlParams = pullOutParamsFromUrl(path);

  return (target: any, endpointName: string, descriptor: PropertyDescriptor) => {
    const nodeName = target.constructor.name;

    const endpoint = {
      // FIXME: it should be generated as toCamelCase(nodeName + propertyName);
      name: endpointName,
      path,
      method,
      description,
      urlParams
    } as Endpoint;

    NodeStorage.getInstance().upsertEndpoint(nodeName, endpoint.name, endpoint);
  }
}
