import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { coin } from '@cosmjs/stargate'

import { TokenInfo } from '../../queries/usePoolsListQuery'

type RegistryArgs = {
  swapDirection: 'tokenAtoTokenB' | 'tokenBtoTokenA'
  tokenAmount: number
  price: number
  slippage: number
  senderAddress: string
  swapAddress: string
  tokenA: TokenInfo
  tokenB: TokenInfo
  client: SigningCosmWasmClient
}

type RegistryRequestsArgs = {
  client: SigningCosmWasmClient
  senderAddress: string
}

type RegistryCancelRequestsArgs = {
  client: SigningCosmWasmClient
  senderAddress: string
  id: number
}

function toEncodedBinary(obj: any): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64')
}

function toDecodedBinary(obj: any): any {
  return JSON.parse(Buffer.from(obj, 'base64').toString())
}

const testnet = {
  networkInfo: {
    url: 'https://rpc.uni.juno.deuslabs.fi',
    chainId: 'uni-3',
  },

  addresses: {
    wallet1: 'juno16g2rahf5846rxzp3fwlswy08fz8ccuwk03k57y',
    wallet2: 'juno16e3t7td2wu0wmggnxa3xnyu5whljyed69ptvkp',
    wallet3: 'juno1yq0azfkky8aqq4kvzdawrs7tm3rmpl8xs6vcx2',
  },

  mnemonicKeys: {
    wallet1:
      'clip hire initial neck maid actor venue client foam budget lock catalog sweet steak waste crater broccoli pipe steak sister coyote moment obvious choose',
    wallet2:
      'audit crawl employ lunch figure cigar chapter wrestle endless process unique angry',
    wallet3:
      'ability pitch abuse game alter broccoli lottery warm baby tonight misery lumber',
  },

  contracts: {
    auto: 'juno187axv4l5putlwq9amsaxdzffagkt3u8dfkkl7xcw0hu942snpwqqquanzq', // codeId: 781
    registryStake:
      'juno1s0taqr3y0la6mt7c7dss7aed75q7s93vdhdk372j4se6vd8jewws4hm7ws', // codeId: 782

    fundsRouter:
      'juno1fv2msgmgt5tcz3yqyzm6nemzzlmjw3quweepen734gulzua29g5sth8akj', // codeId: 783
    timeConditions:
      'juno1uce0lzkyzv2n0qu42sqwhgajm4j0ta8tnwqvx6ha207tpnpqvlas0grwjj', // codeId: 784
    testCounter:
      'juno1l4k5endm8e6chd7nypy60whezeff35ds9twmp0druzxtj7q9jd3qvgl2rg', // codeId: 785

    tcw: 'juno132twgl4fud7kv6xq5ztma4f8zdfh5mqsf7rjp2zs03j5kmhpk74qhgqddh', // "TCW": Test cw20 token   codeId: 787
    tcwUjunoSwap:
      'juno1y6ymzsmntrurapq72uefnxy88vaj6yztrjpgdz768xhz7reazq5sl9ch7m', // codeId: 788
    wrapperJunoSwap:
      'juno1as3udnqavujqerd8cmec62kyfwzvaet85g8tsjtjdy4qqkjyetmq7rk7xv', // codeId: 789
  },
} as const

export const registry = async ({
  tokenA,
  tokenB,
  swapDirection,
  swapAddress,
  senderAddress,
  price,
  tokenAmount,
  client,
}: RegistryArgs) => {
  const minToken = Math.floor(price)

  const swapMessage = toEncodedBinary({
    swap: {
      input_token: swapDirection === 'tokenAtoTokenB' ? 'Token1' : 'Token2',
      input_amount: `${tokenAmount}`,
      min_output: `${minToken}`,
      expiration: undefined,
    },
  })

  const input_token = tokenA.native
    ? {
        native_token: {
          denom: tokenA.denom,
        },
      }
    : {
        token: {
          contract_addr: tokenA.token_address,
        },
      }
  const output_token = tokenB.native
    ? {
        native_token: {
          denom: tokenB.denom,
        },
      }
    : {
        token: {
          contract_addr: tokenB.token_address,
        },
      }

  const wrapperSwapMsg = toEncodedBinary({
    swap: {
      user: senderAddress,
      contract_addr: swapAddress,
      swap_msg: swapMessage,
      input_token,
      output_token,
      input_amount: `${tokenAmount}`,
      min_output: `${minToken}`,
      recipient_exist: false,
    },
  })

  const fee = tokenA.native
    ? tokenA.denom === 'ujunox'
      ? [coin(parseInt(`${tokenAmount}`) + parseInt('1000'), 'ujunox')]
      : [coin(1000, 'ujunox'), coin(parseInt(`${tokenAmount}`), tokenA.denom)]
    : [coin(1000, 'ujunox')]

  if (!tokenA.native) {
    await client.execute(
      senderAddress,
      tokenA.token_address,
      {
        increase_allowance: {
          spender: testnet.contracts.registryStake,
          amount: `${tokenAmount}`,
          expires: undefined,
        },
      },
      'auto',
      undefined
    )
  }

  await client.execute(
    senderAddress,
    testnet.contracts.registryStake,
    {
      create_request: {
        target: testnet.contracts.wrapperJunoSwap,
        msg: wrapperSwapMsg,
        input_asset: {
          info: input_token,
          amount: `${tokenAmount}`,
        },
      },
    },
    'auto',
    undefined,
    fee
  )

  const requestsQuery: any = await client.queryContractSmart(
    testnet.contracts.registryStake,
    {
      requests: {},
    }
  )
  const requestId = requestsQuery.requests[0].id
  return requestId
}

export const registryRequests = async ({
  client,
  senderAddress,
}: RegistryRequestsArgs) => {
  const requestQueries: any = await client.queryContractSmart(
    testnet.contracts.registryStake,
    {
      requests: {},
    }
  )

  const response = requestQueries.requests
    .map((query) => {
      const { id, request } = query
      const msg = toDecodedBinary(request.msg)
      const { swap } = msg
      return {
        address: request.user,
        id: id,
        type: swap.min_output === '0' ? 'stop-loss' : 'limit-order',
        status: request.status,
        createdAt: request.created_at,
        inputToken: {
          denom: swap.input_token.native_token
            ? swap.input_token.native_token.denom
            : swap.input_token.token.contract_addr,
          amount: swap.input_amount,
        },
        outputToken: {
          denom: swap.output_token.native_token
            ? swap.output_token.native_token.denom
            : swap.output_token.token.contract_addr,
          amount: swap.min_output,
        },
      }
    })
    .filter((query) => query.address === senderAddress)

  return response
}

export const registryCancelRequests = async ({
  client,
  senderAddress,
  id,
}: RegistryCancelRequestsArgs) => {
  await client.execute(
    senderAddress,
    testnet.contracts.registryStake,
    {
      cancel_request: {
        id,
      },
    },
    'auto',
    undefined
  )
}
