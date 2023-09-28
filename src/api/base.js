import axios from 'axios'


const request = axios.create({
    withCredentials: false,
    baseURL: process.env.REACT_APP_API_URL,
    headers: {
        Authorization: process.env.publicKey
    }
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
