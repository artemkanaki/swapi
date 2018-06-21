import { set } from 'lodash';
import { Parameter, Parameters } from '../types';

export function pullOutParamsFromUrl(path: string): Parameters {
  return path
    .split('/')
    .filter((part) => part.indexOf(':') === 0)
    .map((param) => param.slice(1))
    .reduce((params, param) => set(params, param, generateParamMeta(param)), {} as Parameters)
}

export function generateParamMeta(name: string, type: string = 'string', required?: boolean): Parameter {
  if (type.lastIndexOf('*') === (type.length - 1)) {
    type = type.slice(0, type.length - 1);
    required = typeof required === 'boolean' ? required : true;
  }

  return {
    name,
    type,
    required,
  } as Parameter;
}