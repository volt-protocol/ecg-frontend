import { post, get } from './base'

export default {
    getCurrentLendingTerms : (body) => get('views/lendingterms', body),
    getActiveLoans: (contractAddress) => get(`loans/term/${contractAddress}`),
    getUserActiveLoans: (contractAddress, userAddress) => get(`loans/term/${contractAddress}/${userAddress}`),
}