import { generateParamMeta } from '../helpers';
import { NodeStorage } from '../storage';
import { BodyType } from '../types';

enum ParamLocation {
  Body = 'body',
  UrlPath = 'urlPath',
  Query = 'query'
}

export function BodyIsArray(target: any, methodName: string) {
  setBodyType(target, methodName, BodyType.Array);
}

export function BodyIsObject(target: any, methodName: string) {
  setBodyType(target, methodName, BodyType.Object);
}

export function BodyIsString(target: any, methodName: string) {
  setBodyType(target, methodName, BodyType.String);
}

export function BodyIsNumber(target: any, methodName: string) {
  setBodyType(target, methodName, BodyType.Number);
}

function setBodyType(target: any, methodName: string, type: BodyType) {
  const nodeName = target.constructor.name;
  const storageInstance = NodeStorage.getInstance();

  storageInstance.setBodyType(nodeName, methodName, BodyType.String);
}

export function Param(name: string, type: string, required?: boolean) {
  return VariativeDataDecorator(name, ParamLocation.UrlPath, type, required);
}

export function Query(name: string, type: string, required?: boolean) {
  return VariativeDataDecorator(name, ParamLocation.Query, type, required);
}

export function Body(name: string | Object, type?: string, required?: boolean) {
  return VariativeDataDecorator(name, ParamLocation.Body, type, required);
}

function VariativeDataDecorator(
  name: string | Object,
  location: ParamLocation,
  type?: string,
  required?: boolean
) {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    const nodeName = target.constructor.name;
    const storageInstance = NodeStorage.getInstance();

    let addParam: Function;
    if (location === ParamLocation.Body) {
      addParam = storageInstance.upsertBodyParam;
    } else if (location === ParamLocation.Query) {
      addParam = storageInstance.upsertQueryParam;
    } else if (location === ParamLocation.UrlPath) {
      addParam = storageInstance.upsertUrlParam;
    }

    if (typeof name === 'string') {
      const param = generateParamMeta(name, type, required);
      
      addParam.call(storageInstance, nodeName, propertyName, param);
    } else {
      Object
        .entries(name)
        .forEach(([ name, type ]) => {
          const param = generateParamMeta(name, type, required);
          addParam.call(storageInstance, nodeName, propertyName, param);
        });
    }
  }
}