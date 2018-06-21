import { Node, Endpoint, HttpMethods, Parameter, Response, Parameters, Hashtable, ResponseType, PackageJsonScheme, SwaggerFile, SwapiSettings, SwaggerFileMethod } from '../types';
import { pick, get, set } from 'lodash';
import { generateParamMeta } from '../helpers';
import { dirname, resolve } from 'path';

enum ParameterLocation {
  Query = 'query',
  UrlParam = 'urlParam',
  Body = 'body',
}

export class NodeStorage {
  private static instance: NodeStorage;

  private nodes: Array<Node> = [];
  private types: Array<ResponseType> = [];

  public static getInstance(): NodeStorage {
    NodeStorage.instance = NodeStorage.instance || new NodeStorage();

    return NodeStorage.instance;
  }

  private constructor() {}

  public addNode(node: Node): void {
    if (node.relatedTo) {
      const relatedNode = this.findNodeByName(node.relatedTo);

      if(!relatedNode) {
        this.createNode(node.relatedTo, null);
      }
    }

    this.nodes.push(node);
  }

  public createNode(name: string, path: string, relatedTo: string = null, endpoints: Array<Endpoint> = []): Node {
    const node = {
      name,
      path,
      relatedTo,
      endpoints
    } as Node;

    this.addNode(node);

    return node;
  }

  public upsertNode(node: Node): void {
    const storedNode = this.findOrCreateNodeByName(node.name);

    if (node.endpoints) {
      node.endpoints.forEach((endpoint) => {
        this.upsertEndpoint(node.name, endpoint.name, endpoint);
      });
    }
    storedNode.name = node.name ? node.name : storedNode.name;
    storedNode.path = node.path ? node.path : storedNode.path;
    storedNode.relatedTo = node.relatedTo ? node.relatedTo : storedNode.relatedTo;
  }

  public addEndpoint(nodeName: string, endpoint: Endpoint): void {
    const node = this.findOrCreateNodeByName(nodeName);

    node.endpoints.push(endpoint);
  }

  public createEndpoint(
    nodeName: string,
    name: string,
    path: string,
    method: HttpMethods,
    description: string = ''
  ): Endpoint {
    const endpoint: Endpoint = {
      name,
      path,
      method,
      description,
      body: {},
      urlParams: {},
      query: {},
      responses: []
    };

    this.addEndpoint(nodeName, endpoint);

    return endpoint;
  }

  public upsertEndpoint(nodeName: string, endpointName: string, endpoint: Endpoint) {
    const storedEndpoint = this.findOrCreateEndpointByName(nodeName, endpointName);

    storedEndpoint.description = endpoint.description ? endpoint.description : storedEndpoint.description;
    storedEndpoint.method = endpoint.method ? endpoint.method : storedEndpoint.method;
    storedEndpoint.name = endpoint.name ? endpoint.name : storedEndpoint.name;
    storedEndpoint.path = endpoint.path ? endpoint.path : storedEndpoint.path;

    if (endpoint.hasOwnProperty('urlParams')) {
      Object.entries(endpoint.urlParams).forEach(([, param ]) => {
        const storedType = get(storedEndpoint, `urlParams.${ param.name }.type`, null);
        if (storedType && storedType !== 'string' && param.type === 'string') {
          return;
        }

        this.createUrlParam(nodeName, endpointName, param.name, param.type, param.required);
      });
    }
    if (endpoint.hasOwnProperty('query')) {
      Object.entries(endpoint.query).forEach(([, param ]) => {
        const storedType = get(storedEndpoint, `query.${ param.name }.type`, null);
        if (storedType && storedType !== 'string' && param.type === 'string') {
          return;
        }

        this.createQueryParam(nodeName, endpointName, param.name, param.type, param.required);
      });
    }
    if (endpoint.hasOwnProperty('body')) {
      Object.entries(endpoint.body).forEach(([, param ]) => {
        const storedType = get(storedEndpoint, `body.${ param.name }.type`, null);
        if (storedType && storedType !== 'string' && param.type === 'string') {
          return;
        }

        this.createBodyParam(nodeName, endpointName, param.name, param.type, param.required);
      });
    }
    if (endpoint.hasOwnProperty('response')) {
      endpoint.responses.forEach((response) => {
        this.upsertResponse(nodeName, endpoint.name, response.status, response);
      });
    }
  }

  public addEndpointParam(
    nodeName: string,
    endpointName: string,
    param: Parameter,
    location: ParameterLocation
  ): void {
    const endpoint = this.findOrCreateEndpointByName(nodeName, endpointName);

    if (location === ParameterLocation.UrlParam) {
      endpoint.urlParams[ param.name ] = param;
    } else if (location === ParameterLocation.Query) {
      endpoint.query[ param.name ] = param;
    } else if (location === ParameterLocation.Body) {
      endpoint.body[ param.name ] = param;
    }
  }

  public createEndpointParam(
    nodeName: string,
    endpointName: string,
    name: string,
    type: string,
    required: boolean,
    location: ParameterLocation
  ) {
    const param = {
      name,
      type,
      required
    } as Parameter;

    this.addEndpointParam(nodeName, endpointName, param, location);

    return param;
  }

  public addQueryParam(nodeName: string, endpointName: string, param: Parameter): void {
    this.addEndpointParam(nodeName, endpointName, param, ParameterLocation.Query);
  }

  public createQueryParam(nodeName: string, endpointName: string, name: string, type: string, required: boolean) {
    this.createEndpointParam(nodeName, endpointName, name, type, required, ParameterLocation.Query)
  }

