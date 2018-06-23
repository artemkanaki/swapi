import { Get, BaseUrl, generateSwaggerYaml, AbstractRouter, Post, Body } from '../src';
import { NodeStorage } from '../src/storage';
describe('abstract routes', () => {
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

  it('should contain own routes and abstract routes (student)', () => {
    const storageInstance = NodeStorage.getInstance();

    const studentsNode = storageInstance.findNodeByName(Student.name);
    const studentsCreateEndpoint = storageInstance.findEndpointByName(Student.name, 'create');

    expect(studentsNode.endpoints.length).toEqual(2);
    expect(studentsCreateEndpoint).toBeTruthy();
    expect(studentsCreateEndpoint.name).toEqual('create');
    expect(studentsCreateEndpoint.method).toEqual('post');
    expect(studentsCreateEndpoint.path).toEqual('/');
    expect(studentsCreateEndpoint.body.length).toEqual(1);
    expect(studentsCreateEndpoint.body[0].name).toEqual('name');
    expect(studentsCreateEndpoint.body[0].required).toBeTruthy();
    expect(studentsCreateEndpoint.body[0].type).toEqual('string');
  })

  it('should contain own routes and abstract routes (teacher)', () => {
    const storageInstance = NodeStorage.getInstance();

    const teachersNode = storageInstance.findNodeByName(Teacher.name);
    const teachersCreateEndpoint = storageInstance.findEndpointByName(Teacher.name, 'create');
    
    expect(teachersNode.endpoints.length).toEqual(2);
    expect(teachersCreateEndpoint).toBeTruthy();
    expect(teachersCreateEndpoint.name).toEqual('create');
    expect(teachersCreateEndpoint.method).toEqual('post');
    expect(teachersCreateEndpoint.path).toEqual('/');
    expect(teachersCreateEndpoint.body.length).toEqual(2);
  })
});
