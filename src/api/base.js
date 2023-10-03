import axios from 'axios'

const apiUrl = 'https://api.staging.ecg.la-tribu.xyz/api/'

const request = axios.create({
    withCredentials: false,
    baseURL: apiUrl
})




// request.interceptors.response
//     .use(
//         (response) => {
//             // localStorage.setItem('last_renewed_token', moment().toISOString())
//             return response.data
//         },
//         (error) => {
//             localStorage.removeItem('last_renewed_token')
//             if (error.response && error.response.data && error.response.data.errorCode === 'invalid-csrf-token') {
//                 post('users/logout').then(() => {
//                     location.reload()
//                 }).catch(() => {
//                     location.reload()
//                 })
//             }
//             return Promise.reject(error.response)
//         })

export const get = (url, params) => request.get(url, { params })
export const post = (url, body, config) => request.post(url, body, config)
