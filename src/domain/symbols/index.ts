export const Symbols = {
  LOGIN_USECASES_PROXY: Symbol.for('LoginUseCasesProxy'),
  LOGOUT_USECASES_PROXY: Symbol.for('LogoutUseCasesProxy'),
  REGISTER_USECASES_PROXY: Symbol.for('RegisterUseCasesProxy'),
  IS_AUTHENTICATED_USECASES_PROXY: Symbol.for('IsAuthenticatedUseCasesProxy'),
  GET_USER_BY_EMAIL_USECASES_PROXY: Symbol.for('GetUserByEmailUseCasesProxy'),

  CREATE_TRANSACTION_USECASES_PROXY: Symbol.for(
    'CreateTransactionUseCasesProxy',
  ),
  READ_TRANSACTION_USECASES_PROXY: Symbol.for('ReadTransactionUseCasesProxy'),
  LIST_TRANSACTIONS_USECASES_PROXY: Symbol.for('ListTransactionsUseCasesProxy'),
  UPDATE_TRANSACTION_USECASES_PROXY: Symbol.for(
    'UpdateTransactionUseCasesProxy',
  ),
  DELETE_TRANSACTION_USECASES_PROXY: Symbol.for(
    'DeleteTransactionUseCasesProxy',
  ),
};
