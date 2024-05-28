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

  throw 'Unsupported dex [' + router + ']';
}
