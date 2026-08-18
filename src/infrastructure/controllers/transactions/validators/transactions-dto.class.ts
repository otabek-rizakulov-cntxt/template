import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import { TRANSACTION_ORDER_FIELDS } from '@domain/repositories/transaction-repository.interface';

export class CreateTransactionDto {
  @ApiProperty({ required: true, example: 125.5 })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiProperty({ required: true, enum: TransactionType })
  @IsNotEmpty()
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiPropertyOptional({ enum: TransactionStatus })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiProperty({ required: true, format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  categoryId: string;
}

export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {}

/**
 * Pagination and ordering are validated here rather than trusted from the query
 * string. `orderBy` is restricted to a known allowlist because it reaches the
 * database as a column name.
 */
export class ListTransactionsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageNumber: number = 1;

  @ApiPropertyOptional({ default: 25, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  itemsPerPage: number = 25;

  @ApiPropertyOptional({ enum: TRANSACTION_ORDER_FIELDS, default: 'date' })
  @IsOptional()
  @IsIn(TRANSACTION_ORDER_FIELDS)
  orderBy: (typeof TRANSACTION_ORDER_FIELDS)[number] = 'date';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  orderDirection: 'asc' | 'desc' = 'desc';
}
