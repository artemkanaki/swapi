import { Parameter } from '../types';
import { concat } from 'lodash';
import { generateParamMeta } from './generate.param.meta';

export function pullOutParamsFromUrl(path: string): Array<Parameter> {
  return path
    .split('/')
    .filter((part) => part.indexOf(':') === 0)
    .map((param) => param.slice(1))
    .reduce((params, param) => concat(params, generateParamMeta(param)), [])
}