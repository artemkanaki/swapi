import { Parameters, Endpoint, HttpMethods } from '../types';
import { pullOutParamsFromUrl } from '../helpers';
import { NodeStorage } from '../storage';

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
  const urlParams: Parameters = pullOutParamsFromUrl(path);

  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    const nodeName = target.constructor.name;

    const endpoint = {
      name: propertyName,
      path,
      method,
      description,
      urlParams
    } as Endpoint;

    NodeStorage.getInstance().upsertEndpoint(nodeName, endpoint.name, endpoint);
  }
}
