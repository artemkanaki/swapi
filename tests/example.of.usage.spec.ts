import {
  BaseUrl,
  Get,
  Param,
  Post,
  Patch,
  Delete,
  Query,
  Body,
  Put,
  Response,
  addResponseType
} from '../src/decorators';
import { NodeStorage } from '../src/storage';
import { Node, Response as ResponseType, Parameter } from '../src/types';
import { generateSwaggerJson, generateSwaggerYaml } from '../src/sw.generator';
import { sortBy } from 'lodash';

describe('AIO test', () => {
  const ownerBaseUrl = 'owner';
  const dogBaseUrl = 'dog';

  //#region Valid example of usage
  @BaseUrl(ownerBaseUrl)
  class Owner {
    @Get('/')
    public getOwners() {
      // ...
    }

    @Get('/:id')
    @Param('id', 'number*')
    public getOwnerById() {
      // ...
    }
  }

  @BaseUrl(dogBaseUrl, Owner)
  class Dog {
    @Get('/')
    @Query('token', 'string')
    @Response(200, '#/Dog', true)
    public getDogs() {
      // ...
    }

    @Get('/:id/')
    @Param('id', 'number')
    @Query('token', 'string')
    @Response(200, '#/Dog')
    public getDogById() {
      // ...
    }

    @Post('/:id/')
    @Query('token', 'string')
    @Param('id', 'number')
    @Body({ name: 'string', owner: 'string' })
    @Response(201, '#/Dog')
    public createDog() {
      // ...
    }

    @Put(':id')
    @Query('token', 'string')
    @Param('id', 'number')
    @Body({ name: 'string', owner: 'string' })
    @Response(204, '#/Dog')
    @Response(403, 'string', false, 'FORBIDDEN')
    public updateDog() {
      // ...
    }

    @Patch('/:id/owner')
    @Query('token', 'string')
    @Param('id', 'number')
    @Body('owner', 'string')
    @Response(204)
    @Response(403, 'string', false, 'FORBIDDEN')
    public updateDogOwner() {
      // ...
    }

    @Delete('/:id/')
    @Query('token', 'string')
    @Param('id', 'number')
    @Response(204)
    @Response(403, 'string', false, 'FORBIDDEN')
    public deleteDog() {
      // ...
    }
  }
  //#endregion

  function checkParams(params: Array<Parameter>) {
    params.forEach(({ type, name }) => {
        expect(typeof type).toEqual('string');
        expect(typeof name).toEqual('string');
      });
  }

  function checkResponse(res: ResponseType) {
    expect(typeof res.description).toEqual('string');
    expect(typeof res.responseType).toEqual('string');
    expect(typeof res.status).toEqual('number');
  }

  beforeAll(() => {
    const dogScheme = {
      name: 'string',
      owner: 'string',
      id: 'number'
    }

    // NOTICE: adds new response type in imperative style
    addResponseType('Dog', dogScheme);
  });

  it('Owner\'s node should be ok', () => {
    const storage = NodeStorage.getInstance();

    const ownerNode = storage.findNodeByName(Owner.name);
    expect(ownerNode).not.toBeNull();
    expect(ownerNode.name).toEqual(Owner.name);
    expect(ownerNode.path).toEqual(ownerBaseUrl);
    expect(ownerNode.relatedTo).toBeNull();
    expect(ownerNode.endpoints.length).toEqual(2);
    ownerNode.endpoints.forEach((endpoint) => {
      expect(typeof endpoint.description).toEqual('string');
      expect(typeof endpoint.method).toEqual('string');
      expect(typeof endpoint.name).toEqual('string');
      expect(typeof endpoint.path).toEqual('string');

      checkParams(endpoint.body);
      checkParams(endpoint.query);
      checkParams(endpoint.urlParams);

      endpoint.responses.forEach((res) => checkResponse(res));
    });
  });

  it('Dog\'s node should be ok', () => {
    const storage = NodeStorage.getInstance();

    const dogNode = storage.findNodeByName(Dog.name);
    expect(dogNode).not.toBeNull();
    expect(dogNode.name).toEqual(Dog.name);
    expect(dogNode.path).toEqual(dogBaseUrl);
    expect(dogNode.relatedTo).toEqual(Owner.name);
    expect(dogNode.endpoints.length).toEqual(6);
    dogNode.endpoints.forEach((endpoint) => {
      expect(typeof endpoint.description).toEqual('string');
      expect(typeof endpoint.method).toEqual('string');
      expect(typeof endpoint.name).toEqual('string');
      expect(typeof endpoint.path).toEqual('string');

      checkParams(endpoint.body);
      checkParams(endpoint.query);
      checkParams(endpoint.urlParams);

      endpoint.responses.forEach((res) => checkResponse(res));
    });
  });

  it('`updateDogEndpoint` endpoint should be ok', () => {
    const storage = NodeStorage.getInstance();

    const updateDogEndpoint = storage.findEndpointByName(Dog.name, new Dog().updateDog.name);
    expect(updateDogEndpoint.description).toEqual('');
    expect(updateDogEndpoint.method).toEqual('put');
    expect(updateDogEndpoint.name).toEqual(new Dog().updateDog.name);
    expect(updateDogEndpoint.path).toEqual(':id');

    expect(updateDogEndpoint.body).toEqual([
      {
        name: 'name',
        required: false,
        type: 'string'
      },
      {
        name: 'owner',
        required: false,
        type: 'string'
      }
    ]);
    expect(updateDogEndpoint.query).toEqual([
      {
        name: 'token',
        required: false,
        type: 'string'
      }
    ]);
    expect(updateDogEndpoint.urlParams).toEqual([
      {
        name: 'id',
        required: true,
        type: 'number'
      }
    ]);

    const [ forbiddenResponse, okResponse ] = updateDogEndpoint.responses;

    expect(okResponse.status).toEqual(204);
    expect(okResponse.description).toEqual('OK');
    expect(okResponse.responseType).toEqual('#/Dog');

    expect(forbiddenResponse.status).toEqual(403);
    expect(forbiddenResponse.description).toEqual('FORBIDDEN');
    expect(forbiddenResponse.responseType).toEqual('string');
  })

  it('response type `Dog` should be ok', () => {
    const storage = NodeStorage.getInstance();

    const dogType = storage.findResponseType('Dog');
    expect(dogType.name).toEqual('Dog');
    expect(sortBy(dogType.scheme, ['name'])).toEqual(sortBy([
      {
        name: 'name',
        required: false,
        type: 'string'
      },
      {
        name: 'id',
        required: false,
        type: 'number'
      },
      {
        name: 'owner',
        required: false,
        type: 'string'
      }
    ], ['name']));
  });

  it('should create sw json', () => {
    const swJson = generateSwaggerJson();

    // FIXME: whole structure should be checked
    expect(swJson).toBeTruthy();
  });

  it('should create sw yaml', () => {
    const swYaml = generateSwaggerYaml();

    expect(typeof swYaml).toEqual('string');
  });
});
