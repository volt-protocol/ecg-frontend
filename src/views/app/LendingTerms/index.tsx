import React, { useEffect, useState } from "react";
import CheckTable from "../default/components/CheckTable";
import { useRecoilState, useRecoilValue } from "recoil";
import { lendingTermsAtom } from "../../../store/index";
import SpinnerLoader from "components/spinner";

function LendingTerms() {
  const [lendingTermsState, setLendingTermsState] =useRecoilState(lendingTermsAtom);
  const [data, setData] = useState([]);

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
        <div className="mt-3">
          <CheckTable tableData={data} />
        </div>
      )}
    </>
  );
}

export default LendingTerms;
