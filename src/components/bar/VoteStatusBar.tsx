import clsx from 'clsx';

export default function VoteStatusBar({ width, height, votes }: { width: number; height: number; votes: BigInt[] }) {
  const totalVotes = votes.reduce((acc, vote) => acc + Number(vote), 0);
  const againstVotes = Math.ceil((Number(votes[0]) / totalVotes) * 100);
  const forVotes = Math.ceil((Number(votes[1]) / totalVotes) * 100);
  const abstainVotes = Math.max(0, 100 - againstVotes - forVotes);

  return (
    <div
      style={{ width: `${width - 1}px`, height: `${height}px`, borderRadius: `${height}px` }}
      className={`flex h-8 overflow-hidden`}
    >
      <div style={{ width: `${(forVotes / 100) * width}px` }} className={clsx(`w-1/3  bg-green-400`)}></div>
      <div style={{ width: `${(abstainVotes / 100) * width}px` }} className={clsx(`w-1/3  bg-gray-400`)}></div>
      <div style={{ width: `${(againstVotes / 100) * width}px` }} className={clsx(`w-1/3  bg-red-400`)}></div>
    </div>
  );
}
