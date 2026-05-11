import {
  Args,
  Float,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { ProductService } from './product.service';
import { ProductListModel, ProductModel } from './models/product.model';
import { RostaSyncStatusModel } from './models/rosta-sync.model';
import {
  CreateVariantInput,
  ProductVariantModel,
  UpdateVariantInput,
} from './models/variant.model';
import { CreateProductInput } from './inputs/create-product.input';
import { UpdateProductInput } from './inputs/update-product.input';
import { FilterProductInput } from './inputs/filter-product.input';
import { Authorization } from '../../../shared/decorators/authorization.decorator';
import { Role } from '../../../../prisma/generated/prisma/enums';
import { RostaSyncService } from './rosta-sync.service';

@Resolver(() => ProductModel)
export class ProductResolver {
  constructor(
    private readonly productService: ProductService,
    private readonly rostaSyncService: RostaSyncService,
  ) {}

  @Query(() => ProductListModel, { name: 'findAllProducts' })
  async findAll(
    @Args('filter', { nullable: true }) filter: FilterProductInput,
  ) {
    return this.productService.findAll(filter ?? {});
  }

  @Authorization(Role.ADMIN, Role.MANAGER)
  @Query(() => ProductListModel, { name: 'findAllProductsAdmin' })
  async findAllAdmin(
    @Args('filter', { nullable: true }) filter: FilterProductInput,
  ) {
    return this.productService.findAllAdmin(filter ?? {});
  }

  @Query(() => ProductModel, { name: 'findProductById' })
  async findOne(@Args('id') id: string) {
    return this.productService.findOne(id);
  }

  @Authorization(Role.ADMIN, Role.MANAGER)
  @Mutation(() => ProductModel, { name: 'createDraftProduct' })
  async createDraft() {
    return this.productService.createDraft();
  }

  @Authorization(Role.ADMIN, Role.MANAGER)
  @Mutation(() => ProductModel, { name: 'createProduct' })
  async create(@Args('data') input: CreateProductInput) {
    return this.productService.create(input);
  }

  @Authorization(Role.ADMIN, Role.MANAGER)
  @Mutation(() => ProductModel, { name: 'updateProduct' })
  async update(
    @Args('id') id: string,
    @Args('data') input: UpdateProductInput,
  ) {
    return this.productService.update(id, input);
  }

  @Authorization(Role.ADMIN)
  @Mutation(() => Boolean, { name: 'removeProduct' })
  async remove(@Args('id') id: string) {
    return this.productService.remove(id);
  }

  @Authorization(Role.ADMIN, Role.MANAGER)
  @Mutation(() => ProductModel, { name: 'toggleProductPublish' })
  async togglePublish(@Args('id') id: string) {
    return this.productService.togglePublish(id);
  }

  @Authorization(Role.ADMIN)
  @Mutation(() => Boolean, { name: 'adminSyncRostaProducts' })
  async adminSyncRostaProducts() {
    await this.rostaSyncService.syncAll();
    return true;
  }

  @Authorization(Role.ADMIN)
  @Query(() => RostaSyncStatusModel, { name: 'getRostaSyncStatus' })
  async getRostaSyncStatus() {
    return this.rostaSyncService.getSyncStatus();
  }

  @Authorization(Role.ADMIN)
  @Mutation(() => Boolean, { name: 'adminCancelRostaSync' })
  async adminCancelRostaSync() {
    this.rostaSyncService.cancelSync();
    return true;
  }

  // ─── VARIANTS ─────────────────────────────────────────────────────────────

  @Query(() => [ProductVariantModel], { name: 'getProductVariants' })
  getVariants(@Args('productId') productId: string) {
    return this.productService.getVariants(productId);
  }

  @Authorization(Role.ADMIN, Role.MANAGER)
  @Mutation(() => ProductVariantModel, { name: 'createVariant' })
  createVariant(
    @Args('productId') productId: string,
    @Args('data') input: CreateVariantInput,
  ) {
    return this.productService.createVariant(productId, input);
  }

  @Authorization(Role.ADMIN, Role.MANAGER)
  @Mutation(() => ProductVariantModel, { name: 'updateVariant' })
  updateVariant(
    @Args('variantId') variantId: string,
    @Args('data') input: UpdateVariantInput,
  ) {
    return this.productService.updateVariant(variantId, input);
  }

  @Authorization(Role.ADMIN, Role.MANAGER)
  @Mutation(() => Boolean, { name: 'deleteVariant' })
  deleteVariant(@Args('variantId') variantId: string) {
    return this.productService.deleteVariant(variantId);
  }

  @ResolveField('discountedPrice', () => Float, { nullable: true })
  discountedPrice(@Parent() product: ProductModel): number | null {
    if (!product.price || !product.discountPercent) return null;
    const discounted = product.price * (1 - product.discountPercent / 100);
    return Math.round(discounted * 100) / 100;
  }
}
