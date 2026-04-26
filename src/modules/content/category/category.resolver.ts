import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CategoryService } from './category.service';
import { CategoryModel } from './models/category.model';
import { CreateCategoryInput } from './inputs/create-category.input';
import { UpdateCategoryInput } from './inputs/update-category.input';
import { Authorization } from '../../../shared/decorators/authorization.decorator';
import { Role } from '../../../../prisma/generated/prisma/enums';

@Resolver()
export class CategoryResolver {
  constructor(private readonly categoryService: CategoryService) {}

  @Query(() => [CategoryModel], { name: 'findAllCategories' })
  async findAll() {
    return this.categoryService.findAll();
  }

  @Query(() => CategoryModel, { name: 'findCategoryById' })
  async findOne(@Args('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @Query(() => CategoryModel, { name: 'findCategoryBySlug' })
  async findBySlug(@Args('slug') slug: string) {
    return this.categoryService.findBySlug(slug);
  }

  @Authorization(Role.ADMIN, Role.MANAGER)
  @Mutation(() => CategoryModel, { name: 'createCategory' })
  async create(@Args('data') input: CreateCategoryInput) {
    return this.categoryService.create(input);
  }

  @Authorization(Role.ADMIN, Role.MANAGER)
  @Mutation(() => CategoryModel, { name: 'updateCategory' })
  async update(
    @Args('id') id: string,
    @Args('data') input: UpdateCategoryInput,
  ) {
    return this.categoryService.update(id, input);
  }

  @Authorization(Role.ADMIN, Role.MANAGER)
  @Mutation(() => Boolean, { name: 'removeCategory' })
  async remove(@Args('id') id: string) {
    return this.categoryService.remove(id);
  }
}
