type RowObj = {
	name: [string, string];
	progress: string;
	quantity: number;
	date: string;
	interestRate?: string;
};

const tableDataCheck: RowObj[] = [
	{
		name: [ 'Horizon UI PRO', "src/assets/img/layout/logoWhite.png" ],
		quantity: 2458,
		progress: '17.5%',
		date: '12 Jan 2021',
		interestRate: '2.5%',
	},
	{
		name: [ 'Horizon UI Free', "src/assets/img/layout/logoWhite.png" ],
		quantity: 1485,
		progress: '10.8%',
		date: '21 Feb 2021',
		interestRate: '2.5%',
	},
	{
		name: [ 'Weekly Update', "src/assets/img/layout/logoWhite.png" ],
		quantity: 1024,
		progress: '21.3%',
		date: '13 Mar 2021',
		interestRate: '2.5%',
	},
	{
		name: [ 'Venus 3D Asset', "src/assets/img/layout/logoWhite.png" ],
		quantity: 858,
		progress: '31.5%',
		date: '24 Jan 2021',
		interestRate: '2.5%',
	},
	{
		name: [ 'Marketplace', "src/assets/img/layout/logoWhite.png" ],
		quantity: 258,
		progress: '12.2%',
		date: '24 Oct 2022',
		interestRate: '2.5%',
	}
];

export default tableDataCheck;
