import { NodeStorage } from '../storage';
import {
  PackageJsonScheme,
  SwapiSettings,
  SwaggerJson,
  SwaggerJsonMethod,
  ParameterLocation,
  SwaggerJsonSchema,
  Types,
  HttpMethods,
  SwaggerJsonMethodResponse,
  Endpoint,
  SwaggerJsonMethodParameter,
  Response
} from '../types';
import { resolve } from 'path';
import { concat } from 'lodash';
import { stringify } from 'json2yaml';
import { normalizePath } from './normalize.path';

export function generateSwaggerJson() {
  const storageInstance = NodeStorage.getInstance();
  const nodes = storageInstance.nodes;

  const packageJson = getPackageJson();
  const swaggerJson = generateSwaggerJsonBody(packageJson);

  nodes.forEach((node) => {
    const fullPath = storageInstance.getNodeFullPath(node.name);

    node.endpoints.forEach((endpoint) => {
      const method = generateSwaggerJsonMethod(endpoint);

      const path = convertToSwaggerUrl(urlResolve(fullPath, endpoint.path));

      if (swaggerJson.paths.hasOwnProperty(path)) {
        swaggerJson.paths[path][endpoint.method] = method;
      } else {
        swaggerJson.paths[path] = {
          [endpoint.method]: method
        };
      }
    });
  });

  return swaggerJson;
}

export function generateSwaggerYaml() {
  const swJson = generateSwaggerJson();

  return swaggerJsonToYaml(swJson);
}

//#region Generate part of Swagger JSON

function getPackageJson(): PackageJsonScheme {
  const packageJson: PackageJsonScheme = require(resolve(process.cwd(), 'package.json'));
  packageJson.swapi = packageJson.swapi || {} as SwapiSettings;

  return packageJson;
}

function generateSwaggerJsonBody(packageJson: PackageJsonScheme) {
  return {
    swagger: '2.0',
    info: {
      version: packageJson.version,
      title: packageJson.name,
      description: packageJson.description,
      license: {
        name: packageJson.license
      },
      contact: {
        name: packageJson.author
      }
    },
    host: packageJson.swapi.host,
    basePath: packageJson.swapi.basePath,
    schemes: packageJson.swapi.schemes,
    produces: packageJson.swapi.produces,
    consumes: packageJson.swapi.consumes,
    paths: {}
  } as SwaggerJson
}

function generateSwaggerJsonMethod(endpoint: Endpoint): SwaggerJsonMethod {
  const packageJson = getPackageJson();

  const method = {
    description: endpoint.description,
    operationId: endpoint.name,
    // TODO: it should be taken from method data
    produces: packageJson.swapi.produces,
    responses: endpoint.responses.length ? {} : getDefaultResponseWithStatus(endpoint.method)
  } as SwaggerJsonMethod;
  
  const parameters = prepareSwaggerMethodParams(endpoint, endpoint.name);
  if (parameters.length) {
    method.parameters = prepareSwaggerMethodParams(endpoint, method.operationId);
  }

  endpoint.responses.forEach((res) => {
    method.responses[res.status] = prepareSwaggerMethodResponse(res);
  });

  return method;
}

function prepareSwaggerMethodParams(endpoint: Endpoint, operationId: string): Array<SwaggerJsonMethodParameter> {
  const urlParams = endpoint.urlParams.map((param) => ({
    name: param.name,
    in: ParameterLocation.UrlPath,
    description: param.description,
    required: param.required,
    type: param.type
  }));

  const queryParams = endpoint.query.map((param) => ({
    name: param.name,
    in: ParameterLocation.Query,
    description: param.description,
    required: param.required,
    type: param.type
  }));

  const parameters: Array<SwaggerJsonMethodParameter> = concat(queryParams, urlParams);

  if (endpoint.body.length > 0 || !!endpoint.bodyType) {
    const bodyParams: any = prepareSwaggerMethodBodyParameter(endpoint, operationId);

    return concat(parameters, bodyParams);
  }

  return parameters;
}

function prepareSwaggerMethodBodyParameter(endpoint: Endpoint, operationId: string) {
  const bodyParam: any = {
    name: `${ operationId }Body`,
    in: ParameterLocation.Body,
    schema: {
      type: endpoint.bodyType,
      properties: {}
    }
  };

  const required = endpoint.body
    .filter((param) => param.required)
    .map((param) => param.name);

  if (required.length) {
    bodyParam.schema.required = required;
  }

  endpoint.body.forEach((param) => {
    const schema: { $ref?: string, type?: string } = {};

    if (isReference(param.type)) {
      schema.$ref = createSwaggerReference(param.type);
    } else {
      schema.type = param.type;
    }
    bodyParam.schema.properties[param.name] = schema;
  });

  return bodyParam;
}

function prepareSwaggerMethodResponse(res: Response): SwaggerJsonMethodResponse {
  const schema = {} as SwaggerJsonSchema;

    if (isReference(res.responseType)) {
      const reference = createSwaggerReference(res.responseType);

      if (res.isArray) {
        schema.type = Types.Array;
        schema.items = { $ref: reference };
      } else {
        schema.$ref = reference;
      }
    } else {
      if (res.isArray) {
        schema.type = Types.Array;
        schema.items = { type: res.responseType };
      } else {
        schema.type = res.responseType;
      }
    }
    return {
      description: res.description,
      schema
    } as SwaggerJsonMethodResponse;
}

function getDefaultResponseWithStatus(method: HttpMethods): { [status: string]: SwaggerJsonMethodResponse } {
  let status;
  if (method === HttpMethods.GET) {
    status = '200';
  } else if (method === HttpMethods.POST) {
    status = '201';
  } else if (method === HttpMethods.PUT || method === HttpMethods.PATCH || HttpMethods.DELETE) {
    status = '204';
  }
  
  return {
    [status]: {
      description: 'OK',
      schema: { type: 'string' }
    } as SwaggerJsonMethodResponse
  };
}

//#endregion

//#region Helpers

function convertToSwaggerUrl(url: string) {
  return url.replace(/:[a-zA-Z]*/, '$${$&}').replace(/:/g, '');
}

function isReference(type: string) {
  return type.indexOf('#/') === 0;
}

function createSwaggerReference(type: string) {
  return type.replace('#/', '#/definitions/');
}

function swaggerJsonToYaml(swJson: SwaggerJson) {
  return stringify(swJson);
}

function urlResolve(firstUrl: string, secondUrl: string) {
  firstUrl = normalizePath(firstUrl);
  secondUrl = normalizePath(secondUrl);

  let resolved = firstUrl === '//' || firstUrl === '/'  ? firstUrl : `/${ firstUrl }/`;
  resolved += secondUrl === '//' || secondUrl === '/'  ? secondUrl : `/${ secondUrl }/`;

  return resolved.replace(/\/\//g, '/');
}

//#endregion
