import { post, get } from './base'

export default {
    checkLogged: () => post('users/checkLogged'),
    login: (body) => post('users/login', body),
    logout: () => post('users/logout'),
    checkData: (body) => post('users/checkData', body),
    updateToken: (body) => post('users/updateToken', body),
    getRanking: (body) => post('users/getRanking', body),
    getPackages: () => get('users/getPackageAvailable'),
    csv: (body) => post('users/csv', body),
    buyCoins: (body) => post('users/transactionCoins', body),
    getCurrentTournament : ()=> get('tournament/getCurrent'),
    swape: (body) => post('users/swap', body),
    changeUsername: (body) => post('/users/changeUsername', body),
    mintNFT: (body) => post('/users/mintNFT', body),
    savePackageTransaction: (body) => post('/users/savePackageTransaction', body),
    dataUser: (body) => post('/users/dataUser', body),
    pastTournament: () => get('/tournament/getPastTournament'),
}
