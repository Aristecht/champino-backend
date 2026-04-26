import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateBranchInput, UpdateBranchInput } from './inputs/branch.input';

@Injectable()
export class BranchService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAllActive() {
    return this.prismaService.branch.findMany({
      where: { isActive: true },
      orderBy: { city: 'asc' },
    });
  }

  async findAll() {
    return this.prismaService.branch.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const branch = await this.prismaService.branch.findUnique({
      where: { id },
    });
    if (!branch) throw new NotFoundException('Филиал не найден');
    return branch;
  }

  async create(input: CreateBranchInput) {
    return this.prismaService.branch.create({ data: input });
  }

  async update(id: string, input: UpdateBranchInput) {
    await this.findOne(id);
    return this.prismaService.branch.update({ where: { id }, data: input });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prismaService.branch.delete({ where: { id } });
    return true;
  }
}
