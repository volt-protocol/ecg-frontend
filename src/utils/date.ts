import moment from 'moment';

export const fromNow = (timestamp: number) => {
    return moment(timestamp).fromNow();
}