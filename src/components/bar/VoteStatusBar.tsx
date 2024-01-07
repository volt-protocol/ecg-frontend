import clsx from "clsx"

export default function VoteStatusBar({
  width,
  height,
  votes,
}: {
  width: number
  height: number
  votes: BigInt[]
}) {
  const totalVotes = votes.reduce((acc, vote) => acc + Number(vote), 0)
  const againstVotes = Math.round((Number(votes[0]) / totalVotes) * 100)
  const forVotes = Math.round((Number(votes[1]) / totalVotes) * 100)
  const abstainVotes = Math.round((Number(votes[2]) / totalVotes) * 100)

  return (
    <div style={{ width: `${width}px`, height: `${height}px` }} className={`flex h-8`}>
      <div
        style={{ width: `${forVotes/100*width}px` }}
        className={clsx(
          forVotes == 100 ? "rounded-md" : "rounded-l-md",
          `w-1/3  bg-green-400`
        )}
      ></div>
      <div
        style={{ width: `${abstainVotes/100*width}px` }}
        className={clsx(
          abstainVotes == 100 && "rounded-md",
          `w-1/3  bg-gray-400`
        )}
      ></div>
      <div
        style={{ width: `${againstVotes/100*width}px` }}
        className={clsx(
          againstVotes == 100 ? "rounded-md" : "rounded-r-md",
          `w-1/3  bg-red-400`
        )}
      ></div>
    </div>
  )
}
