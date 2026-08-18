import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';

import { Symbols } from '@domain/symbols';

import { JwtAuthGuard } from '@infrastructure/common/guards/jwtAuth.guard';
import { UseCaseProxy } from '@infrastructure/usecases-proxy/usecases-proxy';

import { CreateTransactionUsecase } from '@usecases/transactions/create-transaction.usecases';
import { DeleteTransactionUseCases } from '@usecases/transactions/delete-transaction.usecases';
import { GetTransactionByIdUseCases } from '@usecases/transactions/get-transaction-by-id.usecases';
import { ListTransactionsUseCases } from '@usecases/transactions/list-transactions.usecases';
import { UpdateTransactionUseCases } from '@usecases/transactions/update-transaction.usecases';

import {
  CreateTransactionDto,
  ListTransactionsQueryDto,
  UpdateTransactionDto,
} from './validators/transactions-dto.class';

interface RequestWithUser extends ExpressRequest {
  user: { id: string; email: string };
}

@Controller({ version: '1', path: 'transactions' })
@ApiTags('transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiResponse({ status: 401, description: 'No authorization token was found' })
@ApiResponse({ status: 404, description: 'Transaction not found' })
export class TransactionsController {
  constructor(
    @Inject(Symbols.CREATE_TRANSACTION_USECASES_PROXY)
    private readonly createProxy: UseCaseProxy<CreateTransactionUsecase>,
    @Inject(Symbols.READ_TRANSACTION_USECASES_PROXY)
    private readonly readProxy: UseCaseProxy<GetTransactionByIdUseCases>,
    @Inject(Symbols.LIST_TRANSACTIONS_USECASES_PROXY)
    private readonly listProxy: UseCaseProxy<ListTransactionsUseCases>,
    @Inject(Symbols.UPDATE_TRANSACTION_USECASES_PROXY)
    private readonly updateProxy: UseCaseProxy<UpdateTransactionUseCases>,
    @Inject(Symbols.DELETE_TRANSACTION_USECASES_PROXY)
    private readonly deleteProxy: UseCaseProxy<DeleteTransactionUseCases>,
  ) {}

  @Post()
  @ApiOperation({ description: 'Create a transaction for the current user' })
  create(@Req() request: RequestWithUser, @Body() body: CreateTransactionDto) {
    // The owner is taken from the verified token, never from the request body,
    // so a client cannot create a transaction against another user's account.
    return this.createProxy.getInstance().execute({
      ...body,
      amount: body.amount as never,
      status: body.status ?? 'pending',
      userId: request.user.id,
    });
  }

  @Get()
  @ApiOperation({ description: 'List the current user’s transactions' })
  list(
    @Req() request: RequestWithUser,
    @Query() query: ListTransactionsQueryDto,
  ) {
    return this.listProxy.getInstance().execute(request.user.id, query);
  }

  @Get(':id')
  @ApiOperation({ description: 'Read one of the current user’s transactions' })
  read(
    @Req() request: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.readProxy.getInstance().execute(id, request.user.id);
  }

  @Patch(':id')
  @ApiOperation({
    description: 'Update one of the current user’s transactions',
  })
  update(
    @Req() request: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateTransactionDto,
  ) {
    return this.updateProxy
      .getInstance()
      .execute(id, request.user.id, body as never);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    description: 'Delete one of the current user’s transactions',
  })
  @ApiResponse({ status: 204, description: 'Transaction deleted' })
  remove(
    @Req() request: RequestWithUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.deleteProxy.getInstance().execute(id, request.user.id);
  }
}
