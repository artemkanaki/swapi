import { Parameter } from '../types';

export function generateParamMeta(
  name: string,
  type: string = 'string',
  required?: boolean,
  isArray?: boolean,
): Parameter {
  if (type.lastIndexOf('*') === (type.length - 1)) {
    type = type.slice(0, type.length - 1);
    required = typeof required === 'boolean' ? required : true;
  }
  if (type.lastIndexOf('[]') === (type.length - 2)) {
    type = type.slice(0, type.length - 2);
    isArray = typeof isArray === 'boolean' ? isArray : true;
  }

  return {
    name,
    type,
    required: required = typeof required === 'boolean' ? required : false,
    isArray: isArray = typeof isArray === 'boolean' ? isArray : false,
  } as Parameter;
}