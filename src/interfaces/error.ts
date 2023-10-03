export interface ContractFunctionExecutionError {
    name: string;
    message: string;
    address?: string;
    function?: string;
    args?: string;
    sender?: string;
    docs?: string;
    version?: string;
    stack?: string;
  }

  export function isContractFunctionExecutionError(error: unknown): error is ContractFunctionExecutionError {
    return (error as ContractFunctionExecutionError).name === 'ContractFunctionExecutionError';
  }