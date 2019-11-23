import { Post, BaseUrl, Body, Response, generateSwaggerYaml, addResponseType, Get, BodyIsArray, Delete, Patch, generateSwaggerJson, BodyIsString, Header } from '../src';

describe('declaration of array in param/query/body/response', () => {
  @BaseUrl('/dogs/')
  class Dog {
    @Post('/')
    @Body({
      name: 'string*',
      toys: 'string[]*'
    })
    @Response(201, '#/Dog')
    public createDog() {

    }

    @Delete('/')
    @BodyIsArray
    @BodyIsString
    public deleteDogs() {

    }

    @Post('/find-or-create')
    @Body('#/Dog')
    @Response(200, '#/Dog')
    @Response(201, '#/Dog')
    public findOrCreate() {

    }
  }

  @BaseUrl('/owners/')
  class Owner {
    @Post('/')
    @Header('Authorization', 'string*')
    @Body('name', 'string*')
    @Body('dogIds', 'string[]*')
    @Response(201, '#/Owner')
    public createOwner() {

    }
  }

  beforeAll(() => {
    const dog = {
      id: 'string',
      name: 'string',
      toys: 'string[]',
    }

    const owner = {
      id: 'string',
      name: 'string',
      dogs: '#/Dog[]'
    }

    addResponseType('Dog', dog);
    addResponseType('Owner', owner);

    generateSwaggerYaml()
  });

  it('responses should have array type fields', () => {
    const sw = generateSwaggerJson();

    expect(sw.definitions.Dog.properties.toys.type).toEqual('array');
    expect(sw.definitions.Dog.properties.toys.items.type).toEqual('string');

    expect(sw.definitions.Owner.properties.dogs.type).toEqual('array');
    expect(sw.definitions.Owner.properties.dogs.items.$ref).toEqual('#/definitions/Dog');
  });

  it('should have body with ref type', () => {
    const sw = generateSwaggerJson();

    const body = sw.paths['/dogs/find-or-create/']['post'].parameters.find((param) => param.in === 'body');

    expect(body.schema.$ref).toEqual('#/definitions/Dog');
  });


  it('should have array body', () => {
    const sw = generateSwaggerJson();

    const body = sw.paths['/dogs/']['delete'].parameters.find((param) => param.in === 'body');

    expect(body.schema.type).toEqual('array');
    expect(body.schema.items.type).toEqual('string');
  });
})