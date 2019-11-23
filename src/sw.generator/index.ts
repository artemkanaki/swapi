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
  Response,
  ResponseType,
  Node,
  Parameter
} from '../types';
import { resolve } from 'path';
import { concat, camelCase } from 'lodash';
import { stringify } from 'json2yaml';
import { pullOutParamsFromUrl, urlResolve, isReference } from '../helpers';

export function generateSwaggerJson() {
  const storageInstance = NodeStorage.getInstance();

  const packageJson = getPackageJson();
  const swaggerJson = generateSwaggerJsonBody(packageJson);

  storageInstance.nodes
    .filter((node) => !node.isAbstract)
    .forEach((node) => {
      const fullPath = storageInstance.getNodeFullPath(node.name);

      node.endpoints.forEach((endpoint) => {
        const fullEndpointPath = urlResolve(fullPath, endpoint.path);
        const path = convertToSwaggerUrl(fullEndpointPath);
        storageInstance.setUrlParamFromFullPath(node.name, endpoint.name)

        const method = generateSwaggerJsonMethod(node, endpoint);

        if (swaggerJson.paths.hasOwnProperty(path)) {
          swaggerJson.paths[path][endpoint.method] = method;
        } else {
          swaggerJson.paths[path] = {
            [endpoint.method]: method
          };
        }
      });
  });

  storageInstance.types.forEach((type) => {
    const definitions = generateSwaggerJsonDefinitionType(type);

    swaggerJson.definitions[type.name] = definitions;
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

function generateSwaggerJsonBody(packageJson: PackageJsonScheme): SwaggerJson {
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
    paths: {},
    definitions: {}
  } as SwaggerJson
}

function generateSwaggerJsonMethod(node: Node, endpoint: Endpoint): SwaggerJsonMethod {
  const packageJson = getPackageJson();

  const method = {
    description: endpoint.description,
    operationId: camelCase(`${node.name} ${endpoint.name}`),
    // TODO: it should be taken from method data
    produces: packageJson.swapi.produces,
    responses: endpoint.responses.length ? {} : getDefaultResponseWithStatus(endpoint.method)
  } as SwaggerJsonMethod;
  
  const parameters = prepareSwaggerMethodParams(endpoint, endpoint.name);
  if (parameters.length) {
    method.parameters = parameters;
  }

  endpoint.responses.forEach((res) => {
    method.responses[res.status] = prepareSwaggerMethodResponse(res);
  });

  return method;
}

function prepareSwaggerMethodParams(endpoint: Endpoint, operationId: string): Array<SwaggerJsonMethodParameter> {
  const urlParams = endpoint.urlParams.map((param) => prepareInUrlParam(param, ParameterLocation.UrlPath));

  const queryParams = endpoint.query.map((param) => prepareInUrlParam(param, ParameterLocation.Query));

  const headerParams = endpoint.header.map((param) => prepareInUrlParam(param, ParameterLocation.Header));

  const parameters: Array<SwaggerJsonMethodParameter> = concat(queryParams, urlParams, headerParams);

  if (endpoint.body.length > 0 || !!endpoint.bodyType) {
    const bodyParams: any = prepareSwaggerMethodBodyParameter(endpoint, operationId);

    return concat(parameters, bodyParams);
  }

  return parameters;
}

function prepareInUrlParam(param: Parameter, location: ParameterLocation) {
  const preparedParam: any = {
    name: param.name,
    in: location,
    description: param.description,
    required: param.required,
  };

  if (param.isArray) {
    preparedParam.type = Types.Array;

    if (isReference(param.type)) {
      preparedParam.items = {
        $ref: param.type
      };
    } else {
      preparedParam.items = {
        type: param.type
      };
    }
  } else {
    preparedParam.type = param.type;
  }

  return preparedParam;
}

// NOTICE: available types: string, number, object, reference, string[], number[], object[], reference[]
function prepareSwaggerMethodBodyParameter(endpoint: Endpoint, operationId: string) {
  const bodyParam: any = {
    name: `${ operationId }Body`,
    in: ParameterLocation.Body,
    schema: {}
  };

  // NOTICE: prepares simple types (number/string)
  if (endpoint.bodyType === Types.Number || endpoint.bodyType === Types.String) {
    if (endpoint.bodyIsArray) {
      bodyParam.schema.type = Types.Array;
      bodyParam.schema.items = { type: endpoint.bodyType };
    } else {
      bodyParam.schema.type = endpoint.bodyType;
    }
    return bodyParam;
  }

  // NOTICE: prepares ref
  if (isReference(endpoint.bodyType)) {
    const ref = createSwaggerReference(endpoint.bodyType);
    if (endpoint.bodyIsArray) {
      bodyParam.schema.type = Types.Array;
      bodyParam.schema.items = { $ref: ref };
    } else {
      bodyParam.schema.$ref = ref;
    }

    return bodyParam;
  }

  const properties: any = {}

  const required = endpoint.body
    .filter((param) => param.required)
    .map((param) => param.name);

  if (required.length) {
    bodyParam.schema.required = required;
  }

  endpoint.body.forEach((param) => {
    const schema: any = {};

    if (param.isArray) {
      schema.type = Types.Array;
      if (isReference(param.type)) {
        const ref = createSwaggerReference(param.type);
        schema.items = { $ref: ref };
      } else {
        schema.items = { type: param.type };
      }
    } else {
      if (isReference(param.type)) {
        schema.$ref = createSwaggerReference(param.type);
      } else {
        schema.type = param.type;
      }
    }

    properties[param.name] = schema;
  });

  if (endpoint.bodyIsArray) {
    bodyParam.schema.type = Types.Array;
    bodyParam.schema.items = {
      type: Types.Object,
      properties
    }
  } else {
    bodyParam.schema.type = Types.Object;
    bodyParam.schema.properties = properties;
  }

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

function generateSwaggerJsonDefinitionType(res: ResponseType): SwaggerJsonSchema {
  const definition: SwaggerJsonSchema = {
    type: res.type
  };

  const properties = res.scheme.reduce((props: any, prop) => {
    if (prop.isArray) {
      props[prop.name] = { type: Types.Array };

      if (isReference(prop.type)) {
        props[prop.name].items = {
          $ref: createSwaggerReference(prop.type)
        };
      } else {
        props[prop.name].items = {
          type: prop.type
        };
      }
    } else {
      if (isReference(prop.type)) {
        props[prop.name] = {
          $ref: createSwaggerReference(prop.type)
        };
      } else {
        props[prop.name] = {
          type: prop.type
        };
      }
    }

    return props;
  }, {});

  if (res.type === Types.Array) {
    definition.items = { properties };
  } else {
    definition.properties = properties;
  }

  return definition;
}

//#endregion

//#region Helpers

function convertToSwaggerUrl(url: string) {
  return url.replace(/:[a-zA-Z]*/g, '$${$&}').replace(/:/g, '');
}

function createSwaggerReference(type: string) {
  return type.replace('#/', '#/definitions/');
}

function swaggerJsonToYaml(swJson: SwaggerJson) {
  return stringify(swJson);
}

//#endregion
