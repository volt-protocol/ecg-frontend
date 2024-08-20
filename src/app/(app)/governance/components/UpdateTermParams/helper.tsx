import Propose from './components/Propose';
import Vote from './components/Vote';
import Veto from './components/Veto';

export interface OnboardNewTermTabs {
  key: string;
  title: string;
  content: React.ReactNode;
}

export const onboardNewTermTabs: OnboardNewTermTabs[] = [
  {
    key: 'propose',
    title: 'Propose',
    content: <Propose />
  },
  {
    key: 'vote',
    title: 'Vote',
    content: <Vote />
  },
  {
    key: 'veto',
    title: 'Veto',
    content: <Veto />
  }
];
