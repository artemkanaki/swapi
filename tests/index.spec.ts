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
import { Node, Parameters, Response as ResponseType } from '../src/types';

describe('base url', () => {
  const ownerBaseUrl = 'owner';
  const dogBaseUrl = 'dog';

  @BaseUrl(ownerBaseUrl)
  class Owner {
    @Get('/')
    public getOwners() {

    }

    @Get('/:id')
    @Param('id', 'number')
    public getOwnerById() {

    }
  }

  @BaseUrl(dogBaseUrl, Owner)
  class Dog {
    @Get('/')
    @Query('token', 'string')
    public getDogs() {
      return;
    }

    @Get('/:id/')
    @Param('id', 'number', true)
    @Query('token', 'string')
    public getDogById() {
      return;
    }

    @Post('/:id/')
    @Query('token', 'string')
    @Param('id', 'number')
    @Body({ name: 'string', owner: 'string' })
    public createDog() {
      return;
    }

    @Put(':id')
    @Query('token', 'string')
    @Param('id', 'number')
    @Body({ name: 'string', owner: 'string' })
    @Response(204, '#/Dog')
    @Response(403, 'string', 'FORBIDDEN')
    public updateDog() {
      return;
    }

    @Patch('/:id/owner')
    @Query('token', 'string')
    @Param('id', 'number')
    @Body('owner', 'string')
    public updateDogOwner() {
      return;
    }

    @Delete('/:id/')
    @Query('token', 'string')
    @Param('id', 'number')
    public deleteDog() {
      return;
    }
  }

  function checkParams(params: Parameters) {
    Object.entries(params)
      .forEach(([key, meta]) => {
        expect(key).toEqual(meta.name)
        expect(typeof meta.type).toEqual('string')
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

    expect(updateDogEndpoint.body).toEqual({
      name: {
        name: 'name',
        type: 'string'
      },
      owner: {
        name: 'owner',
        type: 'string'
      }
    });
    expect(updateDogEndpoint.query).toEqual({
      token: {
        name: 'token',
        type: 'string'
      }
    });
    expect(updateDogEndpoint.urlParams).toEqual({
      id: {
        name: 'id',
        type: 'number'
      }
    });

    const [ forbiddenResponse, okResponse ] = updateDogEndpoint.responses;

    expect(okResponse.status).toEqual(204);
    expect(okResponse.description).toEqual('OK');
    expect(okResponse.responseType).toEqual('#/Dog');

    expect(forbiddenResponse.status).toEqual(403);
    expect(forbiddenResponse.description).toEqual('FORBIDDEN');
    expect(forbiddenResponse.responseType).toEqual('string');
  })

  it('Dog\'s node should be ok', () => {
    const storage = NodeStorage.getInstance();

    const dogType = storage.findResponseType('#/Dog');
    expect(dogType.name).toEqual('#/Dog');
    expect(dogType.scheme).toEqual({
      name: {
        name: 'name',
        type: 'string'
      },
      id: {
        name: 'id',
        type: 'number'
      },
      owner: {
        name: 'owner',
        type: 'string'
      }
    });
  });
});