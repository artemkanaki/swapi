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
  urlParams: Parameters;
  body: Parameters;
  query: Parameters;
  responses: Array<Response>;
}

export interface Parameters {
  [ key: string ]: Parameter
}

export interface Parameter {
  name: string;
  type: string;
  required?: boolean;
}

export interface Response {
  status: number;
  description: string;
  responseType: string;
}

export interface ResponseType {
  name: string;
  scheme: Parameters;
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
export interface SwaggerFile {
  swagger: string;
  info?: SwaggerFileInfo;
  host: string;
  basePath: string;
  schemes: Array<string>;
  consumes: Array<string>;
  produces: Array<string>;
  paths: {
      [ path: string ]: {
          [ method: string ]: SwaggerFileMethod
      }
  };
}

export interface SwaggerFileInfo {
  version?: string;
  title?: string;
  description?: string;
  termsOfService?: string;
  contact: SwaggerFileContact;
  license: SwaggerFileLicense;
}

export interface SwaggerFileContact {
  name: string;
}

export interface SwaggerFileLicense {
  name: string;
}

export interface SwaggerFileMethod {
  description?: string;
  operationId?: string;
  produces?: Array<string>;
  parameters: Array<SwaggerFileMethodParameter>;
  responses: { [ status: string ]: SwaggerFileMethodResponse };
}

export interface SwaggerFileMethodParameter {
  name: string;
  in: ParameterLocation;
  description?: string;
  required?: boolean;
  type: string;
  items?: SwaggerFileSchemaArrayItem;
  collectionFormat?: string;
  schema: SwaggerFileSchema;
}

export interface SwaggerFileMethodResponse {
  description?: string;
  schema: SwaggerFileSchema;
}

export interface SwaggerFileSchema {
  type: string;
  properties?: any;
  items?: SwaggerFileSchemaArrayItem;
}

export interface SwaggerFileSchemaArrayItem {
  type?: string;
  $ref?: string;
}
//#endregion

