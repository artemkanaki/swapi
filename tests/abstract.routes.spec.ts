import { Get, BaseUrl, generateSwaggerYaml, AbstractRouter, Post, Body } from '../src';
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

  it('realization should contain abstract routes', () => {
    const api = generateSwaggerYaml();
    
    expect(typeof api).toEqual('string');
  })
});
