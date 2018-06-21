import { Parameter } from '../types';

export function generateParamMeta(name: string, type: string = 'string', required?: boolean): Parameter {
  if (type.lastIndexOf('*') === (type.length - 1)) {
    type = type.slice(0, type.length - 1);
    required = typeof required === 'boolean' ? required : true;
  }

  return {
    name,
    type,
    required: required = typeof required === 'boolean' ? required : false,
  } as Parameter;
}