import React, { useEffect, useState } from "react";
import CheckTable from "../default/components/CheckTable";
import { useRecoilState, useRecoilValue } from "recoil";
import { lendingTermsAtom } from "../../../store/index";
import SpinnerLoader from "components/spinner";
import { LoansObj, lendingTerms } from "types/lending";

function LendingTerms() {
  const [lendingTermsState, setLendingTermsState] =useRecoilState(lendingTermsAtom);
  const [data, setData] = useState<lendingTerms[]>([]);

  useEffect(() => {
    setData(lendingTermsState);
  } , [lendingTermsState]);
  

  return (
    <>
      {data.length <= 0 ? (
        <div className="absolute h-screen w-full">
          <SpinnerLoader />
        </div>
      ) : (
      
        <div className="space-y-6">
        <div className="mt-3">
          <CheckTable tableData={data.filter(loan => loan.status === "live")} name={"Currently Active Lending Terms"} />
        </div>
        <div >
          <CheckTable tableData={data.filter(loan => loan.status != "live")} name={"Depreciated Lending Terms"} />
        </div>
        </div>
      )}
    </>
  );
}

export default LendingTerms;
