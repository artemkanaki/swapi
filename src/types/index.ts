export enum HttpMethods {
  GET = 'get',
  POST = 'post',
  PUT = 'put',
  PATCH = 'patch',
  DELETE = 'delete'
}

export enum ParameterLocation {
  UrlPath = 'path',
  Body = 'body',
  Query = 'query'
}

export enum BodyType {
  Object = 'object',
  Array = 'array',
  String = 'string',
  Number = 'number'
}

export enum Types {
  Object = 'object',
  Array = 'array',
  String = 'string',
  Number = 'number'
}

export interface Node {
  endpoints: Array<Endpoint>;
  relatedTo: string;
  path: string;
  name: string;
}

export interface Endpoint {
  /** may be used as endpointId */
  name: string;
  path: string;
  method: HttpMethods,
  description?: string,
  urlParams: Array<Parameter>;
  body: Array<Parameter>;
  bodyType: BodyType;
  query: Array<Parameter>;
  responses: Array<Response>;
}

// export interface Parameters {
//   [ key: string ]: Parameter
// }

export interface Parameter {
  name: string;
  type: string;
  required?: boolean;
  // TODO: fill it
  description?: string;
}

export interface Response {
  status: number;
  description: string;
  responseType: Types;
  isArray?: boolean;
}

export interface ResponseType {
  name: string;
  type: Types;
  scheme: Array<Parameter>;
}

export interface Hashtable<T> {
  [key: string]: T;
}

export interface PackageJsonScheme {
  name: string;
  version: string;
  description: string;
  license: string;
  swapi: SwapiSettings;
  author: string;
}

export interface SwapiSettings {
  host: string;
  basePath: string;
  schemes: Array<string>;
  consumes: Array<string>;
  produces: Array<string>;
}

//#region SW types
export interface SwaggerJson {
  swagger: string;
  info?: SwaggerJsonInfo;
  host: string;
  basePath: string;
  schemes: Array<string>;
  consumes: Array<string>;
  produces: Array<string>;
  paths: {
      [ path: string ]: {
          [ method: string ]: SwaggerJsonMethod
      }
  };
  definitions: {
    [name: string]: SwaggerJsonSchema;
  }
}

export interface SwaggerJsonInfo {
  version?: string;
  title?: string;
  description?: string;
  termsOfService?: string;
  contact: SwaggerJsonContact;
  license: SwaggerJsonLicense;
}

export interface SwaggerJsonContact {
  name: string;
}

export interface SwaggerJsonLicense {
  name: string;
}

export interface SwaggerJsonMethod {
  description?: string;
  operationId?: string;
  produces?: Array<string>;
  parameters: Array<SwaggerJsonMethodParameter>;
  responses: { [ status: string ]: SwaggerJsonMethodResponse };
}

export interface SwaggerJsonMethodParameter {
  name: string;
  in: ParameterLocation;
  description?: string;
  required?: boolean;
  type: string;
  items?: SwaggerJsonSchemaArrayItem;
  collectionFormat?: string;
  schema?: SwaggerJsonSchema;
}

export interface SwaggerJsonMethodResponse {
  description?: string;
  schema: SwaggerJsonSchema;
}

export interface SwaggerJsonSchema {
  type?: Types;
  $ref?: string;
  properties?: { [ name: string ]: SwaggerJsonSchema };
  items?: SwaggerJsonSchema;
}

export interface SwaggerJsonSchemaArrayItem {
  type?: string;
  $ref?: string;
}

//#endregion

