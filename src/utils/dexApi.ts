import { pendleConfig } from 'config';
import { HttpGet, HttpPost } from './HttpHelper';

export async function getDexRouterData(
  dex: string,
  fromToken: string,
  toToken: string,
  amountIn: bigint,
  slippageTolerance: number,
  sender: string,
  recipient: string
): Promise<{
  amountOut: bigint;
  amountInUsd: number;
  amountOutUsd: number;
  routerAddress: string;
  routerData: string;
  routerGas: number;
}> {
  if (dex === 'kyber') {
    const urlGet = `https://aggregator-api.kyberswap.com/arbitrum/api/v1/routes?tokenIn=${fromToken}&tokenOut=${toToken}&amountIn=${amountIn.toString()}&excludedSources=balancer-v1,balancer-v2-composable-stable,balancer-v2-stable,balancer-v2-weighted`;
    const dataGet = await HttpGet<any>(urlGet, {
      headers: {
        'x-client-id': 'EthereumCreditGuild'
      }
    });
    const urlPost = `https://aggregator-api.kyberswap.com/arbitrum/api/v1/route/build`;
    const dataPost = await HttpPost<any>(
      urlPost,
      {
        routeSummary: dataGet.data.routeSummary,
        slippageTolerance: slippageTolerance * 10_000, // 0.005 -> 50 (0.5%)
        sender: sender,
        recipient: recipient
      },
      {
        headers: {
          'x-client-id': 'EthereumCreditGuild'
        }
      }
    );
    return {
      amountOut: BigInt(Math.floor(dataPost.data.amountOut)),
      amountInUsd: Number(dataPost.data.amountInUsd),
      amountOutUsd: Number(dataPost.data.amountOutUsd),
      routerAddress: dataPost.data.routerAddress,
      routerData: dataPost.data.data,
      routerGas: Number(dataPost.data.gas)
    };
  }
  if (dex === 'pendle') {
    let _pendleConfig = pendleConfig[toToken.toLowerCase()];
    let toTokenIsPt = false;
    let fromTokenIsPt = false;
    let urlGet;
    const slippage = 0.005; // 0.5% max slippage
    if (_pendleConfig) {
      toTokenIsPt = true;
      urlGet = `https://api-v2.pendle.finance/sdk/api/v1/swapExactTokenForPt?chainId=${
        _pendleConfig.chainId
      }&receiverAddr=${recipient}&marketAddr=${
        _pendleConfig.market
      }&amountTokenIn=${amountIn.toString()}&tokenInAddr=${fromToken}&syTokenOutAddr=${
        _pendleConfig.syTokenOut
      }&slippage=${slippage}&excludedSources=balancer-v1,balancer-v2-composable-stable,balancer-v2-stable,balancer-v2-weighted`;
    } else {
      _pendleConfig = pendleConfig[fromToken.toLowerCase()];
      if (_pendleConfig) {
        fromTokenIsPt = true;
        urlGet = `https://api-v2.pendle.finance/sdk/api/v1/swapExactPtForToken?chainId=${
          _pendleConfig.chainId
        }&receiverAddr=${recipient}&marketAddr=${
          _pendleConfig.market
        }&amountPtIn=${amountIn.toString()}&tokenOutAddr=${toToken}&syTokenOutAddr=${
          _pendleConfig.syTokenOut
        }&slippage=${slippage}&excludedSources=balancer-v1,balancer-v2-composable-stable,balancer-v2-stable,balancer-v2-weighted`;
      } else {
        throw 'Unsupported pendle fromToken[' + fromToken + '] or toToken[' + toToken + ']';
      }
    }
    const dataGet = await HttpGet<any>(urlGet);
    if (toTokenIsPt) {
      return {
        amountOut: BigInt(dataGet.data.amountPtOut),
        amountInUsd: 1,
        amountOutUsd: 1 + dataGet.data.priceImpact,
        routerAddress: dataGet.transaction.to,
        routerData: dataGet.transaction.data,
        routerGas: 2_000_000
      };
    } else {
      return {
        amountOut: BigInt(dataGet.data.amountTokenOut),
        amountInUsd: 1,
        amountOutUsd: 1 + dataGet.data.priceImpact,
        routerAddress: dataGet.transaction.to,
        routerData: dataGet.transaction.data,
        routerGas: 2_000_000
      };
    }
  }

  throw 'Unsupported dex [' + dex + ']';
}