  public addUrlParam(nodeName: string, endpointName: string, param: Parameter): void {
    this.addEndpointParam(nodeName, endpointName, param, ParameterLocation.UrlParam);
  }

  public createUrlParam(nodeName: string, endpointName: string, name: string, type: string, required: boolean) {
    this.createEndpointParam(nodeName, endpointName, name, type, required, ParameterLocation.UrlParam)
  }

  public addBodyParam(nodeName: string, endpointName: string, param: Parameter): void {
    this.addEndpointParam(nodeName, endpointName, param, ParameterLocation.Body);
  }

  public createBodyParam(nodeName: string, endpointName: string, name: string, type: string, required: boolean) {
    this.createEndpointParam(nodeName, endpointName, name, type, required, ParameterLocation.Body)
  }

  public addResponse(nodeName: string, endpointName: string, response: Response) {
    const endpoint = this.findOrCreateEndpointByName(nodeName, endpointName);

    endpoint.responses.push(response);
  }

  public createResponse(
    nodeName: string,
    endpointName: string,
    status: number,
    responseType: string = 'string',
    description: string = 'OK'
  ) {
    const response: Response = {
      status,
      responseType,
      description
    };

    this.addResponse(nodeName, endpointName, response);

    return response;
  }

  public upsertResponse(nodeName: string, endpointName: string, status: number, response: Response) {
    const storedResponse = this.findOrCreateResponseByStatus(nodeName, endpointName, status);

    storedResponse.status = response.status ? response.status : storedResponse.status;
    storedResponse.description = response.description ? response.description : storedResponse.description;
    storedResponse.responseType = response.responseType ? response.responseType : storedResponse.responseType;

    return;
  }

  public addResponseType(type: ResponseType) {
    this.types.push(type);
  }

  public createResponseType(name: string, typeScheme: Hashtable<string>) {
    const scheme: Parameters = Object
      .entries(typeScheme)
      .reduce((scheme, [ field, type ]) => set(scheme, field, generateParamMeta(field, type)), {});

    const responseType = {
      name,
      scheme
    } as ResponseType;

    this.addResponseType(responseType);

    return responseType;
  }

  public findNodeByName(name: string): Node {
    return this.nodes.find((node) => node.name === name) || null;
  }

  public findOrCreateNodeByName(name: string): Node {
    const node = this.findNodeByName(name);

    if (node) {
      return node;
    }

    return this.createNode(name, null);
  }

  public findEndpointByName(nodeName: string, endpointName: string): Endpoint {
    const node = this.findNodeByName(nodeName);

    if (!node) {
      // TODO: log it!
      return null;
    }

    return node.endpoints.find((endpoint) => endpoint.name === endpointName) || null
  }

  public findOrCreateEndpointByName(nodeName: string, endpointName: string): Endpoint {
    const endpoint = this.findEndpointByName(nodeName, endpointName);

    if (endpoint) {
      return endpoint;
    }

    const node = this.findOrCreateNodeByName(nodeName);
    return this.createEndpoint(node.name, endpointName, null, null);
  }

  public findResponseByStatus(nodeName: string, endpointName: string, status: number): Response {
    const endpoint = this.findEndpointByName(nodeName, endpointName);

    if (!endpoint) {
      // TODO: log it!
      return null;
    }

    return endpoint.responses.find((response) => response.status === status) || null
  }

  public findOrCreateResponseByStatus(nodeName: string, endpointName: string, status: number): Response {
    const response = this.findResponseByStatus(nodeName, endpointName, status);

    if (response) {
      return response;
    }

    const node = this.findOrCreateNodeByName(nodeName);
    const endpoint = this.findOrCreateEndpointByName(nodeName, endpointName);
    return this.createResponse(node.name, endpoint.name, status);
  }

  public findResponseType(name: string): ResponseType {
    return this.types.find((type) => type.name === name) || null;
  }

  // public convertToSwaggerJson(): any {
  //   const packageJson: PackageJsonScheme = require(resolve(dirname(require.main.filename), 'package.json'));

  //   packageJson.swapi = packageJson.swapi || {} as SwapiSettings;

  //   const swaggerJson = {
  //     swagger: '2.0',
  //     info: {
  //       version: packageJson.version,
  //       title: packageJson.name,
  //       description: packageJson.description,
  //       license: {
  //         name: packageJson.license
  //       },
  //       contact: {
  //         name: packageJson.author
  //       }
  //     },
  //     host: packageJson.swapi.host,
  //     basePath: packageJson.swapi.basePath,
  //     schemes: packageJson.swapi.schemes,
  //     produces: packageJson.swapi.produces,
  //     consumes: packageJson.swapi.consumes,
  //     paths: {}
  //   } as SwaggerFile;

  //   this.nodes.forEach((node) => {
  //     const fullPath = this.getNodeFullPath(node.name);

  //     swaggerJson.paths[fullPath] = {};
  //     node.endpoints.forEach((endpoint) => {
  //       const method: SwaggerFileMethod = {
  //         description: endpoint.description,
  //         operationId: endpoint.name,
  //         // TODO: it should be taken from 
  //         produces: packageJson.swapi.produces,
  //         parameters: [],
  //         responses: {}
  //       };

  //       endpoint
  //       swaggerJson.paths[fullPath][endpoint.method] = method
  //     })

  //     const method = {

  //     } as SwaggerFileMethod
  //   });
  // }

  // private getNodeFullPath(nodeName: string): string {
  //   const node = this.findNodeByName(nodeName);
  //   if (node.relatedTo) {
  //     return `${ this.findNodeByName(nodeName) }/${ node.path }`
  //   }

  //   return node.path;
  // }
}
