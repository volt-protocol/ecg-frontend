import { post, get } from './base'

export default {
    getCurrentLendingTerms : (body) => get('views/lendingterms', body),
}