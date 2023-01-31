import axios from 'axios';
import { getArgvs } from './options';
import { graphEndpoints } from './constants'

interface timeComparableEvent {
    logIndex:number
    blockNumber:number
}
const sortByTime = (a: timeComparableEvent,b: timeComparableEvent): number => {
    if(a.blockNumber === b.blockNumber) {
        return a.logIndex - b.logIndex
    }
    return a.blockNumber - b.blockNumber
}
export async function getGatewaysets(): Promise<any[]> {
    let eventResult = []
    let currentResult = []
    let skip = 0
    do {
        const requestPara =
            `query EventQuery {
                gatewaySets(first: 100, orderBy: id, skip: ${skip}) {
                    id 
                    l1Token 
                    gateway
                    blockNumber
                    }   
                }`
        const scanResult = await axios.post(graphEndpoints[getArgvs().l2NetworkID], {query: requestPara});
        currentResult = scanResult.data.data.gatewaySets;
        //get logIndex only
        for(let i = 0; i < currentResult.length; i++) {
            currentResult[i].tx = currentResult[i].id.substring(0,66)
            currentResult[i].logIndex = Number(currentResult[i].id.substring(67))
            currentResult[i].blockNumber = Number(currentResult[i].blockNumber)
        }
        eventResult.push(...currentResult)
        skip += 100
    }while(currentResult.length == 100)
    eventResult.sort(sortByTime)
    return eventResult
}