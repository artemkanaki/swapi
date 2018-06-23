# swapi (swagger api)

## Motivation

If you sometime wrote swagger file by yourself, then you should know how painful it is, and how easy forgot to add new endpoints. Here is the tool which creates swagger files based on classes' metadata.

## Explanation

### Decorators

Whole functionality is based on TypeScript Decorators. In next articles you may find more info about each of them.

### BaseUrl

`@BaseUrl(url: string, relatedTo: { new(): A }, pathCombiner: string = null)`

Declares a path which will be used as a prefix for endpoints. You may pass it with slashes in begin and end of url, it does not matter. The second parameter is class of parent resource. This means that declared resource will be nested into other resource.\
Notice that url may be in express format. Url `owners/:id`, will be parsed, and parameter `id` will be automatically added in path params, and will have `string` type.\
`pathCombiner` may be specified if you need to add extra params, or just part of url between parent's and children's resources.;

### HTTP methods declaration

- `@Get(url: string, description?: string)` - declares new `GET` endpoint.
- `@Post(url: string, description?: string)` - declares new `POST` endpoint.
- `@Put(url: string, description?: string)` - declares new `PUT` endpoint.
- `@Patch(url: string, description?: string)` - declares new `PATCH` endpoint.
- `@Delete(url: string, description?: string)` - declares new `DELETE` endpoint.

### Request params

- `@Param(name: string, type?: string = 'string')` - declares url's parameter. For example if you want change type of `id` param in this url `owners/:id`, then you should write `@Param('id', 'number')`, or `@Param({ id: 'number', ... })` if you want declare more then one param.
- `@Query(name: string, type?: string = 'string', required: boolean = false)` - declares query's parameter. may have third param, which marks param as required. Also param may be marked as required if last symbol of type will be `*`. So `@Query('token', 'string', true)` will be equal `@Query('token', 'string*')`. It's useful when you declare more than one query param, such as `@Query({ token: 'string*', q: 'string' })`
- `@Body(name: string, type?: string = 'string', required: boolean = false)` - declares body parameter. Has all features as `@Query` decorator.

### Response declaration

`@Response(status: number, type?: string = 'string', isArray?: boolean = false, description?: string = '')`

Declares endpoint's response. May be used few times if you want declare few responses for single endpoint. `type` parameter may take simple types, such as `string` or `number`, or custom types. If you want declare custom type, then you should pass the name of custom type in format `'#/' + typeName`, where `typeName` is the name of type.

You may register custom type using `addResponseType` function. `addResponseType(name: string, scheme: any, isArray: boolean = false)`, where `name` is name of a type, `scheme` is an object which keys are names of fields, and a value is a type declaration, `isArray` - marks object as `Array`.

### AbstractRouter

`@AbstractRouter`

Marks router as abstract. It wont be declared in swagger docs, but all inherited routers will get all endpoints of the abstract router.

## Examples

### Main usage

```TS
const ownerBaseUrl = 'owners';
const dogBaseUrl = 'dogs';

//#region Valid example of usage
@BaseUrl(ownerBaseUrl)
class Owner {
  @Get('/')
  @Response(200, '#/Owner[]')
  public getOwners() {
    // ...
  }

  @Get('/:id')
  @Param('id', 'number')
  @Response(200, '#/Owner')
  public getOwnerById() {
    // ...
  }
}

@BaseUrl(dogBaseUrl, Owner, '/:ownerId/')
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
  @Response(204)
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

const dogScheme = {
  name: 'string',
  owner: 'string',
  id: 'number'
}

// NOTICE: adds new response type in imperative style
addResponseType('Dog', dogScheme);


const ownerScheme = {
  name: 'string',
  id: 'number',
  dog: '#/Dog'
}
addResponseType('Owner', ownerScheme);

// contains valid swagger in yaml format
const swaggerYamlDeclaration = generateSwaggerYaml();
```

Result:

