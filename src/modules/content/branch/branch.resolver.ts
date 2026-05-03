import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { BranchService } from './branch.service';
import { BranchModel } from './models/branch.model';
import { CreateBranchInput, UpdateBranchInput } from './inputs/branch.input';
import { Authorization } from '../../../shared/decorators/authorization.decorator';
import { Role } from '../../../../prisma/generated/prisma/enums';

@Resolver('Branch')
export class BranchResolver {
  constructor(private readonly branchService: BranchService) {}

  @Query(() => [BranchModel], { name: 'getBranches' })
  getBranches() {
    return this.branchService.findAllActive();
  }

  @Query(() => BranchModel, { name: 'getBranch' })
  getBranch(@Args('id') id: string) {
    return this.branchService.findOne(id);
  }

  // ─── ADMIN ────────────────────────────────────────────────────────────────

  @Authorization(Role.ADMIN, Role.MANAGER)
  @Query(() => [BranchModel], { name: 'adminGetBranches' })
  adminGetBranches() {
    return this.branchService.findAll();
  }

  @Authorization(Role.ADMIN, Role.MANAGER)
  @Mutation(() => BranchModel, { name: 'adminCreateBranch' })
  adminCreateBranch(@Args('data') input: CreateBranchInput) {
    return this.branchService.create(input);
  }

  @Authorization(Role.ADMIN, Role.MANAGER)
  @Mutation(() => BranchModel, { name: 'adminUpdateBranch' })
  adminUpdateBranch(
    @Args('id') id: string,
    @Args('data') input: UpdateBranchInput,
  ) {
    return this.branchService.update(id, input);
  }

  @Authorization(Role.ADMIN, Role.MANAGER)
  @Mutation(() => Boolean, { name: 'adminDeleteBranch' })
  adminDeleteBranch(@Args('id') id: string) {
    return this.branchService.remove(id);
  }
}
