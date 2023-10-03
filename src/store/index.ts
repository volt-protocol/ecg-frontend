import api from "api";
import { AxiosResponse } from "axios";
import { useEffect } from "react";
import { RecoilRoot, atom, useRecoilState } from "recoil";
import { LendingTerms, lendingTerms } from "types/lending";

export const lendingTermsAtom = atom({
  key: "lendingTermsAtom",
  default: [],
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

  return {
    setLendingTerms,
    lendingTermsState,
  };
}