```YAML
---
  swagger: "2.0"
  info:
    version: "0.0.1"
    title: "swapi"
    description: ""
    license:
      name: "MIT"
    contact:
      name: "A.Kanaki"
  host: "host"
  basePath: "/"
  schemes:
    - "https"
  produces:
    - "application/json"
  consumes:
    - "application/json"
  paths:
    /owners/:
      get:
        description: ""
        operationId: "ownerGetOwners"
        produces:
          - "application/json"
        responses:
          200:
            description: "OK"
            schema:
              type: "array"
              items:
                $ref: "#/definitions/Owner"
    /owners/${id}/:
      get:
        description: ""
        operationId: "ownerGetOwnerById"
        produces:
          - "application/json"
        responses:
          200:
            description: "OK"
            schema:
              $ref: "#/definitions/Owner"
        parameters:
          -
            name: "id"
            in: "path"
            required: true
            type: "number"
    /owners/${ownerId}/dogs/:
      get:
        description: ""
        operationId: "dogGetDogs"
        produces:
          - "application/json"
        responses:
          200:
            description: "OK"
            schema:
              type: "array"
              items:
                $ref: "#/definitions/Dog"
        parameters:
          -
            name: "token"
            in: "query"
            required: false
            type: "string"
          -
            name: "ownerId"
            in: "path"
            required: true
            type: "string"
    /owners/${ownerId}/dogs/${id}/:
      get:
        description: ""
        operationId: "dogGetDogById"
        produces:
          - "application/json"
        responses:
          200:
            description: "OK"
            schema:
              $ref: "#/definitions/Dog"
        parameters:
          -
            name: "token"
            in: "query"
            required: false
            type: "string"
          -
            name: "id"
            in: "path"
            required: true
            type: "number"
          -
            name: "ownerId"
            in: "path"
            required: true
            type: "string"
      post:
        description: ""
        operationId: "dogCreateDog"
        produces:
          - "application/json"
        responses:
          201:
            description: "OK"
            schema:
              $ref: "#/definitions/Dog"
        parameters:
          -
            name: "token"
            in: "query"
            required: false
            type: "string"
          -
            name: "id"
            in: "path"
            required: true
            type: "number"
          -
            name: "ownerId"
            in: "path"
            required: true
            type: "string"
          -
            name: "dogCreateDogBody"
            in: "body"
            schema:
              type: "object"
              properties:
                name:
                  type: "string"
                owner:
                  type: "string"
      put:
        description: ""
        operationId: "dogUpdateDog"
        produces:
          - "application/json"
        responses:
          204:
            description: "OK"
            schema:
              $ref: "#/definitions/Dog"
          403:
            description: "FORBIDDEN"
            schema:
              type: "string"
        parameters:
          -
            name: "token"
            in: "query"
            required: false
            type: "string"
          -
            name: "id"
            in: "path"
            required: true
            type: "number"
          -
            name: "ownerId"
            in: "path"
            required: true
            type: "string"
          -
            name: "dogUpdateDogBody"
            in: "body"
            schema:
              type: "object"
              properties:
                name:
                  type: "string"
                owner:
                  type: "string"
      delete:
        description: ""
        operationId: "dogDeleteDog"
        produces:
          - "application/json"
        responses:
          204:
            description: "OK"
            schema:
              type: "string"
          403:
            description: "FORBIDDEN"
            schema:
              type: "string"
        parameters:
          -
            name: "token"
            in: "query"
            required: false
            type: "string"
          -
            name: "id"
            in: "path"
            required: true
            type: "number"
          -
            name: "ownerId"
            in: "path"
            required: true
            type: "string"
    /owners/${ownerId}/dogs/${id}/owner/:
      patch:
        description: ""
        operationId: "dogUpdateDogOwner"
        produces:
          - "application/json"
        responses:
          204:
            description: "OK"
            schema:
              type: "string"
          403:
            description: "FORBIDDEN"
            schema:
              type: "string"
        parameters:
          -
            name: "token"
            in: "query"
            required: false
            type: "string"
          -
            name: "id"
            in: "path"
            required: true
            type: "number"
          -
            name: "ownerId"
            in: "path"
            required: true
            type: "string"
          -
            name: "dogUpdateDogOwnerBody"
            in: "body"
            schema:
              type: "object"
              properties:
                owner:
                  type: "string"
  definitions:
    Dog:
      type: "object"
      properties:
        name:
          type: "string"
        owner:
          type: "string"
        id:
          type: "number"
    Owner:
      type: "object"
      properties:
        name:
          type: "string"
        id:
          type: "number"
        dog:
          $ref: "#/definitions/Dog"
```

### Abstract router

```TS
@AbstractRouter
abstract class AbstractEntity {
  @Get('/:id/')
  public getById() {

  }

  @Post('/')
  public create() {

  };
}

@BaseUrl('/students/')
class Student extends AbstractEntity {
  @Body({ name: 'string*' })
  public create() {

  }
}

@BaseUrl('/teachers/')
class Teacher extends AbstractEntity {
  @Body({ name: 'string*', discipline: 'string*' })
  public create() {

  }
}
```

```YAML
---
  swagger: "2.0"
  info:
    version: "0.0.1"
    title: "swapi"
    description: ""
    license:
      name: "MIT"
    contact:
      name: "A.Kanaki"
  host: "host"
  basePath: "/"
  schemes:
    - "https"
  produces:
    - "application/json"
  consumes:
    - "application/json"
  paths:
    /students/:
      post:
        description: ""
        operationId: "studentCreate"
        produces:
          - "application/json"
        responses:
          201:
            description: "OK"
            schema:
              type: "string"
        parameters:
          -
            name: "studentCreateBody"
            in: "body"
            schema:
              type: "object"
              properties:
                name:
                  type: "string"
              required:
                - "name"
    /students/${id}/:
      get:
        description: ""
        operationId: "studentGetById"
        produces:
          - "application/json"
        responses:
          200:
            description: "OK"
            schema:
              type: "string"
        parameters:
          -
            name: "id"
            in: "path"
            required: true
            type: "string"
    /teachers/:
      post:
        description: ""
        operationId: "teacherCreate"
        produces:
          - "application/json"
        responses:
          201:
            description: "OK"
            schema:
              type: "string"
        parameters:
          -
            name: "teacherCreateBody"
            in: "body"
            schema:
              type: "object"
              properties:
                name:
                  type: "string"
                discipline:
                  type: "string"
              required:
                - "name"
                - "discipline"
    /teachers/${id}/:
      get:
        description: ""
        operationId: "teacherGetById"
        produces:
          - "application/json"
        responses:
          200:
            description: "OK"
            schema:
              type: "string"
        parameters:
          -
            name: "id"
            in: "path"
            required: true
            type: "string"
  definitions: {}
```

## Integration with package.json

swapi is integrated with `package.json`. This means that some of `package.json` will be used in swagger declaration. Here is the scheme of fields which are used:

```JSON
{
  "name": "string",
  "version": "string",
  "description": "string",
  "license": "string",
  "author": "string",
  "swapi": {
    "host": "string",
    "basePath": "string",
    "schemes": "Array<string>",
    "consumes": "Array<string>",
    "produces": "Array<string>",
  },
}
```

Example of valid `package.json` you may find in this repo. Here is part of it:

```JSON
{
  "name": "swapi",
  "version": "0.0.1",
  "description": "",
  "author": "A.Kanaki",
  "license": "MIT",
  "swapi": {
    "host": "host",
    "basePath": "/",
    "schemes": [
      "https"
    ],
    "consumes": [
      "application/json"
    ],
    "produces": [
      "application/json"
    ]
  }
}
```
