import { generateParamMeta } from '../helpers';
import { NodeStorage } from '../storage';

enum ParamLocation {
  Body = 'body',
  UrlPath = 'urlPath',
  Query = 'query'
}

export function Param(name: string, type: string, required: boolean = false) {
  return VariativeDataDecorator(name, ParamLocation.UrlPath, type, required);
}

export function Query(name: string, type: string, required: boolean = false) {
  return VariativeDataDecorator(name, ParamLocation.Query, type, required);
}

export function Body(name: string | Object, type?: string, required: boolean = false) {
  return VariativeDataDecorator(name, ParamLocation.Body, type, required);
}

function VariativeDataDecorator(
  name: string | Object,
  location: ParamLocation,
  type?: string,
  required: boolean = false
) {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    const nodeName = target.constructor.name;
    const storageInstance = NodeStorage.getInstance();

    let addParam: Function;
    if (location === ParamLocation.Body) {
      addParam = storageInstance.addBodyParam;
    } else if (location === ParamLocation.Query) {
      addParam = storageInstance.addQueryParam;
    } else if (location === ParamLocation.UrlPath) {
      addParam = storageInstance.addUrlParam;
    }

    if (typeof name === 'string') {
      const param = generateParamMeta(name, type, required);
      
      addParam.call(storageInstance, nodeName, propertyName, param);
    } else {
      Object
        .entries(name)
        .forEach(([ name, type ]) => {
          const param = generateParamMeta(name, type);
          addParam.call(storageInstance, nodeName, propertyName, param);
        });
    }
  }
}