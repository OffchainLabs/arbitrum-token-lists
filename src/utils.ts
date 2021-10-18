import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { schema } from '@uniswap/token-lists'


const getTokenListFromJSON = ()=>{
    
    const ajv = new Ajv()

    addFormats(ajv)
    const validate = ajv.compile(schema)
}
