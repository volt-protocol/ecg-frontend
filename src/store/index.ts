import api from "api";
import { AxiosResponse } from "axios";
import { useEffect } from "react";
import { RecoilRoot, RecoilState, atom, useRecoilState } from "recoil";
import { LendingTerms, LoansObj, lendingTerms, userData } from "types/lending";
import { useAccount } from "wagmi";

export const lendingTermsAtom: RecoilState<lendingTerms[]> = atom({
  key: "lendingTermsAtom",
  default: [],
});
export const userDataAtom  = atom({
  key: "userData",
  default: {address:"", isConnected:false},
});

export default function Store() {
  const [lendingTermsState, setLendingTermsState] = useRecoilState<
    LendingTerms | any
  >(lendingTermsAtom);
  
  


  useEffect(() => {
    setLendingTerms();
  }, []);
 

  async function setLendingTerms() {
    const lendingTerms: AxiosResponse<LendingTerms, any> =
      await api.lendingTerms.getCurrentLendingTerms();
    setLendingTermsState(lendingTerms.data.lendingTerms);
  }

  async function setUserData() {
    const {address, isConnected} = useAccount();
    
  }

  return {
    setLendingTerms,
    lendingTermsState,
    setUserData,
    
    
  };
}
