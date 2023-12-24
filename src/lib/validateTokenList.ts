import Ajv from 'ajv';
import betterAjvErrors from 'better-ajv-errors';
import addFormats from 'ajv-formats';
import { schema, TokenList } from '@uniswap/token-lists';
import { ArbTokenList } from './types';

export const tokenListIsValid = (tokenList: ArbTokenList | TokenList) => {
  const ajv = new Ajv();
  addFormats(ajv);
  const { tokens, ...properties } = schema.properties;
  const schemaWithoutTokensProperty = {
    ...schema,
    properties: {
      ...properties,
      tokens: {
        ...tokens,
        maxItems: 15_000,
      },
    },
  };
  const validate = ajv.compile(schemaWithoutTokensProperty);

  const res = validate(tokenList);

  if (validate.errors) {
    const output = betterAjvErrors(
      schemaWithoutTokensProperty,
      tokenList,
      validate.errors,
      {
        indent: 2,
      },
    );
    console.log(output);
  }

  return res;
};

export const validateTokenListWithErrorThrowing = (
  tokenList: ArbTokenList | TokenList,
) => {
  try {
    const valid = tokenListIsValid(tokenList);
    if (valid) return true;
    else
      throw new Error(
        'Data does not conform to token list schema; not sure why',
      );
  } catch (e) {
    console.log('Invalid token list:');
    throw e;
  }
};
