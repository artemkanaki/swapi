import { generateParamMeta, isReference } from '../helpers';
import { NodeStorage } from '../storage';
import { Types, ParameterLocation } from '../types';

export function BodyIsArray(target: any, methodName: string) {
  const nodeName = target.constructor.name;
  const storageInstance = NodeStorage.getInstance();

  storageInstance.markBodyAsArray(nodeName, methodName);
}

export function BodyIsObject(target: any, methodName: string) {
  setBodyType(target, methodName, Types.Object);
}

export function BodyIsString(target: any, methodName: string) {
  setBodyType(target, methodName, Types.String);
}

export function BodyIsNumber(target: any, methodName: string) {
  setBodyType(target, methodName, Types.Number);
}

function setBodyType(target: any, methodName: string, type: Types) {
  const nodeName = target.constructor.name;
  const storageInstance = NodeStorage.getInstance();

  storageInstance.setBodyType(nodeName, methodName, Types.String);
}

export function Param(name: string | Object, type?: string) {
  return VariativeDataDecorator(name, ParameterLocation.UrlPath, type);
}

export function Query(name: string | Object, type?: string, required?: boolean) {
  return VariativeDataDecorator(name, ParameterLocation.Query, type, required);
}

export function Body(name: string | Object, type?: string, required?: boolean) {
  return VariativeDataDecorator(name, ParameterLocation.Body, type, required);
}

function VariativeDataDecorator(
  name: string | Object,
  location: ParameterLocation,
  type?: string,
  required?: boolean
) {
  return (target: any, endpointName: string, descriptor: PropertyDescriptor) => {
    const nodeName = target.constructor.name;
    const storageInstance = NodeStorage.getInstance();

    // NOTICE: works in case `@Body('#/Entity')`
    if (typeof name === 'string' && isReference(name)) {
      storageInstance.setBodyType(nodeName, endpointName, name);
      return;
    }

    let addParam: Function;
    if (location === ParameterLocation.Body) {
      addParam = storageInstance.upsertBodyParam;
    } else if (location === ParameterLocation.Query) {
      addParam = storageInstance.upsertQueryParam;
    } else if (location === ParameterLocation.UrlPath) {
      addParam = storageInstance.upsertUrlParam;
    }

    if (typeof name === 'string') {
      const param = generateParamMeta(name, type, required);
      
      addParam.call(storageInstance, nodeName, endpointName, param);
    } else {
      Object
        .entries(name)
        .forEach(([ name, type ]) => {
          const param = generateParamMeta(name, type, required);
          addParam.call(storageInstance, nodeName, endpointName, param);
        });
    }
  }
}