import {
  Node,
  Endpoint,
  HttpMethods,
  Parameter,
  Response,
  Hashtable,
  ResponseType,
  BodyType,
  ParameterLocation,
  Types,
  // PackageJsonScheme, SwaggerFile, SwapiSettings, SwaggerFileMethod
} from '../types';
import { concat } from 'lodash';
import { generateParamMeta, urlResolve, pullOutParamsFromUrl } from '../helpers';

export class NodeStorage {
  private static instance: NodeStorage;

  private _nodes: Array<Node> = [];
  private _types: Array<ResponseType> = [];

  public get nodes() {
    return this._nodes;
  }

  public get types() {
    return this._types;
  }

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

    this._nodes.push(node);
  }

  public createNode(
    name: string,
    path: string,
    relatedTo: string = null,
    endpoints: Array<Endpoint> = [],
    combiner: string = null
  ): Node {
    const node = {
      name,
      path,
      relatedTo,
      endpoints,
      combiner
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
    storedNode.combiner = node.combiner ? node.combiner : storedNode.combiner;
    storedNode.isAbstract = node.isAbstract ? node.isAbstract : storedNode.isAbstract;
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
      body: [],
      urlParams: [],
      query: [],
      responses: [],
      bodyType: null
    };

    this.addEndpoint(nodeName, endpoint);

    return endpoint;
  }

  public upsertEndpoint(nodeName: string, endpointName: string, endpoint: Endpoint) {
    const storedEndpoint = this.findOrCreateEndpointByName(nodeName, endpointName);

    storedEndpoint.description = endpoint.description || storedEndpoint.description;
    storedEndpoint.method = endpoint.method || storedEndpoint.method;
    storedEndpoint.name = endpoint.name || storedEndpoint.name;
    storedEndpoint.path = endpoint.path || storedEndpoint.path;

    if (endpoint.hasOwnProperty('urlParams')) {
      Object.entries(endpoint.urlParams).forEach(([, param ]) => {
        const storedParam =
          this.findParameterByLocationAndName(nodeName, endpoint.name, ParameterLocation.UrlPath, param.name);
        if (storedParam && storedParam.type !== 'string' && param.type === 'string') {
          return;
        }

        this.upsertUrlParam(nodeName, endpointName, param);
      });
    }
    if (endpoint.hasOwnProperty('query')) {
      Object.entries(endpoint.query).forEach(([, param ]) => {
        const storedParam =
          this.findParameterByLocationAndName(nodeName, endpoint.name, ParameterLocation.Query, param.name);
        if (storedParam && storedParam.type !== 'string' && param.type === 'string') {
          return;
        }

        this.upsertQueryParam(nodeName, endpointName, param);
      });
    }
    if (endpoint.hasOwnProperty('body')) {
      Object.entries(endpoint.body).forEach(([, param ]) => {
        const storedParam =
          this.findParameterByLocationAndName(nodeName, endpoint.name, ParameterLocation.Body, param.name);
        if (storedParam && storedParam.type !== 'string' && param.type === 'string') {
          return;
        }

        this.upsertBodyParam(nodeName, endpointName, param);
      });
    }
    if (endpoint.hasOwnProperty('response')) {
      endpoint.responses.forEach((response) => {
        this.upsertResponse(nodeName, endpoint.name, response.status, response);
      });
    }
  }

  public complementEndpoint(nodeName: string, endpointName: string, endpoint: Endpoint) {
    const storedEndpoint = this.findOrCreateEndpointByName(nodeName, endpointName);

    storedEndpoint.description = storedEndpoint.description || endpoint.description;
    storedEndpoint.method = storedEndpoint.method || endpoint.method;
    storedEndpoint.name = storedEndpoint.name || endpoint.name;
    storedEndpoint.path = storedEndpoint.path || endpoint.path;

    if (endpoint.hasOwnProperty('urlParams')) {
      Object.entries(endpoint.urlParams).forEach(([, param ]) => {
        const storedParam =
          this.findParameterByLocationAndName(nodeName, storedEndpoint.name, ParameterLocation.UrlPath, param.name);

        if (storedParam) {
          this.addUrlParam(nodeName, storedEndpoint.name, param);
        }
      });
    }

    if (endpoint.hasOwnProperty('query')) {
      Object.entries(endpoint.query).forEach(([, param ]) => {
        const storedParam =
          this.findParameterByLocationAndName(nodeName, storedEndpoint.name, ParameterLocation.Query, param.name);

        if (storedParam) {
          this.addQueryParam(nodeName, storedEndpoint.name, param);
        }
      });
    }

    if (endpoint.hasOwnProperty('body')) {
      Object.entries(endpoint.body).forEach(([, param ]) => {
        const storedParam =
          this.findParameterByLocationAndName(nodeName, storedEndpoint.name, ParameterLocation.Body, param.name);

        if (!storedParam) {
          this.addBodyParam(nodeName, storedEndpoint.name, param);
        }
      });
    }

    if (endpoint.hasOwnProperty('response')) {
      endpoint.responses.forEach((response) => {
        const storedResponse = this.findResponseByStatus(nodeName, storedEndpoint.name, response.status);

        if (storedResponse) {
          this.upsertResponse(nodeName, endpoint.name, response.status, response);
        }
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

    if (location === ParameterLocation.UrlPath) {
      endpoint.urlParams.push(param);
    } else if (location === ParameterLocation.Query) {
      endpoint.query.push(param);
    } else if (location === ParameterLocation.Body) {
      endpoint.body.push(param);
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

  public upsertEndpointParam(
    nodeName: string,
    endpointName: string,
    param: Parameter,
    location: ParameterLocation,
  ) {
    const storedParam = this.findOrCreateParameterByLocationAndName(nodeName, endpointName, location, param.name);

    storedParam.name = param.name ? param.name : storedParam.name;
    storedParam.type = param.type ? param.type : storedParam.type;
    storedParam.required = typeof param.required === 'boolean' ? param.required : storedParam.required;
  }

  public addQueryParam(nodeName: string, endpointName: string, param: Parameter): void {
    param.required = typeof param.required === 'boolean' ? param.required : false;

    this.addEndpointParam(nodeName, endpointName, param, ParameterLocation.Query);
  }

  public createQueryParam(
    nodeName: string,
    endpointName: string,
    name: string,
    type: string,
    required: boolean = false
  ) {
    this.createEndpointParam(nodeName, endpointName, name, type, required, ParameterLocation.Query);
  }

  public upsertQueryParam(nodeName: string, endpointName: string, param: Parameter) {
    param.required = typeof param.required === 'boolean' ? param.required : false;

    this.upsertEndpointParam(nodeName, endpointName, param, ParameterLocation.Query);
  }

  public addUrlParam(nodeName: string, endpointName: string, param: Parameter): void {
    param.required = true;

    this.addEndpointParam(nodeName, endpointName, param, ParameterLocation.UrlPath);
  }

  public createUrlParam(nodeName: string, endpointName: string, name: string, type: string) {
    const required = true;

    this.createEndpointParam(nodeName, endpointName, name, type, required, ParameterLocation.UrlPath);
  }

  public upsertUrlParam(nodeName: string, endpointName: string, param: Parameter) {
    param.required = true;

    this.upsertEndpointParam(nodeName, endpointName, param, ParameterLocation.UrlPath);
  }

  public setUrlParamFromFullPath(nodeName: string, endpointName: string) {
    const nodeFullPath = this.getNodeFullPath(nodeName);
    const endpoint = this.findOrCreateEndpointByName(nodeName, endpointName);

    const fullEndpointPath = urlResolve(nodeFullPath, endpoint.path);
    const urlParams = pullOutParamsFromUrl(fullEndpointPath);

    this.upsertEndpoint(nodeName, endpointName, { name: endpointName, urlParams } as Endpoint);

    return;
  }

  public addBodyParam(nodeName: string, endpointName: string, param: Parameter): void {
    param.required = typeof param.required === 'boolean' ? param.required : false;

    this.addEndpointParam(nodeName, endpointName, param, ParameterLocation.Body);

    this.setBodyTypeIfEmpty(nodeName, endpointName, BodyType.Object);
  }

  public createBodyParam(
    nodeName: string,
    endpointName: string,
    name: string,
    type: string,
    required: boolean = false
  ) {
    this.createEndpointParam(nodeName, endpointName, name, type, required, ParameterLocation.Body);

    this.setBodyTypeIfEmpty(nodeName, endpointName, BodyType.Object);
  }

  public upsertBodyParam(nodeName: string, endpointName: string, param: Parameter) {
    param.required = typeof param.required === 'boolean' ? param.required : false;

    this.upsertEndpointParam(nodeName, endpointName, param, ParameterLocation.Body);

    this.setBodyTypeIfEmpty(nodeName, endpointName, BodyType.Object);
  }

  public setBodyType(nodeName: string, endpointName: string, type: BodyType) {
    const endpoint = this.findOrCreateEndpointByName(nodeName, endpointName);

    endpoint.bodyType = type;
  }

  public setBodyTypeIfEmpty(nodeName: string, endpointName: string, type: BodyType) {
    const endpoint = this.findOrCreateEndpointByName(nodeName, endpointName);

    if (!endpoint.bodyType) {
      this.setBodyType(nodeName, endpointName, type);
    }
  }

  public addResponse(nodeName: string, endpointName: string, response: Response) {
    const endpoint = this.findOrCreateEndpointByName(nodeName, endpointName);

    endpoint.responses.push(response);
  }

  public createResponse(
    nodeName: string,
    endpointName: string,
    status: number,
    responseType: Types = Types.String,
    isArray: boolean = false,
    description: string = 'OK'
  ) {
    const response: Response = {
      status,
      responseType,
      isArray,
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
    storedResponse.isArray = response.isArray ? response.isArray : storedResponse.isArray;

    return;
  }

  public addResponseType(type: ResponseType) {
    this._types.push(type);
  }

  public createResponseType(name: string, typeScheme: Hashtable<string>, type: Types) {
    const scheme: Array<Parameter> = Object
      .entries(typeScheme)
      .reduce((params, [ field, type ]) => concat(params, generateParamMeta(field, type)), []);

    const responseType = {
      name,
      scheme,
      type
    } as ResponseType;

    this.addResponseType(responseType);

    return responseType;
  }

  public findNodeByName(name: string): Node {
    return this._nodes.find((node) => node.name === name) || null;
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

    return endpoint.responses.find((response) => response.status === status) || null;
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
    return this._types.find((type) => type.name === name) || null;
  }

  public findParameterByLocationAndName(
    nodeName: string,
    endpointName: string,
    location: ParameterLocation,
    name: string
  ): Parameter {
    const endpoint = this.findEndpointByName(nodeName, endpointName);

    if (!endpoint) {
      return null;
    }

    let param;
    if (location === ParameterLocation.Body) {
      param = endpoint.body.find((param) => param.name === name);
    } else if (location === ParameterLocation.Query) {
      param = endpoint.query.find((param) => param.name === name);
    } else if (location === ParameterLocation.UrlPath) {
      param = endpoint.urlParams.find((param) => param.name === name);
    }

    return param || null;
  }

  public findOrCreateParameterByLocationAndName(
    nodeName: string,
    endpointName: string,
    location: ParameterLocation,
    name: string
  ): Parameter {
    let param = this.findParameterByLocationAndName(nodeName, endpointName, location, name);

    if (param) {
      return param;
    }

    const endpoint = this.findOrCreateEndpointByName(nodeName, endpointName);

    param = generateParamMeta(name);

    if (location === ParameterLocation.Body) {
      endpoint.body.push(param);
    } else if (location === ParameterLocation.Query) {
      endpoint.query.push(param)
    } else if (location === ParameterLocation.UrlPath) {
      endpoint.urlParams.push(param)
    }

    return param;
  }

  public getNodeFullPath(nodeName: string): string {
    const node = this.findNodeByName(nodeName);
    if (node.relatedTo) {
      const partOfPath = [ this.getNodeFullPath(node.relatedTo), node.combiner, node.path ]
        .filter((part) => part !== null);

      return urlResolve(...partOfPath);
    }

    return `/${node.path}`;
  }
}
