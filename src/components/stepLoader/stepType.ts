export type Step = {
  name: string;
  status: string;
  description?: any[];
  action?: Function;
  skip?: Function;
};
