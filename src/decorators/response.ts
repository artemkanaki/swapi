import { NodeStorage } from '../storage';
import { Response, Hashtable, Types } from '../types';

/**
 * Adds response to endpoint
 * @param status - HTTP status
 * @param responseType - may be a basic type (such as `string`, `number` etc), or complex. complex type should be written as '#/ComplexTypeName'
 * @param description - Response description
 */
export function Response(status: number, responseType: string = 'string', isArray: boolean = false, description: string = 'OK') {
  return (target: any, methodName: string) => {
    const nodeName = target.constructor.name;
    const storage = NodeStorage.getInstance();

    const response = {
      status,
      responseType,
      isArray,
      description
    } as Response;
    storage.upsertResponse(nodeName, methodName, response.status, response);
  }
}

export function addResponseType(name: string, scheme: Hashtable<string>, isArray: boolean = false) {
  const type = isArray ? Types.Array : Types.Object;

  const storage = NodeStorage.getInstance();
  storage.createResponseType(name, scheme, type);

  return;
}